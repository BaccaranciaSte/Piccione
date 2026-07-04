// Pigeon Brainrot Insults and GIFs Database

const INSULTS = [
  // --- ITALIANO ---
  // Insulti Generici e Parolacce Classiche
  'idiota', 'stupido', 'cretino', 'stronzo', 'bastardo', 'coglione', 'deficiente',
  'scemo', 'merda', 'imbecille', 'pezzo di merda', 'stronza', 'cogliona', 'scema',
  'stupida', 'deficente', 'rincoglionito', 'fallito', 'inutile', 'cretina',
  'pirla', 'sfigato', 'testa di cazzo', 'vaffanculo', 'fanculo', 'rompipalle',
  'cagare', 'fai schifo', 'fai pena', 'cesso', 'capra', 'leccaculo', 'pollaio',
  'tonto', 'tonta', 'handicappato', 'ritardato', 'cretinetti',
  'coglionazzo', 'stronzetto', 'stronzetta', 'scemotto', 'idiotina', 'sottomesso',
  'infame', 'viscido', 'traditore', 'parassita', 'maledetto', 'maledetta',
  'schifoso', 'schifosa', 'merdoso', 'merdosa', 'coglionazza', 'rincoglionita',
  'perdente', 'segaiolo', 'pippa', 'pippa al sugo', 'merdina', 'pezzente',
  'stronzaggine', 'imbecillità', 'figlio di puttana', 'troia', 'puttana',
  'scimunito', 'scimunita', 'fessacchiotto', 'fesso', 'fessa',
  'imbecilli', 'scemi', 'cretini', 'stronzi', 'coglioni', 'idioti', 'stupidi',
  'ridicolo', 'ridicola', 'patetico', 'patetica', 'incompetente',
  'stai zitto', 'taci', 'zitto', 'zitta', 'silenzio',

  // --- Nuove Varianti Italiane Estese (Maschili, Femminili, Plurali, Scorrette e Parziali) ---
  // Stronzo
  'stronze', 'stronzetti', 'stronzette', 'stronzaccio', 'stronzaccia', 'stronzoni', 'stronzone',
  'stronzata', 'stronzate', 'stronz', 'str0nzo', 'str0nza', 'str0nzi', 'str0nze', 'str0nz0',
  'str*nzo', 'str*nza', 'str*nzi', 'str*nze', 'str***o', 'str***a', 'str***i', 'str***e',
  // Coglione
  'coglione', 'cogliona', 'coglioni', 'coglione', 'coglionazzo', 'coglionazza', 'coglionazzi',
  'coglionazze', 'coglionata', 'coglionate', 'coglioneria', 'cogl', 'coglion', 'c0glione',
  'c0gliona', 'c0glioni', 'c0glione', 'c0gl1one', 'c*glione', 'c*glioni', 'c***ione', 'c***ioni',
  // Idiota
  'idiote', 'idiotina', 'idiotino', 'idiotine', 'idiotini', 'idiotismo', 'idiot', 'idota',
  // Cretino
  'cretine', 'cretinetti', 'cretinetto', 'cretinata', 'cretinate', 'cretin', 'cret1no', 'cret1na',
  // Stupido
  'stupide', 'stupidino', 'stupidina', 'stupidini', 'stupidine', 'stupidità', 'stupideria',
  'stupid', 'stupito', 'stupita', 'stupto', 'stupta',
  // Imbecille
  'imbecillità', 'imbecil', 'imbecile',
  // Deficiente (con varianti scorrette)
  'deficienti', 'deficente', 'deficenti', 'defic', 'deficent', 'defecente',
  // Scemo
  'sceme', 'scemotto', 'scemotta', 'scemotti', 'scemotte', 'scemenza', 'scemenze', 'scem',
  // Bastardo
  'bastarde', 'bastardata', 'bastardate', 'bastardone', 'bastardoni', 'bastard', 'b*stardo',
  'b*starda', 'b@stardo', 'b@starda', 'b***ardo', 'b***arda',
  // Sfigato
  'sfigate', 'sfigatone', 'sfigatona', 'sfigatoni', 'sfigatone', 'sfigat', 'sfig',
  // Ritardato
  'ritardate', 'ritardatello', 'ritardatella', 'ritardat', 'r1tardato', 'r1tardata', 'r*tardato', 'r*tardata',
  // Handicappato
  'handicappata', 'handicappati', 'handicappate', 'andicappato', 'andicappata', 'andicappati', 'andicappate',
  // Fesso
  'fessi', 'fesse', 'fessacchiotta', 'fessacchiotti', 'fessacchiotte',
  // Rincoglionito
  'rincoglionita', 'rincoglioniti', 'rincoglionite', 'rincoglionit', 'rincogl',
  // Rincretinito / Rincitrullito
  'rincretinito', 'rincretinita', 'rincretiniti', 'rincretinite', 'rincitrullito', 'rincitrullita',
  'rincitrulliti', 'rincitrullite',
  // Schifoso
  'schifose', 'schifosi', 'schifezza', 'schifezze',
  // Merda
  'merde', 'merdosi', 'merdose', 'merdina', 'merdine', 'merdaccia', 'merdacce', 'mrd', 'mrda',
  'merd', 'm*rda', 'm3rda', 'merd*', 'm***a',
  // Troia / Puttana / Zoccola / Mignotta e derivati
  'troie', 'troietta', 'troiette', 'troione', 'troioni', 'troiaccia', 'troiacce', 'troj', 'troja',
  'troje', 'tr*ia', 'tr*ie', 'tr***a', 'tr0ia', 'tr01a', 'puttane', 'puttanella', 'puttanelle',
  'puttanone', 'puttanoni', 'puttanata', 'puttanate', 'puttanaccia', 'putt', 'putan', 'putana',
  'putane', 'puttan', 'p*ttana', 'putt*na', 'p***ana', 'p**tana', 'zoccola', 'zoccole',
  'zoccoletta', 'zoccolette', 'zoccolona', 'zoccoloni', 'mignotta', 'mignotte', 'mignottone',
  'mignottoni', 'cagna', 'cagne', 'cagnetta', 'cagnette', 'bagascia', 'bagasce', 'baldracca', 'baldracche',
  // Omofobi / Insulti di genere sessuale
  'frocio', 'froci', 'frocione', 'frocioni', 'frocetto', 'frocetti', 'froc*o', 'fr*cio', 'fr0cio',
  'fr0c10', 'ricchione', 'ricchioni', 'finocchio', 'finocchi', 'culattone', 'culattoni', 'culatton',
  // Cazzo / Minchia / Figa
  'cazzo', 'cazzi', 'cazzone', 'cazzona', 'cazzoni', 'cazzata', 'cazzate', 'incazzato',
  'incazzata', 'incazzati', 'incazzate', 'cazz', 'kazzo', 'kazzi', 'cazz0', 'c4zzo', 'c@zzo',
  'c***o', 'c**zo', 'caz*o', 'cazz*', 'c***i', 'figa', 'fighe', 'fica', 'fiche', 'fighetta',
  'fighette', 'minchia', 'minchie', 'minchione', 'minchiona', 'minchioni',
  // Altri insulti e composti
  'leccaculo', 'leccapiedi', 'leccacazzo', 'leccafica', 'segaiolo', 'segaiola', 'segaioli',
  'segaiole', 'pippa', 'pippe', 'pezzente', 'pezzenti', 'infame', 'infami', 'viscido',
  'viscida', 'viscidi', 'viscide', 'perdente', 'perdenti', 'fallito', 'fallita', 'falliti',
  'fallite', 'inutile', 'inutili', 'patetico', 'patetica', 'patetici', 'patetiche', 'ridicolo',
  'ridicola', 'ridicoli', 'ridicole', 'incompetente', 'incompetenti', 'scimunito', 'scimunita',
  'scimuniti', 'scimunite', 'tonto', 'tonta', 'tonti', 'tonte', 'babbaleo', 'babbalei',
  'babbosa', 'babboso', 'babbosi', 'babbose', 'bimbominchia', 'bimbeminchia', 'bimbominkia',
  'bimbeminkia', 'bm', 'cazzaro', 'cazzara', 'cazzari', 'cazzare', 'cornuto', 'cornuta',
  'cornuti', 'cornute', 'depensante', 'depensanti', 'disadattato', 'disadattata', 'disadattati',
  'disadattate', 'frustrato', 'frustrata', 'frustrati', 'frustrate', 'ignorante', 'ignoranti',
  'pappone', 'papponi', 'parassita', 'parassiti', 'rompiballe', 'rompicoglioni', 'rompipalle',
  'rompiscatole', 'somaro', 'somara', 'somari', 'somare', 'sottosviluppato', 'sottosviluppata',
  'sottosviluppati', 'sottosviluppate', 'verme', 'vermi', 'zecca', 'zecche', 'zotico', 'zotica',
  'zotici', 'zotiche', 'zoticone', 'zoticona', 'zoticoni', 'zoticone',
  'figlio di puttana', 'figlia di puttana', 'figli di puttana', 'figlie di puttana',
  'figliodiputtana', 'figliadiputtana', 'figlidiputtana', 'figliediputtana', 'figlioditroia',
  'figliaditroia', 'figliditroia', 'figlieditroia', 'figliodicania', 'figliodicane', 'figliodicana',
  'figliadicane', 'pezzodimerda', 'pezzo di merda', 'pezzodimerd', 'pezzo di m',
  'vaffanculo', 'fanculo', 'vaffancul', 'fancul', 'fankulo', 'vaffankulo', 'fanculo',
  'fancul0', 'vaffancul0', 'vaffan', 'vaff*nculo', 'vaffanc*lo', 'f*nculo', 'f***ulo',

  // --- INGLESE ---
  // Common insults, swear words, and dismissive terms
  'idiot', 'stupid', 'dumb', 'asshole', 'bitch', 'bastard', 'moron', 'fool',
  'crap', 'useless', 'clown', 'lame', 'jerk', 'trash', 'garbage', 'loser',
  'dickhead', 'dipshit', 'dumbass', 'shut up', 'stfu', 'suck', 'sucks',
  'idiotic', 'brainless', 'moronic', 'worthless', 'imbecile', 'pig', 'douche',
  'douchebag', 'creep', 'ass', 'cunt', 'motherfucker', 'son of a bitch',
  'piece of shit', 'wanker', 'twit', 'nitwit', 'scum', 'scumbag', 'pathetic',
  'dumbfuck', 'fuck', 'fucker', 'fuckoff', 'bullshit', 'shitty', 'jackass',
  'numbskull', 'sucker', 'retard', 'bastards', 'losers', 'dumbest', 'brain dead',
  'braindead', 'pointless', 'lameass', 'dipstick', 'dimwit', 'halfwit',
  'shithead', 'jerkoff', 'piss off', 'pissing', 'fuckface', 'asswipe',
  'asshat', 'dirtbag', 'silly', 'crappy', 'nonsense',
  // Masked English
  'f*ck', 'f**k', 'sh*t', 'b*tch', 'c*nt', 'a**hole', 'm*therfucker'
];

