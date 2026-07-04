/**
 * sanitizer.js
 * Pulisce il testo rimuovendo ping inattesi e emoji custom non renderizzabili.
 */

/**
 * Pulisce una stringa di testo dai ping (utenti, ruoli, everyone/here) e dalle custom emoji.
 *
 * @param {string|null|undefined} text
 * @returns {string} Il testo ripulito
 */
function sanitizeText(text) {
  if (!text) return '';

  return text
    // Rimuove @everyone e @here
    .replace(/@(everyone|here)/g, '')
    // Rimuove i ping a utenti <@1234> o <@!1234>
    .replace(/<@!?\d+>/g, '')
    // Rimuove i ping a ruoli <@&1234>
    .replace(/<@&\d+>/g, '')
    // Rimuove i mention a canali <#1234>
    .replace(/<#\d+>/g, '')
    // Rimuove custom emojis <:nome:1234> e <a:nome:1234> (sia normali che animate)
    .replace(/<a?:\w+:\d+>/g, '')
    // Rimuove spazi multipli che si potrebbero essere formati
    .replace(/  +/g, ' ')
    // Toglie gli spazi agli estremi
    .trim();
}

module.exports = { sanitizeText };
