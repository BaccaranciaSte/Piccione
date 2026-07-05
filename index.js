/**
 * NewsBot - Discord Message Forwarding Bot
 * Forwards messages from source channels to specific threads in a forum channel.
 */

require('dotenv').config(); // Carica DISCORD_TOKEN da .env

const fs = require('fs');
const path = require('path');

// ─── Auto-generazione config.json da variabile d'ambiente se assente ──────────
const configPath = path.resolve(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  if (process.env.CONFIG_JSON) {
    try {
      JSON.parse(process.env.CONFIG_JSON);
      fs.writeFileSync(configPath, process.env.CONFIG_JSON, 'utf8');
      console.log('✅ File config.json generato correttamente dalla variabile d\'ambiente CONFIG_JSON.');
    } catch (err) {
      console.error('❌ Errore nel parsing della variabile CONFIG_JSON:', err.message);
      process.exit(1);
    }
  } else {
    console.error('❌ Configurazione mancante: config.json non esiste e la variabile CONFIG_JSON non è definita.');
    process.exit(1);
  }
}

const { Client, GatewayIntentBits, Partials, ActivityType, MessageFlags, MessageType, ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('./config.json');
const { handleMessage } = require('./src/messageHandler');
const { processedMessages, forwardedMessagesMap, pendingMessages, flushForwardedMap } = require('./src/cache');
const { getLastMessageId, flushState } = require('./src/state');
const { buildForwardPayload } = require('./src/payloadBuilder');
const { resolveThread } = require('./src/threadResolver');
const { containsInsult, BRAINROT_GIFS, containsBestemmia, isScream, isWow } = require('./src/insults');
const { containsBird } = require('./src/birds');
const translate = require('google-translate-api-x');
const { sleep } = require('./src/utils');

// ─── Helper: video casuale da una cartella ────────────────────────────────────
/**
 * Restituisce il percorso assoluto di un video casuale in una cartella.
 * Supporta .mp4, .webm, .mov. Restituisce null se vuota o non accessibile.
 * @param {string} dirPath - Percorso assoluto della cartella
 * @returns {string|null}
 */
function getRandomVideoFromDir(dirPath) {
  try {
    const files = fs.readdirSync(dirPath).filter(f => /\.(mp4|webm|mov)$/i.test(f));
    if (files.length === 0) return null;
    const chosen = files[Math.floor(Math.random() * files.length)];
    return path.join(dirPath, chosen);
  } catch {
    return null;
  }
}

/** Video casuale dalla cartella goose/ (risposta al /caga @bot). */
function getRandomGooseVideo() {
  return getRandomVideoFromDir(path.resolve(__dirname, 'goose'));
}

/** Video casuale dalla cartella bestemmia/ (risposta alle bestemmie). */
function getRandomBestemmiaVideo() {
  const dir = config.bestemmiaVideoDir
    ? path.resolve(__dirname, config.bestemmiaVideoDir)
    : path.resolve(__dirname, 'bestemmia');
  return getRandomVideoFromDir(dir);
}

// ─── Config Validation ────────────────────────────────────────────────────────
(function validateConfig() {
  if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN.trim() === '') {
    console.error('❌ Token mancante o non valido. Assicurati di avere un file .env con DISCORD_TOKEN=<token>.');
    process.exit(1);
  }

  if (!Array.isArray(config.mappings) || config.mappings.length === 0) {
    console.error('❌ Nessun mapping trovato in config.json.');
    process.exit(1);
  }

  const PLACEHOLDERS = new Set(['ID_CANALE_2', 'ID_CANALE_3', 'ID_THREAD_2', 'ID_THREAD_3']);
  const before = config.mappings.length;

  config.mappings = config.mappings.filter((m) => {
    const src = m.sourceChannelId?.trim() ?? '';
    const tgt = m.targetThreadId?.trim() ?? '';
    return src !== '' && tgt !== '' && !PLACEHOLDERS.has(src) && !PLACEHOLDERS.has(tgt);
  });

  const removed = before - config.mappings.length;
  if (removed > 0) {
    console.warn(`⚠️  ${removed} mapping incompleti/segnaposto ignorati al caricamento.`);
  }

  if (config.mappings.length === 0) {
    console.error('❌ Nessun mapping valido trovato. Controlla config.json.');
    process.exit(1);
  }
})();

// ─── Build a fast lookup Map: sourceChannelId → mapping ──────────────────────
// Evita di iterare l'array ad ogni messaggio (O(1) vs O(n)).
const mappingIndex = new Map(config.mappings.map((m) => [m.sourceChannelId, m]));

// ─── Canali ignorati dal bot (né processati né risponde) ──────────────────────────────────
// Letti da config.json: configurabili senza modificare il sorgente.
const IGNORED_CHANNEL_IDS = new Set(config.ignoredChannelIds ?? []);

// ─── Cooldown per urla e bestemmie (in-memory, per canale) ──────────────────────
const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minuti
const screamCooldowns = new Map(); // channelId -> timestamp
const bestemmiaCooldowns = new Map(); // channelId -> timestamp

