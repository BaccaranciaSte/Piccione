/**
 * state.js
 * Gestisce il salvataggio su file JSON dell'ultimo messaggio inoltrato per ogni canale.
 *
 * Il salvataggio su disco è debounced: le modifiche si accumulano in memoria
 * e vengono scritte su disco al massimo ogni DEBOUNCE_MS millisecondi.
 * Questo evita di bloccare l'event loop con writeFileSync ad ogni singolo messaggio
 * (critico durante il catchup offline di 100+ messaggi).
 *
 * Espone flushState() per forzare il salvataggio (usato nel graceful shutdown).
 */
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'state.json');

/** Intervallo minimo tra due scritture su disco (ms). */
const DEBOUNCE_MS = 2_000;

// state = { "channelId1": "lastMessageId1", ... }
let stateCache = null;

/** Flag: ci sono modifiche non ancora scritte su disco. */
let isDirty = false;

/** Timer del debounce attivo (null = nessun flush schedulato). */
let debounceTimer = null;

function loadState() {
  if (stateCache) return stateCache;
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      stateCache = JSON.parse(data);
    } else {
      stateCache = {};
    }
  } catch (err) {
    console.error('❌ Errore durante la lettura di state.json:', err);
    stateCache = {};
  }
  return stateCache;
}

/**
 * Aggiorna lo stato in memoria e schedula un flush su disco debounced.
 * Non blocca l'event loop — la scrittura effettiva avviene dopo DEBOUNCE_MS.
 *
 * @param {string} channelId
 * @param {string} messageId
 */
function saveState(channelId, messageId) {
  const state = loadState();
  state[channelId] = messageId;
  isDirty = true;

  // Schedula il flush solo se non c'è già un timer attivo
  if (!debounceTimer) {
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      writeToDisk();
    }, DEBOUNCE_MS);
    // Permette al processo di uscire anche se il timer è attivo
    debounceTimer.unref();
  }
}

/**
 * Forza il salvataggio immediato su disco (sincrono).
 * Da chiamare prima di process.exit() nel graceful shutdown.
 */
function flushState() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (isDirty) {
    writeToDisk();
  }
}

/**
 * Scrittura effettiva su disco. Chiamata dal debounce timer o da flushState().
 */
function writeToDisk() {
  if (!stateCache) return;
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(stateCache, null, 2), 'utf8');
    isDirty = false;
  } catch (err) {
    console.error('❌ Errore durante il salvataggio di state.json:', err);
  }
}

function getLastMessageId(channelId) {
  const state = loadState();
  return state[channelId] || null;
}

module.exports = {
  saveState,
  getLastMessageId,
  flushState
};