const BRAINROT_GIFS = [
  // Una ricca collezione di GIF
  'https://tenor.com/oCGY2Byq1yB.gif',
  'https://tenor.com/iCxvphx1rH6.gif',
  'https://tenor.com/rTo4pT6TYzg.gif',
  'https://tenor.com/jJaJqkJEUCW.gif',
  'https://tenor.com/qylkpP4cCJF.gif',
  'https://tenor.com/tK6jf1fpOKn.gif',
  'https://tenor.com/mUdU6PhABjZ.gif',
  'https://tenor.com/b0XJB.gif',
  'https://tenor.com/idaxvClFeOK.gif',
  'https://tenor.com/t45fV3mVKR4.gif',
  'https://tenor.com/bEQPv.gif',
  'https://tenor.com/rscLOdXsUCK.gif',
  'https://tenor.com/kpGvAF0uG7E.gif',
  'https://tenor.com/cFk5AU8hRWM.gif',
  'https://tenor.com/vKAhvp5oSnd.gif',
  'https://tenor.com/ePkaYD1aQy2.gif',
  'https://tenor.com/skSy8twSXXU.gif',
  'https://tenor.com/bIapE.gif',
  'https://tenor.com/cRqqlSjStws.gif',
  'https://tenor.com/vTdEIhIPQMC.gif',
  'https://tenor.com/sE7ahBqwptB.gif',
  'https://tenor.com/brH5i.gif',
  'https://tenor.com/cMdOJJHSTOQ.gif'
];