// ─── Risposte piccione ────────────────────────────────────────────────────────
// Definito a livello di modulo: non ricreato ad ogni evento messageCreate.
const PIGEON_SOUNDS = [
  // Versi classici
  "Urufu! 🐦",
  "Gruuoo, gruuoo... 🕊️",
  "Prrr-prrr!",
  "Coo-roo-c'too-coo!",
  "Roo-coo!",
  "Grrru-ru-ru!",
  "Coo-coo-roo!",
  "Brrrrr-ck-ck-ck!",
  "Tuku-tuku-tuku!",
  // Comportamenti da piccione
  "*ti fissa negli occhi, sa dove abiti.*",
  "*becchetta per terra in cerca di banconot- briciole.*",
  "*cagasmerda con violenza*",
  "*gonfia il petto e chiede il pizzo*",
  "*si posa sulla tua testa e si scaga freneticamente*",
  "*ruba un pezzo di pizza e scappa volando a zig-zag*",
  "*ti fissa senza battere ciglio per 47 secondi*",
  "*si sfracella sulla tua macchina appena lavata*",
  "*fa la danza di corteggiamento con il tuo tallone*",
  "*caga nel tuo cappuccino*",
  "*becca furiosamente il tuo occhio destro*",
  "*vola in faccia al primo che passa*",
  "*si siede sulla telecamera di sorveglianza e muore d'infarto*",
  // Romano/dialettale
  "Aho, che voi? Levate dale palle.",
  "AAAAAAAAAAAAAAAAAAHH!",
  "Te tiro na castagna.",
  "Daje Roma Daje!",
  "A regà, se beccamo.",
];


// ─── Client Setup ─────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
  ],
});

// ─── Ready Event ──────────────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ NewsBot online come: ${client.user.tag}`);

  // ─── Registrazione dei comandi dell'applicazione (Slash Commands) ─────────────────
  try {
    console.log('🔄 Registrazione dei comandi slash in corso...');
    await client.application.commands.set([
      {
        name: 'caga',
        description: 'Caga in testa a un utente',
        options: [
          {
            name: 'utente',
            description: 'L\'utente a cui cagare in testa',
            type: ApplicationCommandOptionType.User,
            required: true,
          }
        ]
      },
      {
        name: 'setup-ingresso',
        description: 'Configura i ruoli captcha e il canale moderatori per questo server',
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        options: [
          {
            name: 'ruolo_captcha_1',
            description: 'Primo ruolo per gli utenti non verificati (captcha)',
            type: ApplicationCommandOptionType.Role,
            required: false,
          },
          {
            name: 'ruolo_captcha_2',
            description: 'Secondo ruolo per gli utenti non verificati (captcha)',
            type: ApplicationCommandOptionType.Role,
            required: false,
          },
          {
            name: 'canale_moderatori',
            description: 'Canale in cui inviare le notifiche del captcha/ban dei clown',
            type: ApplicationCommandOptionType.Channel,
            required: false,
          }
        ]
      }
    ]);
    console.log('✅ Comandi slash registrati globalmente.');
  } catch (err) {
    console.error('❌ Errore durante la registrazione dei comandi:', err);
  }

  // Imposta lo stato personalizzato del bot
  client.user.setPresence({
    activities: [{
      name: '*Human Pigeon Noises*',
      type: ActivityType.Custom,
    }],
    status: 'online',
  });

  console.log(`📡 ${config.mappings.length} mapping attivi:`);
  config.mappings.forEach((m, i) => {
    const label = m.name ? ` (${m.name})` : '';
    console.log(`   [${i + 1}]${label} ${m.sourceChannelId} → ${m.targetThreadId}`);
  });

  // ── Recupero messaggi offline ───────────────────────────────────────────────
  catchUpMissedMessages(client, config.mappings);
});

/**
 * Recupera tutte le pagine di messaggi persi da un canale dopo un determinato ID.
 * Pagina automaticamente in batch da 100 fino a esaurimento (max 1000 messaggi totali).
 * Senza paginazione il vecchio fetch limit:50 perdeva i messaggi più vecchi se ce n'erano >50.
 *
 * @param {import('discord.js').TextChannel} channel
 * @param {string} afterId - ID dell'ultimo messaggio noto
 * @returns {Promise<{ messages: import('discord.js').Message[], reachedLimit: boolean }>}
 */
async function fetchAllMissedMessages(channel, afterId) {
  const all = [];
  let cursor = afterId;
  const MAX_BATCHES = 10; // Sicurezza: massimo 1000 messaggi per sessione di recupero
  let reachedLimit = false;

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const fetched = await channel.messages.fetch({ after: cursor, limit: 100 }).catch(() => new Map());
    if (fetched.size === 0) break;

    const sorted = Array.from(fetched.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    all.push(...sorted);
    cursor = sorted[sorted.length - 1].id; // Cursore = ID più recente del batch

    if (fetched.size < 100) break; // Batch incompleto: nessuna pagina successiva

    // Se siamo all'ultimo batch e il fetch era pieno, potrebbero esserci altri messaggi
    if (batch === MAX_BATCHES - 1) {
      reachedLimit = true;
    }
  }

  return { messages: all, reachedLimit };
}

