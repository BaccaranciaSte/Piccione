/**
 * expireHandler.js
 * Rilevamento ed eliminazione automatica di messaggi/alert decaduti (es. PokeMMO PVE alerts).
 */

/**
 * Controlla se un messaggio (o i suoi embed) rappresenta un alert scaduto/decaduto.
 * Rileva:
 * 1. Dicitura "Alert Expired" (case-insensitive) nel testo principale, negli embed o nei componenti.
 * 2. Formattazione sbarrata markdown (~~) nei campi dell'embed o nel testo del messaggio.
 *
 * @param {import('discord.js').Message} message - Il messaggio originale o modificato
 * @param {object} [mapping] - Il mapping di configurazione del canale
 * @returns {boolean} true se il messaggio è scaduto, false altrimenti
 */
function isExpiredMessage(message, mapping) {
  if (!message) return false;

  const deleteOnExpire = mapping?.deleteOnExpire ?? true;

  // 1. Controllo del testo principale del messaggio
  const content = message.content ?? '';
  if (/alert\s+expired/i.test(content)) return true;

  // 2. Controllo degli Embed
  if (Array.isArray(message.embeds) && message.embeds.length > 0) {
    for (const embed of message.embeds) {
      if (!embed) continue;

      const headerText = [
        embed.title ?? '',
        embed.description ?? '',
        embed.footer?.text ?? '',
        embed.author?.name ?? ''
      ].join(' ');

      if (/alert\s+expired/i.test(headerText)) return true;

      // Conta la presenza di formattazione sbarrata (~~)
      let strikethroughCount = (headerText.match(/~~/g) || []).length;

      if (Array.isArray(embed.fields)) {
        for (const field of embed.fields) {
          const fieldText = `${field.name ?? ''} ${field.value ?? ''}`;
          if (/alert\s+expired/i.test(fieldText)) return true;
          strikethroughCount += (fieldText.match(/~~/g) || []).length;
        }
      }

      // Se ci sono almeno 2 marcatori di sbarrato (~~) negli embed ed è un canale abilitato
      if (deleteOnExpire && strikethroughCount >= 2) {
        return true;
      }
    }
  }

  // 3. Controllo dei componenti interattivi (es. pulsanti con etichetta "Alert Expired")
  if (Array.isArray(message.components)) {
    for (const row of message.components) {
      if (!row || !Array.isArray(row.components)) continue;
      for (const comp of row.components) {
        if (comp.label && /alert\s+expired/i.test(comp.label)) {
          return true;
        }
      }
    }
  }

  return false;
}

const { getIgnoredKeyword } = require('./keywordFilter');

/**
 * Pulisce i messaggi già scaduti o che contengono keyword ignorate inviati dal bot all'interno di un thread specifico.
 * Utile per rimuovere la "sporcizia" residua già presente nella chat del thread.
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').ThreadChannel} thread
 * @param {number} [limit=50] - Numero di messaggi recenti da controllare
 * @param {object} [mapping] - Riferimento al mapping di configurazione
 */
async function cleanupExistingExpiredInThread(client, thread, limit = 50, mapping = null) {
  if (!thread || typeof thread.isThread !== 'function' || !thread.isThread()) return;

  try {
    const messages = await thread.messages.fetch({ limit }).catch(() => null);
    if (!messages || messages.size === 0) return;

    let deletedCount = 0;
    for (const msg of messages.values()) {
      // Pulisce solo i messaggi inviati dal bot stesso per evitare di cancellare messaggi degli utenti
      if (msg.author?.id !== client.user.id) continue;

      const isExpired = isExpiredMessage(msg, { deleteOnExpire: true });
      const matchedKeyword = getIgnoredKeyword(msg, mapping);

      if (isExpired || matchedKeyword) {
        await msg.delete().catch(err => {
          console.warn(`⚠️ Impossibile eliminare vecchio messaggio ${msg.id} nel thread ${thread.id}:`, err.message);
        });
        deletedCount++;
        // Piccola pausa tra le eliminazioni per evitare rate limit di Discord
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Pulizia completata nel thread ${thread.id}: rimossi ${deletedCount} messaggi scaduti/ignorati.`);
    }
  } catch (err) {
    console.error(`❌ Errore durante la pulizia dei vecchi messaggi nel thread ${thread.id}:`, err.message);
  }
}

module.exports = {
  isExpiredMessage,
  cleanupExistingExpiredInThread
};
