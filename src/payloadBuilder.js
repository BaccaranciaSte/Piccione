/**
 * payloadBuilder.js
 * Constructs the MessageCreateOptions payload to forward to the target thread.
 *
 * Strategy per tipo di messaggio:
 *
 *  1. Solo embed(s) originali       → inoltrati direttamente (solo tipo 'rich')
 *  2. Solo testo                    → inoltrato come testo puro
 *  3. Solo media (immagini/video)   → inviati come file nativi Discord
 *  4. Testo + media                 → testo nel content + media come file nativi
 *  5. Testo + embed originali       → testo preposto + embed originali
 *  6. Testo + media + embed         → embed originali + media come file nativi
 *
 * Note: embed non-rich (link preview auto-Discord) vengono filtrati: non possono essere
 *       re-inoltrati via API e causerebbero errori 400.
 * Note: allegati con URL CDN scaduti (parametro ?ex= nella URL) vengono esclusi.
 * Note: si preferisce proxyURL (media.discordapp.net) a url (cdn.discordapp.com)
 *       perché più stabile e longevo, specialmente durante il catchup offline.
 * Note: il content viene troncato a MAX_CONTENT_LENGTH per rispettare il limite API Discord.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { sanitizeText } = require('./sanitizer');

const MAX_EMBEDS = 10;          // Limite hard Discord API per embed per messaggio
const MAX_FILES  = 10;          // Limite hard Discord API per allegati per messaggio
const MAX_CONTENT_LENGTH = 2000; // Limite hard Discord API per content (caratteri)
const TRUNCATION_SUFFIX = '\n…[troncato]';

/**
 * Estrae contenuti (testo, embed, allegati) dai messageSnapshots di un messaggio inoltrato
 * con la funzione nativa "Forward" di Discord, e li fonde con i dati propri del messaggio.
 *
 * Quando un utente usa "Inoltra" su Discord, il testo/embed/allegati reali finiscono in
 * message.messageSnapshots[].message anziché nei campi normali (content, embeds, attachments).
 * Senza questa estrazione il bot vedrebbe un messaggio vuoto.
 *
 * Nota: in discord.js i dati dello snapshot sono direttamente sull'oggetto snapshot
 * (content, embeds, attachments), NON in snapshot.message. La proprietà snapshot.message
 * esiste ma vale null perché channelId e guildId sono null (il messaggio sorgente è in
 * un canale/server non direttamente accessibile dal bot).
 *
 * @param {import('discord.js').Message} message
 * @returns {{ snapshotText: string, snapshotEmbeds: import('discord.js').Embed[], snapshotAttachments: import('discord.js').Attachment[] }}
 */
function extractSnapshotData(message) {
  let snapshotText = '';
  const snapshotEmbeds = [];
  const snapshotAttachments = [];

  if (!message.messageSnapshots || message.messageSnapshots.size === 0) {
    return { snapshotText, snapshotEmbeds, snapshotAttachments };
  }

  for (const [, snapshot] of message.messageSnapshots) {
    // In discord.js i dati dello snapshot sono direttamente sull'oggetto snapshot
    // (non in snapshot.message come ci si aspetterebbe).
    // snapshot.message esiste come proprietà ma vale null perché channelId/guildId
    // sono null (il messaggio sorgente è in un altro server/canale non accessibile).
    // I campi reali (content, embeds, attachments) sono accessibili direttamente.
    const snap = snapshot;

    // Testo dallo snapshot
    if (snap.content) {
      snapshotText += (snapshotText ? '\n' : '') + snap.content;
    }

    // Embed dallo snapshot (già oggetti discord.js Embed)
    if (snap.embeds?.length > 0) {
      snapshotEmbeds.push(...snap.embeds);
    }

    // Allegati dallo snapshot
    if (snap.attachments?.size > 0) {
      snapshotAttachments.push(...snap.attachments.values());
    }
  }

  return { snapshotText, snapshotEmbeds, snapshotAttachments };
}