async function catchUpMissedMessages(client, mappings) {
  console.log('\n🔄 Avvio procedura di recupero messaggi offline...');

  for (const m of mappings) {
    const lastMessageId = getLastMessageId(m.sourceChannelId);
    if (!lastMessageId) {
      console.log(`ℹ️  Nessun stato precedente per il canale ${m.sourceChannelId}. Inizierò dal prossimo messaggio.`);
      continue;
    }

    try {
      const channel = await client.channels.fetch(m.sourceChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) continue;

      console.log(`🔍 Controllo nuovi messaggi in ${m.sourceChannelId} dopo l'ID ${lastMessageId}...`);

      const { messages: missedMessages, reachedLimit } = await fetchAllMissedMessages(channel, lastMessageId);

      if (reachedLimit) {
        console.warn(`⚠️  Raggiunto il limite di 1000 messaggi per il canale ${m.sourceChannelId}. Potrebbero esserci messaggi più vecchi non recuperati.`);
      }

      if (missedMessages.length > 0) {
        console.log(`📥 Trovati ${missedMessages.length} messaggi non letti in ${m.sourceChannelId}. Inoltro in corso...`);

        for (const msg of missedMessages) {
          // Controllo doppio: processedMessages (inviati) + pendingMessages (in elaborazione)
          if (processedMessages.has(msg.id) || pendingMessages.has(msg.id)) continue;
          pendingMessages.add(msg.id);
          try {
            await handleMessage(client, msg, m, config);
          } finally {
            pendingMessages.delete(msg.id);
          }
        }
      }
    } catch (err) {
      console.error(`❌ Errore durante il recupero offline per il canale ${m.sourceChannelId}:`, err);
    }
  }
  console.log('✅ Procedura di recupero messaggi offline completata.\n');
}

// ─── Rate Limit Warning ───────────────────────────────────────────────────────
client.rest.on('rateLimited', (info) => {
  console.warn(
    `⏳ Rate limit colpito — route: ${info.route}, attesa: ${info.timeToReset}ms`
  );
});

