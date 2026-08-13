/**
 * keywordFilter.js
 * Utility per estrarre il testo completo da un messaggio Discord e verificare
 * la presenza di parole o frasi chiave ignorate (keyword/phrase filtering).
 */

const config = require('../config.json');

/**
 * Estrae tutto il testo significativo da un messaggio Discord (content, embed, snapshot).
 * @param {import('discord.js').Message} message
 * @returns {string}
 */
function extractAllMessageText(message) {
  if (!message) return '';
  const parts = [];

  if (message.content) parts.push(message.content);

  if (Array.isArray(message.embeds)) {
    for (const embed of message.embeds) {
      if (!embed) continue;
      if (embed.title) parts.push(embed.title);
      if (embed.description) parts.push(embed.description);
      if (embed.footer?.text) parts.push(embed.footer.text);
      if (embed.author?.name) parts.push(embed.author.name);
      if (Array.isArray(embed.fields)) {
        for (const f of embed.fields) {
          if (f.name) parts.push(f.name);
          if (f.value) parts.push(f.value);
        }
      }
    }
  }

  if (message.messageSnapshots && message.messageSnapshots.size > 0) {
    for (const [, snap] of message.messageSnapshots) {
      if (!snap) continue;
      if (snap.content) parts.push(snap.content);
      if (Array.isArray(snap.embeds)) {
        for (const embed of snap.embeds) {
          if (!embed) continue;
          if (embed.title) parts.push(embed.title);
          if (embed.description) parts.push(embed.description);
          if (embed.footer?.text) parts.push(embed.footer.text);
          if (embed.author?.name) parts.push(embed.author.name);
          if (Array.isArray(embed.fields)) {
            for (const f of embed.fields) {
              if (f.name) parts.push(f.name);
              if (f.value) parts.push(f.value);
            }
          }
        }
      }
    }
  }

  return parts.join('\n');
}

/**
 * Verifica se un messaggio contiene parole o frasi chiave configurate come ignorate.
 * Cerca sia nelle impostazioni globali (config.ignoredKeywords) sia in quelle specifiche del mapping (mapping.ignoredKeywords).
 *
 * @param {import('discord.js').Message} message
 * @param {object} [mapping]
 * @param {object} [configOverride]
 * @returns {string|null} La keyword/frase che ha fatto scattare il filtro, oppure null
 */
function getIgnoredKeyword(message, mapping, configOverride) {
  if (!message) return null;

  const cfg = configOverride ?? config;
  const globalKeywords = Array.isArray(cfg?.ignoredKeywords) ? cfg.ignoredKeywords : [];
  const mappingKeywords = Array.isArray(mapping?.ignoredKeywords) ? mapping.ignoredKeywords : [];
  const keywords = [...globalKeywords, ...mappingKeywords];

  if (keywords.length === 0) return null;

  const fullText = extractAllMessageText(message).toLowerCase();
  if (!fullText) return null;

  for (const kw of keywords) {
    if (!kw || typeof kw !== 'string') continue;
    const cleanKw = kw.trim().toLowerCase();
    if (cleanKw && fullText.includes(cleanKw)) {
      return kw;
    }
  }

  return null;
}

module.exports = {
  extractAllMessageText,
  getIgnoredKeyword
};