/**
 * Builds a discord.js MessageCreateOptions object from the original message.
 *
 * @param {import('discord.js').Message} message
 * @param {{ roleId?: string }} mapping
 * @returns {import('discord.js').MessageCreateOptions}
 */
function buildForwardPayload(message, mapping) {
  const roleMention = mapping?.roleId ? `<@&${mapping.roleId}>` : null;

  // Timestamp Discord dinamico: mostra l'orario nel fuso locale di ogni utente.
  // Usa il timestamp del messaggio sorgente, così i messaggi recuperati offline
  // mostrano l'orario di pubblicazione reale e non quello di inoltro del bot.
  const sourceTimestamp = message.messageSnapshots?.size > 0
    ? Math.floor([...message.messageSnapshots.values()][0].createdTimestamp / 1000)
    : Math.floor(message.createdTimestamp / 1000);
  const timeTag = `🕐 News del <t:${sourceTimestamp}:f>`;

  // ── Estrai dati dai messageSnapshots (messaggi inoltrati con Forward di Discord) ──
  const { snapshotText, snapshotEmbeds, snapshotAttachments } = extractSnapshotData(message);

  // Unisci il testo del messaggio con quello dello snapshot
  const ownText = sanitizeText(message.content);
  const combinedText = [ownText, sanitizeText(snapshotText)].filter(Boolean).join('\n');
  const originalText = combinedText;

  // Unisci gli embed del messaggio con quelli dello snapshot
  // Solo embed di tipo 'rich' (creati da bot/webhook).
  // I link preview auto-generati da Discord (tipo 'link', 'image', 'gifv', ecc.) non possono
  // essere re-inoltrati via API e causerebbero un errore 400 — li filtriamo.
  const allEmbeds = [...message.embeds, ...snapshotEmbeds];
  const originalEmbeds = allEmbeds
    .filter(embed => !embed.data.type || embed.data.type === 'rich')
    .slice(0, MAX_EMBEDS)
    .map(embed => {
      const newEmbed = EmbedBuilder.from(embed);
      if (newEmbed.data.title) newEmbed.setTitle(sanitizeText(newEmbed.data.title));
      if (newEmbed.data.description) newEmbed.setDescription(sanitizeText(newEmbed.data.description));
      if (newEmbed.data.fields) {
        newEmbed.data.fields.forEach(field => {
          field.name = sanitizeText(field.name);
          field.value = sanitizeText(field.value);
        });
      }
      return newEmbed;
    });

  // Unisci gli allegati del messaggio con quelli dello snapshot
  const attachments = [...message.attachments.values(), ...snapshotAttachments];

  // Filtra gli allegati con URL scaduti (Discord usa CDN URL firmati temporaneamente)
  const validAttachments = attachments.filter(a => !isUrlExpired(getAttachmentUrl(a)));
  const expiredCount = attachments.length - validAttachments.length;
  if (expiredCount > 0) {
    console.warn(`⚠️  ${expiredCount} allegato/i con URL CDN scaduto ignorato/i (messaggio ${message.id}).`);
  }

  // Separa media (immagini + video) da altri allegati (PDF, audio, ecc.)
  const mediaAttachments = validAttachments.filter(a => isMedia(a)).slice(0, MAX_FILES);
  const otherAttachments = validAttachments.filter(a => !isMedia(a));

  // ── Guardia: se non c'è nulla di reale da inviare, restituisci payload vuoto ──
  // Evita messaggi "fantasma" con solo il role mention quando il messaggio sorgente
  // (es. un forward nativo Discord) non ha contenuto valido: embed non-rich filtrati,
  // allegati CDN scaduti, o snapshot senza testo né media.
  const hasContent = originalText.length > 0;
  const hasEmbeds  = originalEmbeds.length > 0;
  const hasMedia   = mediaAttachments.length > 0;
  const hasOther   = otherAttachments.length > 0;

  if (!hasContent && !hasEmbeds && !hasMedia && !hasOther) {
    console.log(`⏭️  buildForwardPayload: nessun contenuto valido (embed non-rich, allegati scaduti o snapshot vuoto). Messaggio scartato.`);
    return {};   // handleMessage controlla !content && !embeds && !files → skip silenzioso
  }

  const payload = {};

  // ── Caso 1: solo embed originali, nessun testo né allegati ──────────────
  // Caso tipico dei webhook RSS/annunci: inoltriamo gli embed così come sono.
  if (!originalText && originalEmbeds.length > 0 && attachments.length === 0) {
    payload.content = roleMention ? `${roleMention}  ${timeTag}` : timeTag;
    payload.embeds = originalEmbeds;
    return finalize(payload, roleMention);
  }

  // ── Caso 2: solo testo, nessun embed né allegato ─────────────────────────
  if (originalText && originalEmbeds.length === 0 && attachments.length === 0) {
    payload.content = roleMention
      ? `${roleMention}  ${timeTag}\n${originalText}`
      : `${timeTag}\n${originalText}`;
    return finalize(payload, roleMention);
  }

  // ── Caso 3 & 4: media (con o senza testo), nessun embed originale ─────────
  // Inviamo i media come allegati nativi per preservare qualità e proporzioni originali.
  if (originalEmbeds.length === 0 && mediaAttachments.length > 0) {
    const otherLinks = otherAttachments.map(f => getAttachmentUrl(f)).join('\n');

    const contentParts = [];
    contentParts.push(roleMention ? `${roleMention}  ${timeTag}` : timeTag);
    if (originalText) contentParts.push(originalText);
    if (otherLinks) contentParts.push(otherLinks);

    if (contentParts.length > 0) payload.content = contentParts.join('\n');
    payload.files = mediaAttachments.map(a => ({ attachment: getAttachmentUrl(a), name: a.name }));
    return finalize(payload, roleMention);
  }

  // ── Caso 5: testo + embed originali, nessun media allegato ───────────────
  if (originalText && originalEmbeds.length > 0 && mediaAttachments.length === 0) {
    const contentParts = [];
    contentParts.push(roleMention ? `${roleMention}  ${timeTag}` : timeTag);
    contentParts.push(originalText);

    payload.content = contentParts.join('\n');
    payload.embeds = originalEmbeds;
    return finalize(payload, roleMention);
  }

  // ── Caso 6: combinazione di embed originali + media ──────────────────────
  // Inviamo gli embed originali ed alleghiamo i media come files nativi.
  // Gli allegati non-media (PDF, audio, ecc.) vengono aggiunti come link nel content,
  // coerentemente con quanto fanno i casi 3 & 4.
  if (originalEmbeds.length > 0 && mediaAttachments.length > 0) {
    const otherLinks = otherAttachments.map(f => getAttachmentUrl(f)).join('\n');

    const contentParts = [];
    contentParts.push(roleMention ? `${roleMention}  ${timeTag}` : timeTag);
    if (originalText) contentParts.push(originalText);
    if (otherLinks) contentParts.push(otherLinks);

    payload.content = contentParts.join('\n');
    payload.embeds = originalEmbeds;
    payload.files = mediaAttachments.map(a => ({ attachment: getAttachmentUrl(a), name: a.name }));
    return finalize(payload, roleMention);
  }

  // ── Fallback: solo allegati non-media (PDF, audio, documenti, ecc.) ───────
  const contentParts = [];
  contentParts.push(roleMention ? `${roleMention}  ${timeTag}` : timeTag);
  if (originalText) contentParts.push(originalText);
  contentParts.push(...validAttachments.map(a => getAttachmentUrl(a)));

  payload.content = contentParts.join('\n');
  return finalize(payload, roleMention);
}