// ─── Message Create Event ─────────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  try {
    if (message.author?.id === client.user.id) return;

    // ── Benvenuto nuovo membro ──────────────────────────────────────────────────────────
    // Risponde con una GIF casuale quando un nuovo utente entra nel server.
    // Se il membro ha uno dei ruoli captcha (non ha completato la verifica), manda il clown.
    // I messaggi UserJoin arrivano solo in guild, ma controlliamo per sicurezza.
    if (message.type === MessageType.UserJoin) {
      if (message.guild) {
        const delayMs = Math.floor(Math.random() * 3000) + 3000;
        await sleep(delayMs);

        // ── Recupera la configurazione del server (guild) ─────────────────────
        const guildId = message.guild.id;
        const guildConfig = config.guildSettings?.[guildId] || config.guildSettings?.default;

        const captchaRoleIds = guildConfig?.captchaRoleIds ?? [];
        const alertChannelId = guildConfig?.alertChannelId;
        const welcomeGifs = guildConfig?.welcomeGifs ?? config.welcomeGifs ?? [];

        // ── Check ruoli captcha ────────────────────────────────────────────────
        let hasCaptchaRole = false;
        if (captchaRoleIds.length > 0) {
          try {
            const member = await message.guild.members.fetch(message.author.id);
            hasCaptchaRole = captchaRoleIds.some(roleId => member.roles.cache.has(roleId));
          } catch (err) {
            console.warn(`⚠️  Impossibile recuperare i ruoli per ${message.author?.id}:`, err.message);
          }
        }

        if (hasCaptchaRole) {
          // L'utente non ha superato il captcha → manda l'immagine del clown
          const clownPath = path.resolve(__dirname, 'clown.png');
          await message.reply({ files: [clownPath] }).catch(err => {
            console.error('❌ Errore durante l\'invio del clown:', err.message);
          });

          // ── Avviso nel canale moderatori ───────────────────────────────────
          let alertChannel = null;
          if (alertChannelId) {
            try {
              alertChannel = await client.channels.fetch(alertChannelId);
              if (alertChannel?.isTextBased()) {
                await alertChannel.send(
                  `E' entrato un clown.`
                );
              }
            } catch (err) {
              console.error('❌ Errore durante l\'invio dell\'avviso nel canale moderatori:', err.message);
            }
          }

          // ── Ban automatico dopo 5 secondi ───────────────────────────────────
          await sleep(5000);

          try {
            const member = await message.guild.members.fetch(message.author.id).catch(() => null);
            if (!member) {
              console.log(`ℹ️  L'utente ${message.author.id} ha già lasciato il server.`);
              if (alertChannel?.isTextBased()) {
                await alertChannel.send(`ℹ️ L'utente ${message.author.tag} ha lasciato il server prima che potessi bannarlo.`);
              }
            } else if (member.bannable) {
              const banReason = "Mancato superamento delle domande d'ingresso (captcha fallito).";

              // Tenta di inviare un messaggio privato all'utente prima del ban
              await member.send(`Sei stato bannato dal server **${message.guild.name}** per il seguente motivo: Clown Syndrome`)
                .catch(dmErr => console.warn(`⚠️ Impossibile inviare il DM a ${message.author.tag} (${message.author.id}):`, dmErr.message));

              await member.ban({
                deleteMessageSeconds: 24 * 60 * 60, // Cancella messaggi delle ultime 24 ore
                reason: `NewsBot: ${banReason}`
              });

              if (alertChannel?.isTextBased()) {
                await alertChannel.send(`🔨 **Bannato automaticamente**: ${message.author.tag} (${message.author.id}) perché non sa leggere.`);
              }
              console.log(`✅ Utente ${message.author.id} bannato automaticamente.`);
            } else {
              console.error(`❌ Impossibile bannare l'utente ${message.author.id}: il bot non ha il permesso di bannare o il ruolo dell'utente è superiore a quello del bot.`);
              if (alertChannel?.isTextBased()) {
                await alertChannel.send(`⚠️ **Impossibile bannare** ${message.author.tag}: il bot non ha il permesso di bannare oppure il ruolo dell'utente è superiore o uguale a quello del bot.`);
              }
            }
          } catch (banErr) {
            console.error(`❌ Errore durante il ban dell'utente ${message.author.id}:`, banErr.message);
            if (alertChannel?.isTextBased()) {
              await alertChannel.send(`❌ **Errore durante il ban** di ${message.author.tag}: \`${banErr.message}\``);
            }
          }
        } else if (welcomeGifs.length > 0) {
          // Utente verificato → GIF di benvenuto normale
          const gif = welcomeGifs[Math.floor(Math.random() * welcomeGifs.length)];
          await message.reply(gif).catch(() => { });
        }
      }
      return;
    }

    // Log per recuperare l'ID degli sticker inviati in chat (solo nel canale specificato in config)
    if (config.stickerLogChannelId && message.channelId === config.stickerLogChannelId && message.stickers?.size > 0) {
      message.stickers.forEach(sticker => {
        console.log(`📌 STICKER RILEVATO | Nome: "${sticker.name}" | ID: "${sticker.id}"`);
      });
    }

    // ── Thread ignorati: il bot non risponde né processa nulla da questi canali ──
    const parentId = (message.channel && 'parentId' in message.channel) ? message.channel.parentId : null;
    if (IGNORED_CHANNEL_IDS.has(message.channelId) || (parentId && IGNORED_CHANNEL_IDS.has(parentId))) return;

    // ── Comando /caga ────────────────────────────────────────────────────────────────
    if (message.content?.startsWith('/caga')) {
      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        await message.reply("Devi menzionare l'utente a cui vuoi cagare in testa! Es: `/caga @utente`").catch(() => { });
        return;
      }

      // Se taggano il bot, risponde con un video casuale dalla cartella goose/
      if (targetUser.id === client.user.id) {
        const gooseVideo = getRandomGooseVideo();
        if (gooseVideo) {
          await message.channel.send({
            content: `Ah ah! Ci hai provato ${message.author}... ma il piccione caga SEMPRE per ultimo. 🪿💩`,
            files: [gooseVideo]
          }).catch(err => {
            console.error(`❌ Errore durante l'invio del video goose:`, err.message);
          });
        } else {
          console.warn(`⚠️  Nessun video trovato nella cartella goose/.`);
          await message.channel.send(`Ci hai provato ${message.author}... ma il piccione non si caga in testa! 🕊️`).catch(() => { });
        }
        return;
      }

      const cagaGifs = config.cagaGifs && config.cagaGifs.length > 0 ? config.cagaGifs : [
        'https://tenor.com/bdkjk.gif',
        'https://tenor.com/oXYS.gif',
        'https://tenor.com/bGixG.gif'
      ];
      const randomGif = cagaGifs[Math.floor(Math.random() * cagaGifs.length)];

      await message.channel.send(`Nulla di personale ${targetUser}\n${randomGif}`).catch(err => {
        console.error(`❌ Errore durante l'esecuzione del comando /caga:`, err.message);
      });
      return;
    }

    // ── Easter Egg: Versi di piccione se taggato, se gli rispondono o in DM ───
    const isMentioned = message.mentions.users.has(client.user.id);
    const isReply = message.type === MessageType.Reply && message.mentions.repliedUser?.id === client.user.id;
    const isDM = !message.guild;

    if (isMentioned || isReply || isDM) {
      // Reagisce al messaggio se è stato taggato o citato (escluso in DM)
      if ((isMentioned || isReply) && config.pigeonReactionEmojiId) {
        await message.react(config.pigeonReactionEmojiId).catch(err => {
          console.error(`❌ Errore durante l'aggiunta della reazione al messaggio:`, err.message);
        });
      }

      // Se il messaggio contiene un insulto, risponde esclusivamente con una GIF brainrot
      if (containsInsult(message.content)) {
        const randomGif = BRAINROT_GIFS[Math.floor(Math.random() * BRAINROT_GIFS.length)];
        await message.reply(randomGif).catch(() => { });
        return;
      }

      // C'è una probabilità del 20% di rispondere con lo sticker predefinito (se configurato)
      const USE_STICKER_CHANCE = 0.20;
      if (config.pigeonStickerId && Math.random() < USE_STICKER_CHANCE) {
        await message.reply({
          stickers: [config.pigeonStickerId]
        }).catch(() => { });
        return;
      }

      const randomSound = PIGEON_SOUNDS[Math.floor(Math.random() * PIGEON_SOUNDS.length)];
      await message.reply(randomSound).catch(() => { });
      return;
    }

    // ── Risposta con GIF brainrot se c'è un insulto rivolto a un volatile nella stessa frase ───
    const sentences = message.content ? message.content.split(/[.!?\n]+/) : [];
    const hasBirdInsult = sentences.some(s => {
      const trimmed = s.trim();
      return trimmed && containsInsult(trimmed) && containsBird(trimmed);
    });

    if (hasBirdInsult) {
      const randomGif = BRAINROT_GIFS[Math.floor(Math.random() * BRAINROT_GIFS.length)];
      await message.reply(randomGif).catch(err => {
        console.error(`❌ Errore durante la risposta all'insulto sul volatile:`, err.message);
      });
    } else if (containsInsult(message.content) || containsBird(message.content)) {
      // Reazione con emoji se contiene un insulto o un volatile (ma non entrambi nella stessa frase)
      await message.react('1511773581829472336').catch(err => {
        console.error(`❌ Errore durante l'aggiunta della reazione per insulto/volatile:`, err.message);
      });
    }

    // ── Reazione a "WOW" e varianti ──────────────────────────────────────────────────
    if (isWow(message.content) && config.wowGif) {
      await message.reply(config.wowGif).catch(err => {
        console.error('❌ Errore durante la risposta al WOW:', err.message);
      });
      // Non facciamo return: il messaggio può ancora essere inoltrato se necessario
    }

    // ── Reazione alle urla (es. AAAAAAAAAA) ──────────────────────────────────────────
    if (isScream(message.content) && config.screamGif) {
      const now = Date.now();
      const lastScream = screamCooldowns.get(message.channelId) || 0;
      const isScreamCooldown = (now - lastScream) < COOLDOWN_DURATION;

      if (!isScreamCooldown) {
        screamCooldowns.set(message.channelId, now);
        await message.reply(config.screamGif).catch(err => {
          console.error('❌ Errore durante la risposta all\'urla:', err.message);
        });
      }

      // Reagisce comunque con l'emoji se configurata
      if (config.pigeonReactionEmojiId) {
        await message.react(config.pigeonReactionEmojiId).catch(err => {
          console.error('❌ Errore durante la reazione all\'urla:', err.message);
        });
      }
      // Non facciamo return: il messaggio può ancora essere inoltrato se necessario
    }

    // ── Reazione alle bestemmie (video casuale dalla cartella bestemmia/) ──────────
    if (containsBestemmia(message.content) && config.bestemmiaVideoDir) {
      const now = Date.now();
      const lastBestemmia = bestemmiaCooldowns.get(message.channelId) || 0;
      const isBestemmiaCooldown = (now - lastBestemmia) < COOLDOWN_DURATION;

      if (!isBestemmiaCooldown) {
        bestemmiaCooldowns.set(message.channelId, now);
        const videoPath = getRandomBestemmiaVideo();
        if (videoPath) {
          await message.reply({ files: [videoPath] }).catch(err => {
            console.error('❌ Errore durante l\'invio del video bestemmia:', err.message);
          });
        } else {
          console.warn(`⚠️  Nessun video trovato nella cartella bestemmia/.`);
        }
      }

      // Reagisce comunque con l'emoji se configurata
      if (config.pigeonReactionEmojiId) {
        await message.react(config.pigeonReactionEmojiId).catch(err => {
          console.error('❌ Errore durante la reazione alla bestemmia:', err.message);
        });
      }
      // Non facciamo return: il messaggio può ancora essere inoltrato se necessario
    }

    // Lookup O(1) tramite Map invece di Array.find O(n)
    const mapping = mappingIndex.get(message.channelId);
    if (!mapping) return;

    if (processedMessages.has(message.id) || pendingMessages.has(message.id)) {
      console.log(`⚠️  Duplicato/già in elaborazione, ignorato: ${message.id}`);
      return;
    }

    pendingMessages.add(message.id);
    try {
      await handleMessage(client, message, mapping, config);
    } finally {
      pendingMessages.delete(message.id);
    }

  } catch (err) {
    console.error('❌ Errore imprevisto in messageCreate:', err);
  }
});