// ─── Lista Bestemmie Italiane ─────────────────────────────────────────────────
const BESTEMMIE = [
  // ── Dio ────────────────────────────────────────────────────────────────────
  'porco dio', 'porca dio', 'dio porco', 'dio porca', 'porcodio', 'porca iddio', 'porco iddio',
  'dio cane', 'cane di dio', 'dio can',
  'dio bestia', 'bestia di dio',
  'dio boia', 'boia dio',
  'dio ladro', 'ladro di dio',
  'dio maiale', 'maiale di dio',
  'dio matto', 'dio matta',
  'dio cornuto', 'dio cornuta',
  'dio assassino',
  'dio del cazzo',
  'sangue di dio', 'sangue de dio',
  'vaffanculo dio', 'fanculo dio',
  'cazzo di dio', 'minchia di dio',
  'maledetto dio', 'maledetta dio',
  'perdio', 'per dio',
  'porco diddio', 'porca diddio',
  'dio porco maiale',
  'dio animale',
  'dio troione',
  'dio figlio di puttana',
  'dio bastardo',
  'porco zio',
  // ── Gesù / Cristo ──────────────────────────────────────────────────────────
  'porco gesù', 'gesù porco',
  'gesùcristo', 'gesù cristo',
  'porco gesù cristo', 'gesù cristo porco',
  'cristo porco', 'porco cristo',
  'cristo cane', 'cristo bestia', 'cristo boia',
  'cristo ladro', 'cristaccio',
  'sangue di cristo', 'sangue de cristo',
  'corpo di cristo',
  'vaffanculo cristo', 'fanculo cristo',
  'cazzo di cristo', 'minchia di cristo',
  'gesù mio', 'gesù di dio',
  'cristo dio cane',
  // ── Madonna / Maria / Vergine ───────────────────────────────────────────────
  'porca madonna', 'madonna porca', 'porcamadonna',
  'madonna puttana', 'puttana madonna',
  'madonna troia', 'troia madonna',
  'madonna cane', 'madonna bestia',
  'madonna boia', 'boia madonna',
  'madonna ladra', 'ladra madonna',
  'madonna cornuta', 'cornuta madonna',
  'vaffanculo madonna', 'fanculo madonna',
  'cazzo di madonna', 'minchia di madonna',
  'santa madonna porco',
  'maria puttana', 'maria troia',
  'vergine puttana', 'vergine troia', 'vergine cane',
  'santa maria puttana',
  'madonna di dio', 'madonna de dio',
  'santa madonna cane',
  'santa madre di dio cane',
  'porca la madonna',
  // ── Ostia / Sacramento ─────────────────────────────────────────────────────
  'porca ostia', 'ostia porca', 'santa ostia',
  'ostia consacrata', 'ostiaccia',
  'porco sacramento', 'porca sacramento',
  'sacramento di dio',
  'sacrament',
  // ── Combinazioni miste e regionali ─────────────────────────────────────────
  'porco giuda', 'sangue di giuda',
  'porco spirito', 'spirito porco', 'porco spirito santo',
  'sangue della madonna',
  'corpo del signore porco',
  'porco iddio cane',
  'porca eva',
  'porco boia',
  'dio di merda', 'gesù di merda', 'madonna di merda', 'cristo di merda',
  'dio porco ladro', 'madonna porco ladro',
  'dio boia cane',
  // ── Varianti scritte compatte (spesso usate online) ────────────────────────
  'porcoddio', 'porcamaronn', 'porcamadonn',
  'gesùcristocane', 'gesùcristoporco',
  'porcamad',
  'madonnacane',
  'dioboia',
  'diocane', 'dioporco',
  'cristoporco', 'cristocane',
  'porcobastardo dio',
  'diomadonna',

  // ── Nuove Estensioni Bestemmie (Leetspeak, Abbreviazioni, Mascherate) ──────
  // Dio Leetspeak / Mascherate
  'dio c4ne', 'dioc4ne', 'dio c@ne', 'dioc@ne', 'd1o cane', 'd1ocane', 'd1oc4ne', 'd1ok4ne',
  'dio ma1ale', 'dioma1ale', 'd1omaiale', 'dio bo1a', 'diobo1a', 'd1oboia', 'd1oladro', 'd1obestia',
  'd1obastardo', 'd1oporco', 'd1oporc0', 'porc0 dio', 'porco di0', 'porc0 di0', 'porcodi0',
  'porc0d10', 'porc0dio', 'porcod10', 'dio porc0', 'dioporc0',
  // Madonna / Maria Leetspeak / Mascherate
  'porca mad0nna', 'porcamad0nna', 'porca madnna', 'porcamadnna', 'madonna c4ne', 'madonnac4ne',
  'madonna maiala', 'madonnamaiala', 'madonna maiale', 'madonnamaiale', 'madonna vacca',
  'madonnavacca', 'madonna cagna', 'madonnacagna', 'madonna schifosa', 'madonnaschifosa',
  'madonna infame', 'madonnainfame', 'madonna bastarda', 'madonnabastarda', 'madonna di merda',
  'madonnadimerda', 'maria maiala', 'mariamaiala', 'maria zoccola', 'mariazoccola', 'maria cagna',
  'mariacagna', 'vergine maiala', 'verginemaiala', 'vergine zoccola', 'verginezoccola',
  'porca m*****a', 'porca mad', 'porcamar',
  // Gesù / Cristo Leetspeak / Mascherate
  'porco gesu', 'porcogesu', 'gesu porco', 'gesuporco', 'gesu cane', 'gesucane', 'gesù cane',
  'gesùcane', 'gesu ladro', 'gesuladro', 'gesù ladro', 'gesùladro', 'gesu boia', 'gesuboia',
  'gesù boia', 'gesùboia', 'gesu maiale', 'gesumaiale', 'gesù maiale', 'gesùmaiale', 'gesu bastardo',
  'gesubastardo', 'gesù bastardo', 'gesùbastardo', 'gesu stronzo', 'gesustronzo', 'gesù stronzo',
  'gesùstronzo', 'gesu merda', 'gesumerda', 'gesù merda', 'gesùmerda', 'gesu di merda',
  'gesudimerda', 'gesù di merda', 'gesùdimerda', 'gesu cristo cane', 'gesucristocane',
  'gesù cristo cane', 'gesùcristocane', 'gesucristoporco', 'gesùcristoporco', 'cristo c4ne',
  'cristoc4ne', 'cristo p0rc0', 'cristop0rc0', 'porco cristo', 'porcocristo',
  // Ostia Leetspeak / Mascherate
  'porca ostia', 'porcaostia', 'ostia porca', 'ostiaporca', 'ostia cane', 'ostiacane',
  'ostia c4ne', 'ostiac4ne', 'ostia maiala', 'ostiamaiala', 'ostia puttana', 'ostiaputtana',
  'ostia troia', 'ostiatroia', 'ostia di merda', 'ostiadimerda', 'porco sacramento',
  'porcosacramento', 'porca sacramento', 'porcasacramento',
  // Spirito Santo
  'porco spirito santo', 'porcospiritosanto', 'spirito santo porco', 'spiritosantoporco',
  'spirito santo cane', 'spiritosantocane', 'spirito santo maiale', 'spiritosantomaiale',
  'spirito santo puttana', 'spiritosantoputtana', 'spirito santo troia', 'spiritosantotroia',
  // Abbreviazioni e Compatti Online
  'porcod', 'porcam', 'dioc', 'diop', 'diob', 'diol', 'diom', 'diostronzo', 'diocan', 'diokan',
  'pdio', 'pmadonna', 'pmadonn', 'pcristo', 'pgesu', 'diocne', 'diocn', 'diocanè', 'diocàn',
  'pd', 'pm', 'dc', 'db', 'dp', 'p.d.', 'p.m.', 'd.c.', 'd.b.',
  // Mascherate con Asterischi
  'd*o cane', 'd*o porco', 'd*o bastardo', 'd*o maiale', 'd*o boia', 'd*o ladro', 'd*o bestia',
  'd*o stronzo', 'd*o merda', 'd*o infame', 'porco d*o', 'porco d**', 'porca m*donna', 'porca mad*nna',
  'dio c***e', 'dioc**e', 'dioc***', 'dio c**', 'dio p***o', 'diop***o', 'diop**co'
];

