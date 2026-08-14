/**
 * forumReaction.js
 * Gestione delle reazioni predefinite (pre-emoji / defaultReactionEmoji) dei canali Forum in Discord.
 */

const { ChannelType } = require('discord.js');

/**
 * Struttura dati per l'emoji predefinita del forum
 * @typedef {Object} ForumEmojiData
 * @property {string|null} emojiId - ID dell'emoji personalizzata (se presente)
 * @property {string|null} emojiName - Nome dell'emoji o carattere unicode
 */

/**
 * Ottiene le informazioni sull'emoji di reazione predefinita dal canale Forum genitore di un thread.
 * @param {import('discord.js').ThreadChannel} thread
 * @returns {Promise<ForumEmojiData|null>}
 */
async function getForumDefaultEmojiData(thread) {
  if (!thread || typeof thread.isThread !== 'function' || !thread.isThread()) return null;

  try {
    let parent = thread.parent;

    // Se il canale genitore non è in cache o non ha le info sulla defaultReactionEmoji, forza il fetch dal gateway
    if (!parent || !parent.defaultReactionEmoji) {
      if (thread.parentId) {
        parent = await thread.client.channels.fetch(thread.parentId, { force: true }).catch(() => null);
      }
    }

    if (!parent) return null;

    // Controlla se il canale genitore è un Forum o Media Channel e possiede una defaultReactionEmoji
    if (
      (parent.type === ChannelType.GuildForum || parent.type === ChannelType.GuildMedia) &&
      parent.defaultReactionEmoji
    ) {
      const { emojiId, emojiName } = parent.defaultReactionEmoji;
      if (emojiId || emojiName) {
        return { emojiId: emojiId || null, emojiName: emojiName || null };
      }
    }
  } catch (err) {
    console.error(`❌ Errore recupero emoji predefinita forum per thread ${thread.id}:`, err.message);
  }

  return null;
}

/**
 * Risolve il parametro corretto da passare a message.react() per la Discord API.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild|null} guild
 * @param {ForumEmojiData} emojiData
 * @returns {import('discord.js').GuildEmoji | string | null}
 */
function resolveReactionEmoji(client, guild, emojiData) {
  if (!emojiData) return null;
  const { emojiId, emojiName } = emojiData;

  // Se è un'emoji personalizzata (ha un emojiId)
  if (emojiId) {
    // 1. Cerca nella cache globale del client o della guild
    const cachedEmoji = client.emojis.cache.get(emojiId) || guild?.emojis?.cache?.get(emojiId);
    if (cachedEmoji) {
      return cachedEmoji;
    }

    // 2. Se non in cache, formatta nel formato che Discord API accetta per emoji custom: name:id
    const name = emojiName || '_';
    return `${name}:${emojiId}`;
  }

  // Se è un'emoji Unicode standard (ha solo emojiName)
  if (emojiName) {
    return emojiName;
  }

  return null;
}

/**
 * Fa reagire il bot a un messaggio con l'emoji del forum se non vi ha già reagito.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Message} message
 * @param {ForumEmojiData} emojiData
 * @returns {Promise<boolean>} true se la reazione è stata aggiunta, false altrimenti
 */
async function reactIfNotReacted(client, message, emojiData) {
  if (!client || !message || !emojiData) return false;

  const { emojiId, emojiName } = emojiData;
  if (!emojiId && !emojiName) return false;

  try {
    // 1. Verifica se nel messaggio il BOT ha già reagito con questa emoji
    const existingReaction = message.reactions?.cache?.find((r) => {
      if (emojiId && r.emoji.id === emojiId) return true;
      if (emojiName && r.emoji.name === emojiName) return true;
      return false;
    });

    if (existingReaction) {
      const users = await existingReaction.users.fetch().catch(() => null);
      if (users && users.has(client.user.id)) {
        // Il bot ha già reagito con questa emoji
        return false;
      }
    }

    // 2. Risolvi il formato corretto per message.react()
    const reactionTarget = resolveReactionEmoji(client, message.guild, emojiData);
    if (!reactionTarget) return false;

    // 3. Aggiungi la reazione
    await message.react(reactionTarget);
    console.log(`✅ Reazione predefinita forum (${emojiName || emojiId}) aggiunta al messaggio ${message.id}`);
    return true;
  } catch (err) {
    console.error(`❌ Impossibile aggiungere la reazione predefinita (${emojiName || emojiId}) al messaggio ${message.id}:`, err.message);
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
  const emojiData = await getForumDefaultEmojiData(thread);
  if (emojiData) {
    await reactIfNotReacted(client, message, emojiData);
  }
}

module.exports = {
  getForumDefaultEmojiData,
  resolveReactionEmoji,
  reactIfNotReacted,
  handleForumDefaultReaction,
};