// ─── Interaction Create Event (Translate Button & Slash Commands) ─────────────────
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'caga') {
      try {
        const targetUser = interaction.options.getUser('utente');

        // Se taggano il bot, risponde con un video casuale dalla cartella goose/
        if (targetUser.id === client.user.id) {
          const gooseVideo = getRandomGooseVideo();
          if (gooseVideo) {
            await interaction.reply({
              content: `${interaction.user}... Ti aspetto sotto casa. 🪿`,
              files: [gooseVideo]
            });
          } else {
            console.warn(`⚠️  Nessun video trovato nella cartella goose/.`);
            await interaction.reply({ content: `${interaction.user}... Ti aspetto sotto casa. 🪿` });
          }
          return;
        }

        const cagaGifs = config.cagaGifs && config.cagaGifs.length > 0 ? config.cagaGifs : [
          'https://tenor.com/bdkjk.gif',
          'https://tenor.com/oXYS.gif',
          'https://tenor.com/bGixG.gif'
        ];
        const randomGif = cagaGifs[Math.floor(Math.random() * cagaGifs.length)];

        await interaction.reply({ content: `Nulla di personale ${targetUser}\n${randomGif}` });
      } catch (err) {
        console.error(`❌ Errore durante l'esecuzione del comando /caga:`, err.message);
        await interaction.reply({ content: '❌ C\'è stato un errore durante l\'invio del comando.', flags: [MessageFlags.Ephemeral] }).catch(() => { });
      }
    } else if (interaction.commandName === 'setup-ingresso') {
      try {
        const guildId = interaction.guildId;
        if (!guildId) {
          await interaction.reply({ content: '❌ Questo comando può essere eseguito solo all\'interno di un server.', flags: [MessageFlags.Ephemeral] });
          return;
        }

        const role1 = interaction.options.getRole('ruolo_captcha_1');
        const role2 = interaction.options.getRole('ruolo_captcha_2');
        const channel = interaction.options.getChannel('canale_moderatori');

        // Valida il tipo di canale: deve essere un canale testuale (no vocale, forum, categoria)
        if (channel) {
          const forbiddenTypes = [
            ChannelType.GuildVoice,
            ChannelType.GuildStageVoice,
            ChannelType.GuildForum,
            ChannelType.GuildCategory,
            ChannelType.GuildMedia,
          ];
          if (forbiddenTypes.includes(channel.type)) {
            await interaction.reply({
              content: `❌ **Canale non valido**: \`${channel.name}\` non è un canale di testo. Seleziona un canale testuale (es. #moderatori).`,
              flags: [MessageFlags.Ephemeral]
            });
            return;
          }
        }

        // Se non viene specificata alcuna opzione, mostriamo la configurazione corrente
        if (!role1 && !role2 && !channel) {
          const currentConfig = config.guildSettings?.[guildId] || config.guildSettings?.default;
          if (!currentConfig) {
            await interaction.reply({
              content: `ℹ️ Non ci sono impostazioni configurate per questo server e non è presente una configurazione di default.`,
              flags: [MessageFlags.Ephemeral]
            });
            return;
          }

          const captchaRolesText = currentConfig.captchaRoleIds?.length > 0 
            ? currentConfig.captchaRoleIds.map(id => `<@&${id}>`).join(', ') 
            : 'Nessuno';
          const alertChannelText = currentConfig.alertChannelId 
            ? `<#${currentConfig.alertChannelId}>` 
            : 'Nessuno';

          await interaction.reply({
            content: `ℹ️ **Configurazione attuale di ingresso per questo server**:\n` +
                     `- **Ruoli Captcha**: ${captchaRolesText}\n` +
                     `- **Canale Notifiche/Log**: ${alertChannelText}`,
            flags: [MessageFlags.Ephemeral]
          });
          return;
        }

        // Inizializza o recupera la configurazione per la guild corrente
        config.guildSettings = config.guildSettings || {};
        config.guildSettings[guildId] = config.guildSettings[guildId] || {};

        const serverConfig = config.guildSettings[guildId];

        // Aggiornamento cumulativo dei ruoli: aggiorna solo gli slot specificati,
        // preservando gli altri già configurati.
        if (role1 || role2) {
          const existingRoleIds = [...(serverConfig.captchaRoleIds ?? [])];
          if (role1) existingRoleIds[0] = role1.id;
          if (role2) existingRoleIds[1] = role2.id;
          serverConfig.captchaRoleIds = existingRoleIds.filter(Boolean);
        }

        if (channel) {
          serverConfig.alertChannelId = channel.id;
        }

        // Salvataggio su file
        const configPath = path.resolve(__dirname, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

        const finalCaptchaRoles = serverConfig.captchaRoleIds?.length > 0 
          ? serverConfig.captchaRoleIds.map(id => `<@&${id}>`).join(', ') 
          : 'Nessuno';
        const finalAlertChannel = serverConfig.alertChannelId 
          ? `<#${serverConfig.alertChannelId}>` 
          : 'Nessuno';

        await interaction.reply({
          content: `✅ **Configurazione aggiornata con successo!**\n` +
                   `- **Ruoli Captcha**: ${finalCaptchaRoles}\n` +
                   `- **Canale Notifiche/Log**: ${finalAlertChannel}`,
          flags: [MessageFlags.Ephemeral]
        });
      } catch (err) {
        console.error('❌ Errore durante l\'esecuzione di /setup-ingresso:', err);
        await interaction.reply({
          content: `❌ C'è stato un errore durante l'aggiornamento della configurazione: \`${err.message}\``,
          flags: [MessageFlags.Ephemeral]
        }).catch(() => { });
      }
    }
    return;
  }

  if (!interaction.isButton()) return;
  if (interaction.customId !== 'translate') return;

  try {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const message = interaction.message;
    let textToTranslate = '';

    // Estrai il testo dal contenuto (rimuovendo l'eventuale ping al ruolo)
    if (message.content) {
      textToTranslate += message.content
        .replace(/<@&\d+>/g, '')           // rimuove role mention
        .replace(/<t:\d+:[A-Za-z]>/g, '')  // rimuove timestamp Discord (non traducibili)
        .trim() + '\n\n';
    }

    // Estrai il testo dagli embed
    message.embeds.forEach(embed => {
      if (embed.title) textToTranslate += embed.title + '\n';
      if (embed.description) textToTranslate += embed.description + '\n\n';
    });

    textToTranslate = textToTranslate.trim();

    if (!textToTranslate) {
      return interaction.editReply({ content: '❌ Nessun testo da tradurre trovato.' });
    }

    // Traduci in italiano
    const res = await translate(textToTranslate, { to: 'it' });

    // Discord ha un limite di 2000 caratteri per messaggio
    const translatedText = res.text.length > 1950 ? res.text.substring(0, 1950) + '...' : res.text;

    await interaction.editReply({ content: `🇮🇹 **Traduzione:**\n\n${translatedText}` });
  } catch (err) {
    console.error('❌ Errore durante la traduzione:', err);
    await interaction.editReply({ content: '❌ Errore durante la traduzione. Riprova più tardi.' }).catch(() => { });
  }
});