/**
 * Finalizza il payload: tronca il content se necessario e aggiunge il bottone traduci.
 * @param {import('discord.js').MessageCreateOptions} payload
 * @param {string|null} roleMention
 * @returns {import('discord.js').MessageCreateOptions}
 */
function finalize(payload, roleMention) {
  truncateContent(payload);
  return addTranslateButton(payload, roleMention);
}

/**
 * Tronca payload.content a MAX_CONTENT_LENGTH caratteri per rispettare il limite API Discord.
 * Aggiunge un suffisso "…[troncato]" per indicare che il contenuto è stato tagliato.
 * @param {import('discord.js').MessageCreateOptions} payload
 */
function truncateContent(payload) {
  if (!payload.content || payload.content.length <= MAX_CONTENT_LENGTH) return;

  const originalLength = payload.content.length;
  const maxLen = MAX_CONTENT_LENGTH - TRUNCATION_SUFFIX.length;
  payload.content = payload.content.substring(0, maxLen) + TRUNCATION_SUFFIX;
  console.warn(`⚠️  Content troncato a ${MAX_CONTENT_LENGTH} caratteri (originale: ${originalLength} char).`);
}

function addTranslateButton(payload, roleMention) {
  // Mostra il bottone "Traduci" se c'è testo traducibile nel content o negli embed.
  // Escludiamo dal conteggio il roleMention (non traducibile) per non mostrare
  // il bottone su messaggi che contengono solo il ping al ruolo.
  const contentWithoutMention = roleMention
    ? (payload.content ?? '').replace(roleMention, '').trim()
    : (payload.content ?? '').trim();

  const contentHasText = contentWithoutMention.length > 0;
  const embedHasText = payload.embeds?.some(e => e.data.title || e.data.description);

  if (contentHasText || embedHasText) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('translate')
        .setLabel('Traduci in 🇮🇹')
        .setStyle(ButtonStyle.Secondary)
    );
    payload.components = [row];
  } else {
    payload.components = [];
  }
  return payload;
}

