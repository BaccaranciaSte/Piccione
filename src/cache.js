/**
 * cache.js
 * In-memory caches for anti-duplicate tracking and forwarded message mapping.
 *
 * Come funziona:
 *  - processedMessages: Set di ID messaggi già inoltrati. Anti-duplicato.
 *  - forwardedMessagesMap: Mappa originalId → { threadId, sentMessageId }.
 *    Persistita su disco in forwarded.json per sopravvivere ai riavvii.
 *    Senza persistenza, edit/delete post-riavvio venivano silenziosamente ignorati.
 *  - pendingMessages: Set di ID attualmente in elaborazione (anti race-condition).
 *
 * Il Set viene potato periodicamente per evitare crescita illimitata.
 * Il salvataggio della forwardedMessagesMap è debounced (max 1 write ogni 5 secondi).
 */

const fs = require('fs');
const path = require('path');

/** Numero massimo di ID messaggi da tenere in memoria. */
const MAX_CACHE_SIZE = 5_000;

/** Ogni quanto (ms) potare la cache. Default: ogni 30 minuti. */
const PRUNE_INTERVAL = 30 * 60 * 1_000;

/** Intervallo minimo tra due scritture di forwarded.json su disco (ms). */
const FORWARD_DEBOUNCE_MS = 5_000;

/** Massimo di entry nella forwardedMessagesMap (le più vecchie vengono potate). */
const MAX_FORWARDED_SIZE = 10_000;

const FORWARDED_FILE = path.join(__dirname, '..', 'forwarded.json');

// ─── processedMessages ────────────────────────────────────────────────────────
/**
 * Il Set condiviso importato da tutti i moduli per evitare duplicati.
 * @type {Set<string>}
 */
const processedMessages = new Set();

// ─── forwardedMessagesMap ─────────────────────────────────────────────────────
/**
 * Mappa condivisa per tenere traccia dei messaggi inoltrati: originalMessageId → { threadId, sentMessageId }
 * Utilizzata per propagare modifiche (edit) e cancellazioni (delete) in tempo reale.
 * Persistita su disco per sopravvivere ai riavvii.
 * @type {Map<string, { threadId: string, sentMessageId: string }>}
 */
const forwardedMessagesMap = loadForwardedMap();

/** Flag: ci sono modifiche alla mappa non ancora scritte su disco. */
let forwardedDirty = false;

/** Timer del debounce per il salvataggio della mappa. */
let forwardedDebounceTimer = null;

/**
 * Carica la mappa da forwarded.json all'avvio.
 * @returns {Map<string, { threadId: string, sentMessageId: string }>}
 */
function loadForwardedMap() {
  try {
    if (fs.existsSync(FORWARDED_FILE)) {
      const data = fs.readFileSync(FORWARDED_FILE, 'utf8');
      const parsed = JSON.parse(data);
      const map = new Map(Object.entries(parsed));
      console.log(`📂 Caricati ${map.size} riferimenti inoltrati da forwarded.json`);
      return map;
    }
  } catch (err) {
    console.error('❌ Errore durante la lettura di forwarded.json:', err);
  }
  return new Map();
}

/**
 * Salva la mappa su disco (sincrono). Chiamata dal debounce o dal flush.
 */
function writeForwardedToDisk() {
  try {
    const obj = Object.fromEntries(forwardedMessagesMap);
    fs.writeFileSync(FORWARDED_FILE, JSON.stringify(obj, null, 2), 'utf8');
    forwardedDirty = false;
  } catch (err) {
    console.error('❌ Errore durante il salvataggio di forwarded.json:', err);
  }
}

/**
 * Schedula un salvataggio debounced della forwardedMessagesMap.
 */
function scheduleForwardedSave() {
  forwardedDirty = true;
  if (!forwardedDebounceTimer) {
    forwardedDebounceTimer = setTimeout(() => {
      forwardedDebounceTimer = null;
      writeForwardedToDisk();
    }, FORWARD_DEBOUNCE_MS);
    forwardedDebounceTimer.unref();
  }
}

/**
 * Forza il salvataggio immediato su disco (sincrono).
 * Da chiamare prima di process.exit() nel graceful shutdown.
 */
function flushForwardedMap() {
  if (forwardedDebounceTimer) {
    clearTimeout(forwardedDebounceTimer);
    forwardedDebounceTimer = null;
  }
  if (forwardedDirty) {
    writeForwardedToDisk();
  }
}

// ── Proxy della Map originale per intercettare set/delete e triggerare il salvataggio ──
const _originalSet = forwardedMessagesMap.set.bind(forwardedMessagesMap);
const _originalDelete = forwardedMessagesMap.delete.bind(forwardedMessagesMap);

forwardedMessagesMap.set = function (key, value) {
  _originalSet(key, value);
  scheduleForwardedSave();
  return this; // Coerente con il contratto Map nativa (chainable)
};

forwardedMessagesMap.delete = function (key) {
  const result = _originalDelete(key);
  if (result) scheduleForwardedSave();
  return result;
};

// ─── pendingMessages ──────────────────────────────────────────────────────────
/**
 * Set condiviso per i messaggi attualmente in elaborazione (tra il fetch e il markAsProcessed).
 * Previene race condition tra catchUpMissedMessages e messageCreate simultanei.
 * @type {Set<string>}
 */
const pendingMessages = new Set();

// ─── Potatura periodica ───────────────────────────────────────────────────────
/**
 * Pota la cache se supera MAX_CACHE_SIZE.
 * Rimuove le entry più vecchie (i Set e le Map preservano l'ordine di inserimento).
 */
function pruneCache() {
  // Pota processedMessages
  if (processedMessages.size > MAX_CACHE_SIZE) {
    const excess = processedMessages.size - MAX_CACHE_SIZE;
    const iterator = processedMessages.values();
    for (let i = 0; i < excess; i++) {
      processedMessages.delete(iterator.next().value);
    }
    console.log(`🧹 Cache processedMessages potata — rimossi ${excess} ID. Dimensione: ${processedMessages.size}`);
  }

  // Pota forwardedMessagesMap
  if (forwardedMessagesMap.size > MAX_FORWARDED_SIZE) {
    const excess = forwardedMessagesMap.size - MAX_FORWARDED_SIZE;
    const iterator = forwardedMessagesMap.keys();
    for (let i = 0; i < excess; i++) {
      // Usa _originalDelete per evitare di triggerare il salvataggio per ogni singola entry
      _originalDelete(iterator.next().value);
    }
    scheduleForwardedSave(); // Un solo salvataggio alla fine
    console.log(`🧹 Cache forwardedMessagesMap potata — rimossi ${excess} ID. Dimensione: ${forwardedMessagesMap.size}`);
  }
}

// Avvia la potatura periodica
const _pruneTimer = setInterval(pruneCache, PRUNE_INTERVAL);
_pruneTimer.unref(); // Permette al processo di uscire durante il graceful shutdown

module.exports = { processedMessages, forwardedMessagesMap, pendingMessages, flushForwardedMap };