// ─── Message Update Event (Handle Edits / Webhook updates) ────────────────────
client.on('messageUpdate', async (oldMessage, newMessage) => {
  try {
    // Se il messaggio è parziale (es. non era in cache), lo recuperiamo
    if (newMessage.partial) {
      try {
        newMessage = await newMessage.fetch();
      } catch (err) {
        console.error('❌ Impossibile recuperare il messaggio parziale durante l\'edit:', err.message);
        return;
      }
    }

    if (newMessage.author?.id === client.user.id) return;

    // Lookup mapping
    const mapping = mappingIndex.get(newMessage.channelId);
    if (!mapping) return;

    // Controlla se abbiamo già inoltrato questo messaggio in precedenza
    const forwarded = forwardedMessagesMap.get(newMessage.id);
    if (forwarded) {
      console.log(`🔄 Rilevato edit per il messaggio ${newMessage.id} → aggiornamento nel thread ${forwarded.threadId}`);
      try {
        const thread = await resolveThread(client, forwarded.threadId);
        if (!thread) return;

        const forwardedMessage = await thread.messages.fetch(forwarded.sentMessageId).catch(() => null);
        if (!forwardedMessage) {
          console.log(`⚠️ Messaggio inoltrato originale ${forwarded.sentMessageId} non trovato nel thread. Re-inoltro...`);
          await handleMessage(client, newMessage, mapping, config);
          return;
        }

        // Costruisci il nuovo payload per l'edit
        const payload = buildForwardPayload(newMessage, mapping);

        // Discord non consente di modificare i file allegati (attachment) di messaggi già inviati.
        // Estraiamo files dal payload lasciando solo contenuto testuale ed embed.
        const { files: _discardedFiles, ...editPayload } = payload;

        // Se dopo la rimozione dei files non rimane nulla da aggiornare, saltiamo silenziosamente
        if (!editPayload.content && (!editPayload.embeds || editPayload.embeds.length === 0)) {
          console.log(`ℹ️  Nessun testo/embed da aggiornare per ${newMessage.id} (solo media — impossibile modificarli via API).`);
          return;
        }

        await forwardedMessage.edit(editPayload);
        console.log(`✅ Messaggio ${newMessage.id} modificato nel thread con successo.`);
      } catch (err) {
        console.error(`❌ Errore durante l'aggiornamento dell'edit per il messaggio ${newMessage.id}:`, err.message);
      }
    } else {
      // Se non era stato ancora inoltrato (es. prima era vuoto e non passava la validazione)
      // Controlliamo che non sia un vecchio messaggio antecedente all'ultimo stato salvato per evitare duplicati in caso di riavvio del bot
      const lastMsgId = getLastMessageId(newMessage.channelId);
      const isNewMessage = !lastMsgId || BigInt(newMessage.id) > BigInt(lastMsgId);

      if (!processedMessages.has(newMessage.id) && isNewMessage) {
        console.log(`📥 Messaggio ${newMessage.id} precedentemente ignorato ha nuovi contenuti (edit) → Inoltro...`);
        await handleMessage(client, newMessage, mapping, config);
      }
    }
  } catch (err) {
    console.error('❌ Errore imprevisto in messageUpdate:', err);
  }
});

