/**
 * messageHandler.js
 * Core logic for forwarding a message from a source channel to a target thread.
 */

const { processedMessages, forwardedMessagesMap } = require('./cache');
const { buildForwardPayload } = require('./payloadBuilder');
const { resolveThread } = require('./threadResolver');
const { saveState } = require('./state');
const { sleep } = require('./utils');
const config = require('../config.json');


// ─── Costanti ─────────────────────────────────────────────────────────────────
const MAX_RETRIES = 3;       // Tentativi aggiuntivi in caso di errore temporaneo
const RETRY_BASE_DELAY = 2000; // ms — raddoppia ad ogni retry (backoff esponenziale)

/**
 * Main entry point chiamato per ogni messaggio rilevante in arrivo.
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Message} message
 * @param {{ sourceChannelId: string, targetThreadId: string, roleId?: string, name?: string }} mapping
 * @param {object} [configOverride] - Riferimento al config in-memory (default: require locale)
 */
async function handleMessage(client, message, mapping, configOverride) {
  const cfg = configOverride ?? config;
  const { targetThreadId } = mapping;

  console.log(
    `📨 Nuovo messaggio in ${message.channelId} da ${
      message.webhookId
        ? `webhook (${message.author?.username ?? 'sconosciuto'})`
        : (message.author?.username ?? 'sconosciuto')
    } → invio al thread ${targetThreadId}`
  );

  // Segnala se il messaggio contiene snapshot (forward nativo Discord)
  if (message.messageSnapshots?.size > 0) {
    console.log(`   ↳ 📎 Messaggio inoltrato (forward) con ${message.messageSnapshots.size} snapshot — estrazione contenuti in corso...`);
  }

  // ── 1. Risolvi il thread di destinazione (gestisce anche quelli archiviati)
  const thread = await resolveThread(client, targetThreadId);
  if (!thread) return; // resolveThread ha già loggato l'errore

  // ── 2. Costruisci il payload ──────────────────────────────────────────────
  const payload = buildForwardPayload(message, mapping);

  // Se non c'è nulla da inviare, salta silenziosamente.
  // Marca comunque il messaggio come processato e aggiorna lo state,
  // così non verrà ricontrollato inutilmente ad ogni riavvio del bot.
  if (!payload.content && (!payload.embeds || payload.embeds.length === 0) && (!payload.files || payload.files.length === 0)) {
    console.log(`⚠️  Messaggio ${message.id} vuoto, nulla da inoltrare. Marcato come processato per evitare re-check.`);
    processedMessages.add(message.id);
    saveState(message.channelId, message.id);
    return;
  }

  // ── 3. Marca come processato PRIMA dell'invio (evita race condition)
  processedMessages.add(message.id);

  // ── 4. Invia con retry automatico ────────────────────────────────────────
  try {
    const sentMessage = await sendWithRetry(thread, payload, message.id);
    console.log(`✅ Messaggio ${message.id} inoltrato al thread ${targetThreadId}`);
    
    if (sentMessage) {
      forwardedMessagesMap.set(message.id, {
        threadId: thread.id,
        sentMessageId: sentMessage.id
      });

      // Aggiunge le reazioni preconfigurate (specifiche del mapping o globali)
      const emojisToReact = mapping.newsReactions || cfg.newsReactions;
      if (emojisToReact && Array.isArray(emojisToReact)) {
        for (const emoji of emojisToReact) {
          if (emoji && emoji.trim() !== '') {
            await sentMessage.react(emoji.trim()).catch(err => {
              console.error(`❌ Errore durante l'aggiunta della reazione ${emoji} al messaggio ${sentMessage.id}:`, err.message);
            });
          }
        }
      }
    }

    saveState(message.channelId, message.id);
    return sentMessage;
  } catch (err) {
    console.error(
      `❌ Invio fallito per il messaggio ${message.id} dopo ${MAX_RETRIES + 1} tentativi:`,
      err.message
    );
    // Rimuovi dalla cache: un retry manuale futuro potrà funzionare
    processedMessages.delete(message.id);
    forwardedMessagesMap.delete(message.id);
  }
}

/**
 * Invia un payload a un thread con retry esponenziale in caso di errore temporaneo.
 * Utile contro rate limit 429 o disconnessioni momentanee.
 *
 * @param {import('discord.js').ThreadChannel} thread
 * @param {import('discord.js').MessageCreateOptions} payload
 * @param {string} messageId - solo per logging
 * @returns {Promise<import('discord.js').Message>} Il messaggio inviato
 */
async function sendWithRetry(thread, payload, messageId) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await thread.send(payload);
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;

      // Non ritentare errori permanenti (client error 4xx, tranne 429 = rate limit)
      const status = err.status ?? err.httpStatus;
      if (status && status >= 400 && status < 500 && status !== 429) {
        console.error(
          `❌ Errore ${status} non recuperabile per messaggio ${messageId} — retry saltato. (${err.message})`
        );
        throw err;
      }

      if (isLast) throw err; // Rilancia al chiamante dopo l'ultimo tentativo

      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt); // 2s, 4s, 8s...
      console.warn(
        `⚠️  Tentativo ${attempt + 1}/${MAX_RETRIES + 1} fallito per messaggio ${messageId}. ` +
        `Nuovo tentativo tra ${delay / 1000}s... (${err.message})`
      );
      await sleep(delay);
    }
  }
}

module.exports = { handleMessage };
