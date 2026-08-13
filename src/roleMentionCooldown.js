/**
 * roleMentionCooldown.js
 * Traccia in memoria l'ultimo timestamp in cui è stato pingato un ruolo
 * per ogni canale sorgente, per evitare mention in raffica.
 *
 * Il cooldown è configurabile globalmente tramite `roleMentionCooldownMs` in config.json
 * e sovrascrivibile per singolo mapping con lo stesso campo nel mapping stesso.
 *
 * Valore di default: 5 minuti (300_000 ms).
 * Per disabilitare il cooldown su un mapping specifico, imposta `roleMentionCooldownMs: 0`.
 */

const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minuti

/** @type {Map<string, number>} channelId → timestamp ultima mention (ms) */
const lastMentionTime = new Map();

/**
 * Controlla se il cooldown del role mention è ancora attivo per il canale dato.
 *
 * @param {string} channelId - sourceChannelId del mapping
 * @param {{ roleMentionCooldownMs?: number }} mapping - mapping corrente
 * @param {{ roleMentionCooldownMs?: number }} cfg - config globale
 * @returns {boolean} true se il cooldown è ancora attivo (mention da sopprimere)
 */
function isRoleMentionOnCooldown(channelId, mapping, cfg) {
  const cooldown =
    mapping.roleMentionCooldownMs ??
    cfg.roleMentionCooldownMs ??
    DEFAULT_COOLDOWN_MS;

  if (cooldown <= 0) return false; // cooldown disabilitato

  const last = lastMentionTime.get(channelId);
  if (!last) return false; // mai pingato → non in cooldown

  return Date.now() - last < cooldown;
}

/**
 * Registra il momento in cui è stato inviato un role mention per il canale dato.
 *
 * @param {string} channelId
 */
function recordRoleMention(channelId) {
  lastMentionTime.set(channelId, Date.now());
}

module.exports = { isRoleMentionOnCooldown, recordRoleMention };