// ─── Message Delete Event ─────────────────────────────────────────────────────────
client.on('messageDelete', async (message) => {
  try {
    // Controlla se abbiamo inoltrato questo messaggio (solo se tracciato in memoria)
    const forwarded = forwardedMessagesMap.get(message.id);
    if (!forwarded) return;

    // Controlla se il canale è tra quelli monitorati
    if (!mappingIndex.has(message.channelId)) return;

    console.log(`🗑️  Messaggio ${message.id} eliminato nel canale sorgente → rimozione dal thread ${forwarded.threadId}`);

    try {
      const thread = await resolveThread(client, forwarded.threadId);
      if (!thread) return;

      const forwardedMessage = await thread.messages.fetch(forwarded.sentMessageId).catch(() => null);
      if (!forwardedMessage) {
        // Messaggio già rimosso manualmente o non trovato — puliamo la mappa
        forwardedMessagesMap.delete(message.id);
        return;
      }

      await forwardedMessage.delete();
      forwardedMessagesMap.delete(message.id);
      console.log(`✅ Messaggio ${forwarded.sentMessageId} rimosso dal thread con successo.`);
    } catch (err) {
      console.error(`❌ Impossibile rimuovere il messaggio inoltrato ${forwarded.sentMessageId}:`, err.message);
    }
  } catch (err) {
    console.error('❌ Errore imprevisto in messageDelete:', err);
  }
});

