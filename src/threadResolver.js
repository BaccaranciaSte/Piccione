/**
 * threadResolver.js
 * Fetches the target thread and automatically unarchives it if needed.
 *
 * Include una cache con TTL per evitare di chiamare l'API Discord
 * per lo stesso thread ad ogni messaggio in arrivo.
 * La cache viene invalidata automaticamente se il thread risulta archiviato
 * (perché richiede un re-fetch dopo l'unarchive).
 */

/** Durata della cache per thread risolti (ms). Default: 5 minuti. */
const THREAD_CACHE_TTL = 5 * 60 * 1_000;

/**
 * Cache dei thread già risolti: threadId → { thread, expiresAt }
 * @type {Map<string, { thread: import('discord.js').ThreadChannel, expiresAt: number }>}
 */
const threadCache = new Map();

/**
 * Risolve un thread Discord per ID.
 * - Usa una cache con TTL per evitare fetch API ripetuti.
 * - Se il thread è archiviato, lo riapre automaticamente e invalida la cache.
 * - Restituisce null (senza crashare) se il thread non è accessibile.
 *
 * @param {import('discord.js').Client} client
 * @param {string} threadId
 * @returns {Promise<import('discord.js').ThreadChannel | null>}
 */
async function resolveThread(client, threadId) {
  // ── 1. Controlla la cache ───────────────────────────────────────────────────
  const cached = threadCache.get(threadId);
  if (cached && Date.now() < cached.expiresAt) {
    // Anche se in cache, potrebbe essersi archiviato nel frattempo.
    // Lo controlliamo: archived è una proprietà locale aggiornata dal gateway.
    if (!cached.thread.archived) {
      return cached.thread;
    }
    // Se archiviato, invalidiamo e procediamo con il fetch + unarchive
    threadCache.delete(threadId);
  }

  // ── 2. Fetch del thread ───────────────────────────────────────────────────
  let thread;
  try {
    thread = await client.channels.fetch(threadId);
  } catch (err) {
    console.error(
      `❌ Thread ${threadId} non trovato o bot senza accesso:`,
      err.message
    );
    return null;
  }

  // ── 3. Verifica che sia effettivamente un thread ──────────────────────────
  if (!thread || !thread.isThread()) {
    console.error(
      `❌ Il canale ${threadId} non è un thread (tipo: ${thread?.type}). Controlla config.json.`
    );
    return null;
  }

  // ── 4. Riapertura automatica se archiviato ────────────────────────────────
  if (thread.archived) {
    console.log(`🔓 Thread ${threadId} archiviato — tentativo di riapertura...`);
    try {
      // setArchived(false) richiede il permesso MANAGE_THREADS
      await thread.setArchived(false);
      console.log(`✅ Thread ${threadId} riaperto con successo.`);
    } catch (err) {
      console.error(
        `❌ Impossibile riaprire il thread ${threadId} (manca MANAGE_THREADS?):`,
        err.message
      );
      // Restituiamo comunque il thread: l'invio potrebbe fallire,
      // ma lasciamo decidere al chiamante invece di perdere il messaggio silenziosamente.
    }
  }

  // ── 5. Salva in cache ─────────────────────────────────────────────────────
  threadCache.set(threadId, {
    thread,
    expiresAt: Date.now() + THREAD_CACHE_TTL
  });

  return thread;
}

module.exports = { resolveThread };
