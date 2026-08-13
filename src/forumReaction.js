/**
 * forumReaction.js
 * Gestione delle reazioni predefinite (pre-emoji / defaultReactionEmoji) dei canali Forum in Discord.
 */

const { ChannelType } = require('discord.js');

/**
 * Ottiene l'emoji di reazione predefinita dal canale Forum genitore di un thread.
 * @param {import('discord.js').ThreadChannel} thread
 * @returns {Promise<string|null>} ID dell'emoji (se personalizzata) o carattere unicode (se standard), oppure null.
 */
async function getForumDefaultEmoji(thread) {
  if (!thread || typeof thread.isThread !== 'function' || !thread.isThread()) return null;

  try {
    let parent = thread.parent;
    if (!parent && thread.parentId) {
      parent = await thread.client.channels.fetch(thread.parentId).catch(() => null);
    }

    if (!parent) return null;

    // Controlla se il canale genitore è un Forum o Media Channel e possiede una defaultReactionEmoji
    if (
      (parent.type === ChannelType.GuildForum || parent.type === ChannelType.GuildMedia) &&
      parent.defaultReactionEmoji
    ) {
      const { emojiId, emojiName } = parent.defaultReactionEmoji;
      return emojiId || emojiName || null;
    }
  } catch (err) {
    console.error(`❌ Errore recupero emoji predefinita forum per thread ${thread.id}:`, err.message);
  }

  return null;
}

/**
 * Fanno reagire il bot a un messaggio con una specifica emoji se non vi ha già reagito.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Message} message
 * @param {string} emoji - ID emoji custom o carattere unicode
 * @returns {Promise<boolean>} true se la reazione è stata aggiunta, false altrimenti
 */
async function reactIfNotReacted(client, message, emoji) {
  if (!client || !message || !emoji) return false;

  try {
    // Controlla se nel messaggio c'è già una reazione con la stessa emoji
    const existingReaction = message.reactions?.cache?.find(
      (r) => r.emoji.id === emoji || r.emoji.name === emoji
    );

    if (existingReaction) {
      const users = await existingReaction.users.fetch().catch(() => null);
      if (users && users.has(client.user.id)) {
        // Il bot ha già reagito
        return false;
      }
    }

    // Aggiunge la reazione
    await message.react(emoji);
    console.log(`✅ Reazione suggerita '${emoji}' aggiunta al messaggio ${message.id}`);
    return true;
  } catch (err) {
    console.error(`❌ Impossibile aggiungere la reazione '${emoji}' al messaggio ${message.id}:`, err.message);
    return false;
  }
}

/**
 * Controlla ed esegue la reazione con l'emoji predefinita del forum sul messaggio fornito.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').ThreadChannel} thread
 * @param {import('discord.js').Message} message
 */
async function handleForumDefaultReaction(client, thread, message) {
  const defaultEmoji = await getForumDefaultEmoji(thread);
  if (defaultEmoji) {
    await reactIfNotReacted(client, message, defaultEmoji);
  }
}

module.exports = {
  getForumDefaultEmoji,
  reactIfNotReacted,
  handleForumDefaultReaction,
};