// ─── Message Delete Bulk Event ────────────────────────────────────────────────
// Emesso quando un moderatore fa purge o un utente viene bannato.
// Senza questo handler le copie inoltrate resterebbero orfane nel thread.
client.on('messageDeleteBulk', async (messages) => {
  try {
    for (const [messageId, message] of messages) {
      const forwarded = forwardedMessagesMap.get(messageId);
      if (!forwarded) continue;

      // Controlla se il canale è tra quelli monitorati
      if (message.channelId && !mappingIndex.has(message.channelId)) continue;

      console.log(`🗑️  [Bulk] Messaggio ${messageId} eliminato → rimozione dal thread ${forwarded.threadId}`);

      try {
        const thread = await resolveThread(client, forwarded.threadId);
        if (!thread) {
          forwardedMessagesMap.delete(messageId);
          continue;
        }

        const forwardedMessage = await thread.messages.fetch(forwarded.sentMessageId).catch(() => null);
        if (!forwardedMessage) {
          forwardedMessagesMap.delete(messageId);
          continue;
        }

        await forwardedMessage.delete();
        forwardedMessagesMap.delete(messageId);
        console.log(`✅ [Bulk] Messaggio ${forwarded.sentMessageId} rimosso dal thread.`);
      } catch (err) {
        console.error(`❌ [Bulk] Impossibile rimuovere il messaggio inoltrato ${forwarded.sentMessageId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ Errore imprevisto in messageDeleteBulk:', err);
  }
});

// ─── Global Error Handlers ──────────────────────────────────────────────────────────
client.on('error', (err) => console.error('❌ Errore client Discord:', err));

// ─── shardError throttling ────────────────────────────────────────────────────
// Evita di spammare il log quando la rete cade: stampa il primo errore subito,
// poi sopprime i duplicati per SHARD_ERROR_THROTTLE_MS ms e al termine mostra
// quanti ne sono stati silenziati.
const SHARD_ERROR_THROTTLE_MS = 30_000;
let _shardErrorThrottleTimer = null;
let _shardErrorSuppressed = 0;

client.on('shardError', error => {
  if (_shardErrorThrottleTimer) {
    // Siamo nel periodo di silenzio: conta l'errore ma non stamparlo
    _shardErrorSuppressed++;
    return;
  }

  // Primo errore del periodo: stampalo subito
  console.error('❌ Errore WebSocket Discord (shardError):', error);

  _shardErrorThrottleTimer = setTimeout(() => {
    if (_shardErrorSuppressed > 0) {
      console.error(`❌ shardError: altri ${_shardErrorSuppressed} errori identici soppressi negli ultimi ${SHARD_ERROR_THROTTLE_MS / 1000}s.`);
    }
    _shardErrorSuppressed = 0;
    _shardErrorThrottleTimer = null;
  }, SHARD_ERROR_THROTTLE_MS);
});

client.on('shardDisconnect', (event, id) => {
  console.log(`⚠️  Disconnesso da Discord (shard ${id}). Motivo: ${event.reason || 'sconosciuto'} (Codice: ${event.code}). Riconnessione automatica in corso...`);
});

client.on('shardResume', (id, replayedEvents) => {
  console.log(`✅ Riconnesso a Discord (shard ${id}). Eventi recuperati: ${replayedEvents}`);
});

client.on('shardReady', (id) => {
  console.log(`🌐 WebSocket Discord pronto (shard ${id}). Connessione stabilita.`);
});

process.on('unhandledRejection', (reason) =>
  console.error('❌ Promise rejection non gestita:', reason)
);

process.on('uncaughtException', (err) => {
  console.error('❌ Eccezione non gestita (uncaughtException):', err);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Arresto NewsBot (SIGINT)...');
  flushState();
  flushForwardedMap();
  console.log('💾 Stato e mappa inoltri salvati su disco.');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arresto NewsBot (SIGTERM)...');
  flushState();
  flushForwardedMap();
  console.log('💾 Stato e mappa inoltri salvati su disco.');
  client.destroy();
  process.exit(0);
});

// ─── HTTP Web Server (Keep-alive/Uptime) ──────────────────────────────────────
const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Pigeon Bot is flying! 🐦');
});

server.listen(PORT, () => {
  console.log(`📡 Web server in ascolto sulla porta ${PORT} per keep-alive.`);
});

// ─── Login ────────────────────────────────────────────────────────────────────
const RETRY_INTERVAL = 10_000; // ms tra un tentativo e il successivo
const MAX_LOGIN_RETRIES = 5;     // oltre questo numero il processo si ferma

// Timeout per client.login(): se Discord non risponde entro LOGIN_TIMEOUT_MS, fallisce
const LOGIN_TIMEOUT_MS = 30_000;

async function loginWithRetry(attempt = 0) {
  if (attempt === 0) {
    // Diagnostica: verifica presenza del token prima di tentare il login
    const tokenPresent = !!(process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN.trim() !== '');
    console.log(`🔑 DISCORD_TOKEN presente: ${tokenPresent}`);
    if (tokenPresent) {
      const preview = process.env.DISCORD_TOKEN.substring(0, 10) + '...';
      console.log(`🔑 Token preview: ${preview}`);
    }
  }

  console.log(`🔄 Tentativo di login Discord (${attempt + 1}/${MAX_LOGIN_RETRIES + 1})...`);

  try {
    await Promise.race([
      client.login(process.env.DISCORD_TOKEN),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Login timeout dopo ${LOGIN_TIMEOUT_MS / 1000}s — Discord WebSocket non raggiungibile`)), LOGIN_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    // Errore 401 = token non valido: inutile riprovare
    const status = err.status ?? err.httpStatus;
    console.error(`❌ Login fallito — status: ${status}, messaggio: ${err.message}`);

    if (status === 401) {
      console.error('❌ Token non valido (401). Controlla le variabili d\'ambiente su Render e riavvia il bot.');
      process.exit(1);
    }

    if (attempt >= MAX_LOGIN_RETRIES) {
      console.error(`❌ Login fallito ${MAX_LOGIN_RETRIES + 1} volte consecutive. Arresto del processo.`);
      process.exit(1);
    }

    console.error(
      `❌ Login fallito (${err.message}). Tentativo ${attempt + 1}/${MAX_LOGIN_RETRIES + 1}. ` +
      `Nuovo tentativo in ${RETRY_INTERVAL / 1000}s...`
    );
    setTimeout(() => loginWithRetry(attempt + 1), RETRY_INTERVAL);
  }
}

loginWithRetry();
