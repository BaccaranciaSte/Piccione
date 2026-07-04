# 📰 NewsBot

Un bot Discord in Node.js che inoltra automaticamente i messaggi da canali sorgente verso thread specifici in un forum channel.

---

## 📁 Struttura del progetto

```
newsbot/
├── index.js                 # Entry point, setup client e eventi
├── config.json              # Token e mappings (NON committare su Git!)
├── package.json
├── .gitignore
└── src/
    ├── messageHandler.js    # Logica principale di inoltro
    ├── threadResolver.js    # Fetch e unarchive del thread
    ├── payloadBuilder.js    # Costruisce il payload da inviare
    └── cache.js             # Cache anti-duplicati in memoria
```

---

## ⚙️ Requisiti

- **Node.js** >= 18.0.0
- Un bot Discord con i seguenti **Privileged Gateway Intents** abilitati nel [Developer Portal](https://discord.com/developers/applications):
  - `MESSAGE CONTENT INTENT` ✅ (obbligatorio per leggere il testo dei messaggi)
  - `SERVER MEMBERS INTENT` (opzionale)

---

## 🚀 Installazione

```bash
# 1. Entra nella cartella
cd newsbot

# 2. Installa le dipendenze
npm install

# 3. Configura il bot (vedi sezione sotto)
# Modifica config.json con il tuo token e i tuoi mapping

# 4. Avvia
npm start
```

---

## 🔧 Configurazione

Modifica `config.json`:

```json
{
  "token": "IL_TUO_BOT_TOKEN",
  "mappings": [
    {
      "sourceChannelId": "123456789012345678",
      "targetThreadId":  "987654321098765432"
    },
    {
      "sourceChannelId": "111222333444555666",
      "targetThreadId":  "666555444333222111"
    }
  ]
}
```

### Come trovare gli ID

1. In Discord: **Impostazioni → Avanzate → Modalità sviluppatore** → attiva
2. Tasto destro su un canale o thread → **Copia ID**

> ⚠️ `config.json` contiene il token del bot: **non caricarlo mai su GitHub**. Il `.gitignore` già lo esclude.

---

## 🔐 Permessi del bot

Il bot ha bisogno dei seguenti permessi **nei server coinvolti**:

| Permesso | Perché |
|---|---|
| `Read Messages / View Channels` | Leggere i canali sorgente |
| `Read Message History` | Accedere ai messaggi |
| `Send Messages in Threads` | Scrivere nei thread |
| `Manage Threads` | Riaprire thread archiviati |

**OAuth2 Scopes**: `bot` + `applications.commands`

---

## 💡 Come funziona il forwarding

Quando arriva un messaggio in un canale sorgente:

1. Il bot controlla se l'ID è già in cache (anti-duplicati)
2. Recupera il thread di destinazione
3. Se il thread è archiviato, lo riapre automaticamente
4. Costruisce il payload:
   - Header con autore e canale di origine
   - Testo originale del messaggio
   - URL degli allegati
   - Embed originali (fino a 10, limite Discord)
5. Invia nel thread

---

## 🪝 Supporto Webhook

I messaggi inviati da webhook (es. feed RSS, integrazioni GitHub, Zapier, ecc.) vengono **accettati e inoltrati** correttamente, inclusi i loro embed.

---

## 🛑 Anti-duplicati

La cache in memoria mantiene fino a **5.000 ID** di messaggi già processati. Viene svuotata automaticamente ogni **30 minuti** (rimuovendo i più vecchi). Questo evita il double-forwarding in caso di eventi duplicati da Discord.

> Se esegui più istanze del bot in parallelo, considera una cache condivisa esterna (Redis).

---

## 📋 Log di esempio

```
✅ NewsBot online as: NewsBot#1234
📡 Monitoring 2 channel mapping(s)
   [1] Source: 123456789012345678 → Thread: 987654321098765432
   [2] Source: 111222333444555666 → Thread: 666555444333222111

📨 New message in 123456789012345678 from webhook (RSSBot) → forwarding to thread 987654321098765432
✅ Forwarded message 1234567890987654321 to thread 987654321098765432

📨 New message in 111222333444555666 from user#0001 → forwarding to thread 666555444333222111
🔓 Thread 666555444333222111 is archived — attempting to unarchive...
✅ Thread 666555444333222111 successfully unarchived.
✅ Forwarded message 9876543210123456789 to thread 666555444333222111
```

---

## ♻️ Aggiungere nuovi mapping

Basta aggiungere una voce a `mappings` in `config.json` e riavviare il bot:

```json
{
  "sourceChannelId": "NUOVO_CANALE_ID",
  "targetThreadId":  "NUOVO_THREAD_ID"
}
```