/**
 * Restituisce l'URL più stabile per un allegato.
 * Preferisce proxyURL (media.discordapp.net, più longevo) rispetto a url (cdn.discordapp.com).
 * @param {import('discord.js').Attachment} attachment
 * @returns {string}
 */
function getAttachmentUrl(attachment) {
  return attachment.proxyURL || attachment.url;
}

/**
 * Determina se un allegato è un'immagine visualizzabile inline.
 * @param {import('discord.js').Attachment} attachment
 * @returns {boolean}
 */
function isImage(attachment) {
  if (attachment.contentType) {
    return attachment.contentType.startsWith('image/');
  }
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(attachment.name ?? '');
}

/**
 * Determina se un allegato è un video riproducibile inline.
 * @param {import('discord.js').Attachment} attachment
 * @returns {boolean}
 */
function isVideo(attachment) {
  if (attachment.contentType) {
    return attachment.contentType.startsWith('video/');
  }
  return /\.(mp4|webm|mov|avi|mkv)$/i.test(attachment.name ?? '');
}

/**
 * Determina se un allegato è un media (immagine o video) da inviare come file nativo.
 * @param {import('discord.js').Attachment} attachment
 * @returns {boolean}
 */
function isMedia(attachment) {
  return isImage(attachment) || isVideo(attachment);
}

/**
 * Controlla se un URL di allegato Discord è scaduto.
 * Discord usa URL CDN firmati temporaneamente con parametro ?ex=HEX (Unix timestamp in hex).
 * @param {string} url
 * @returns {boolean}
 */
function isUrlExpired(url) {
  try {
    const u = new URL(url);
    const exHex = u.searchParams.get('ex');
    if (!exHex) return false; // URL senza scadenza esplicita (formato vecchio)
    const exUnix = parseInt(exHex, 16);
    return Math.floor(Date.now() / 1000) > exUnix;
  } catch {
    return false; // In caso di URL malformato, non escludiamo per sicurezza
  }
}

module.exports = { buildForwardPayload };
