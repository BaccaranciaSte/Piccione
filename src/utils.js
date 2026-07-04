/**
 * utils.js
 * Funzioni di utilità condivise tra i moduli del bot.
 */

/**
 * Attende un certo numero di millisecondi.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { sleep };
