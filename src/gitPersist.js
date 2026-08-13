/**
 * gitPersist.js
 * Persiste state.json e forwarded.json su GitHub tramite git,
 * così sopravvivono ai riavvii/redeploy di Render (filesystem effimero).
 *
 * Strategia: un singolo commit "chore: persist state [bot]" che viene
 * continuamente amendato (--amend --no-edit) e force-pushato, così
 * la history del repo non si riempie di commit di stato.
 *
 * Richiede:
 *  - GIT_PERSIST_TOKEN: GitHub Personal Access Token con permesso repo
 *  - GIT_USER_EMAIL: email per i commit git (es. bot@piccione)
 *  - GIT_USER_NAME: nome autore (es. Piccione Bot)
 *
 * Se GIT_PERSIST_TOKEN non è configurato, il modulo è no-op (locale).
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.join(__dirname, '..');
const DEBOUNCE_MS = 30_000; // flush su GitHub al massimo ogni 30 secondi

let debounceTimer = null;
let initialized = false;

/**
 * Configura git (user, remote con token) una volta sola.
 * @returns {boolean} true se la configurazione è riuscita
 */
function ensureGitSetup() {
  if (initialized) return true;

  const token = process.env.GIT_PERSIST_TOKEN;
  if (!token) return false; // no-op in locale

  try {
    const email = process.env.GIT_USER_EMAIL || 'bot@piccione.local';
    const name  = process.env.GIT_USER_NAME  || 'Piccione Bot';

    exec(`git config user.email "${email}"`);
    exec(`git config user.name "${name}"`);

    // Aggiorna il remote origin per includere il token di autenticazione
    const remoteUrl = exec('git remote get-url origin').trim();
    // Inserisce il token nell'URL: https://TOKEN@github.com/...
    const authedUrl = remoteUrl.replace('https://', `https://${token}@`);
    exec(`git remote set-url origin "${authedUrl}"`);

    // Rimuovi state.json e forwarded.json dal .gitignore locale
    // (solo in memoria — non modifichiamo il file su disco)
    initialized = true;
    console.log('🔧 gitPersist: configurazione git completata.');
    return true;
  } catch (err) {
    console.error('❌ gitPersist: errore nella configurazione git:', err.message);
    return false;
  }
}

/**
 * Esegue un comando shell sincrono e ritorna stdout.
 * @param {string} cmd
 * @returns {string}
 */
function exec(cmd) {
  return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' });
}

/**
 * Esegue il commit e il push effettivo.
 * Amend l'ultimo commit se il suo messaggio è già "chore: persist state [bot]",
 * altrimenti crea un nuovo commit. Poi force-pusha.
 */
function doPersist() {
  if (!ensureGitSetup()) return;

  try {
    const files = ['state.json', 'forwarded.json'].filter(f =>
      fs.existsSync(path.join(REPO_ROOT, f))
    );

    if (files.length === 0) return;

    // Aggiungi i file anche se sono in .gitignore (--force)
    exec(`git add --force ${files.join(' ')}`);

    // Controlla se c'è qualcosa da committare
    const status = exec('git status --porcelain').trim();
    if (!status) return; // nessuna modifica

    // Controlla l'ultimo messaggio di commit
    let lastMsg = '';
    try { lastMsg = exec('git log -1 --format=%s').trim(); } catch {}

    if (lastMsg === 'chore: persist state [bot]') {
      exec('git commit --amend --no-edit');
    } else {
      exec('git commit -m "chore: persist state [bot]"');
    }

    exec('git push --force-with-lease origin HEAD');
    console.log('💾 gitPersist: state.json e forwarded.json salvati su GitHub.');
  } catch (err) {
    console.error('❌ gitPersist: errore durante il push:', err.message);
  }
}

/**
 * Schedula un persist debounced.
 * Da chiamare dopo ogni flush su disco di state.json o forwarded.json.
 */
function schedulePersist() {
  if (!process.env.GIT_PERSIST_TOKEN) return; // no-op in locale

  if (debounceTimer) return; // già schedulato
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    doPersist();
  }, DEBOUNCE_MS);
  // NON fare .unref() — vogliamo che il flush avvenga anche se il processo
  // sta per uscire (es. graceful shutdown di Render)
}

/**
 * Forza un persist immediato (da chiamare nel graceful shutdown).
 */
function flushPersist() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  doPersist();
}

module.exports = { schedulePersist, flushPersist };