// ─── Regex pre-compilate a livello di modulo ─────────────────────────────────
// Costruite UNA SOLA VOLTA all'avvio, non ad ogni chiamata di containsInsult/containsBestemmia.
// Riduce significativamente il carico sul GC in server con molti messaggi.
const INSULT_REGEXES = INSULTS.map(insult => {
  const escaped = insult.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return insult.includes(' ')
    ? new RegExp(escaped, 'i')
    : new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'i');
});

const BESTEMMIA_REGEXES = BESTEMMIE.map(bestemmia => {
  const escaped = bestemmia.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return bestemmia.includes(' ')
    ? new RegExp(escaped, 'i')
    : new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'i');
});

/**
 * Verifica se un testo contiene insulti o frasi offensive dalla collezione.
 * Utilizza lookarounds per evitare falsi positivi.
 *
 * @param {string} text
 * @returns {boolean}
 */
function containsInsult(text) {
  if (!text) return false;

  // Rimuove la punteggiatura più comune e normalizza in minuscolo (mantiene gli asterischi)
  const cleanText = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&;:{}=\-_`~()?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return INSULT_REGEXES.some(regex => regex.test(cleanText));
}

/**
 * Verifica se un testo contiene bestemmie italiane.
 * Usa corrispondenza esatta (con spazi/lookarounds) per ridurre i falsi positivi.
 *
 * @param {string} text
 * @returns {boolean}
 */
function containsBestemmia(text) {
  if (!text) return false;

  // Normalizza: lowercase, rimuove punteggiatura, normalizza spazi (mantiene asterischi e chiocciole)
  const cleanText = text
    .toLowerCase()
    .replace(/[.,!?;:'"\-_\(\)\[\]\{\}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return BESTEMMIA_REGEXES.some(regex => regex.test(cleanText));
}

/**
 * Verifica se un testo è un'urla (carattere ripetuto 5+ volte consecutivamente).
 * Rileva solo urla in maiuscolo tipo "AAAAAAAA", "NOOOOOO", ecc.
 *
 * @param {string} text
 * @returns {boolean}
 */
function isScream(text) {
  if (!text) return false;
  // Rimuove spazi per il conteggio consecutivo
  const stripped = text.replace(/\s/g, '');
  if (stripped.length < 5) return false;
  // Un carattere ripetuto almeno 5 volte di fila (solo lettere maiuscole)
  return /([A-ZÀÈÌÒÙÉ])\1{4,}/.test(stripped);
}

/**
 * Verifica se un testo è un "wow" o sue varianti (es. wow, woooow, w0w).
 *
 * @param {string} text
 * @returns {boolean}
 */
function isWow(text) {
  if (!text) return false;
  return /\b[wW]+[oO0]+[wW]+\b/i.test(text);
}

module.exports = {
  INSULTS,
  BRAINROT_GIFS,
  BESTEMMIE,
  containsInsult,
  containsBestemmia,
  isScream,
  isWow,
};
