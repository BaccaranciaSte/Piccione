// Pigeon and Birds Database (Italian & English)

const BIRDS = [
  // --- ITALIANO ---
  // Piccioni e Colombi
  "piccione", "piccioni", "piccioncino", "piccioncini", "piccioncina", "piccioncine",
  "colombo", "colombi", "colomba", "colombe", "colombaccio", "colombacci", "terraiuolo", "terraiuoli",
  // Uccelli generici e volatili
  "uccello", "uccelli", "uccellino", "uccellini", "uccellaccio", "uccellacci",
  "volatile", "volatili", "pennuto", "pennuti", "rapace", "rapaci", "uccello rapace",
  // Specie di uccelli comuni e specifici
  "passero", "passeri", "rondine", "rondini", "gabbiano", "gabbiani", "aquila", "aquile",
  "falco", "falchi", "gufo", "gufi", "civetta", "civette", "corvo", "corvi",
  "pappagallo", "pappagalli", "canarino", "canarini", "cigno", "cigni", "anatra", "anatre",
  "oca", "oche", "gallina", "galline", "gallo", "galli", "pulcino", "pulcini",
  "tacchino", "tacchini", "pavone", "pavoni", "fenicottero", "fenicotteri", "pinguino", "pinguini",
  "struzzo", "struzzi", "cicogna", "cicogne", "airone", "aironi", "colibrì", "pellicano", "pellicani",
  "avvoltoio", "avvoltoi", "fagiano", "fagiani", "quaglia", "quaglie", "passera", "passere",
  "fringuello", "fringuelli", "cardellino", "cardellini", "merlo", "merli", "pettirosso", "pettirossi",
  "gazza", "gazze", "ghiandaia", "ghiandaie", "storno", "storni", "upupa", "upupe",
  "martin pescatore", "gru", "cormorano", "cormorani", "albatros", "condor", "allocco", "allocchi",
  "barbagianni", "gheppio", "gheppi", "poiana", "poiane", "sparviere", "sparvieri", "nibbio", "nibbi",
  "assiolo", "assioli", "beccaccia", "beccaccie", "folaga", "folaghe", "germano", "germani",
  "tarabuso", "tarabusi", "spatola", "spatole", "piovanello", "piovanelli", "avocetta", "avocette",
  "zafferano", "zafferani", "sterna", "sterne", "beccapesci", "fraticello", "fraticelli",
  "beccaccia di mare", "voltapietre", "corriere", "corrieri", "fratino", "fratini",
  "pavoncella", "pavoncelle", "piviere", "pivieri", "chiurlo", "chiurli", "pittima", "pittime",
  "pantana", "pantane", "pettegola", "pettegole", "piro piro", "combattente", "combattenti",
  "croccolone", "croccoloni", "beccaccino", "beccaccini", "frullino", "frullini", "tortora", "tortore",
  "cuculo", "cuculi", "succiacapre", "rondone", "rondoni", "gruccione", "gruccioni",
  "ghiandaia marina", "torcicollo", "torcicolli", "picchio", "picchi", "allodola", "allodole",
  "calandra", "calandre", "calandrella", "calandrelle", "cappellaccia", "cappellaccie",
  "tottavilla", "tottaville", "prispola", "prispole", "pispola", "pispole", "calandro", "calandri",
  "cutrettola", "cutrettole", "ballerina gialla", "ballerina bianca", "ballerina", "ballerine",
  "merlo acquaiolo", "scricciolo", "scriccioli", "passera scopaiola", "pettazzurro", "pettazzurri",
  "codirosso", "codirossi", "culbianco", "culbianchi", "stiaccino", "stiaccini", "saltimpalo", "saltimpali",
  "monachella", "monachelle", "passero solitario", "cesena", "cesene", "tordo", "tordi",
  "tordela", "tordele", "usignolo", "usignoli", "luì", "luì piccolo", "luì verde", "luì bianco",
  "regolo", "regoli", "fiorrancino", "fiorrancini", "pigliamosche", "balestruccio", "balestrucci",
  "topino", "topini", "sterpazzola", "sterpazzole", "bigia", "bigina", "bigine", "capinera", "capinere",
  "codibugnolo", "codibugnoli", "cinciarella", "cinciarelle", "cinciallegra", "cinciallegre",
  "cincia dal ciuffo", "cincia mora", "cincia bigia", "picchio muratore", "picchio muraiolo",
  "rampichino", "rampichini", "averla", "averle", "nocciolaia", "nocciolaie", "taccola", "taccole",
  "gracchio", "gracchi", "cornacchia", "cornacchie", "passera d'italia", "passera mattugia",
  "peppola", "peppole", "verzellino", "verzellini", "verdone", "verdoni", "lucarino", "lucarini",
  "fanello", "fanelli", "crociere", "crocieri", "ciuffolotto", "ciuffolotti", "frosone", "frosoni",
  "zigolo", "zigoli", "ortolano", "ortolani", "strillozzo", "strillozzi",

  // --- INGLESE ---
  // Pigeons and Doves
  "pigeon", "pigeons", "dove", "doves", "squab", "squabs", "passenger pigeon", "homing pigeon",
  "rock dove", "rock pigeon",
  // Birds generic and poultry
  "bird", "birds", "avian", "avians", "fowl", "fowls", "poultry", "songbird", "songbirds",
  "raptor", "waterfowl", "waterfowls", "seabird", "seabirds",
  // Specific bird species
  "sparrow", "sparrows", "swallow", "swallows", "gull", "gulls", "seagull", "seagulls",
  "eagle", "eagles", "falcon", "falcons", "hawk", "hawks", "owl", "owls", "crow", "crows",
  "raven", "ravens", "parrot", "parrots", "parakeet", "parakeets", "canary", "canaries",
  "swan", "swans", "duck", "ducks", "goose", "geese", "hen", "hens", "chicken", "chickens",
  "rooster", "roosters", "chick", "chicks", "turkey", "turkeys", "peachick", "peafowl", "peacocks",
  "peacock", "flamingo", "flamingos", "penguin", "penguins", "ostrich", "ostriches",
  "stork", "storks", "heron", "herons", "hummingbird", "hummingbirds", "pelican", "pelicans",
  "vulture", "vultures", "pheasant", "pheasants", "quail", "quails", "finch", "finches",
  "blackbird", "blackbirds", "robin", "robins", "magpie", "magpies", "jay", "jays",
  "bluejay", "bluejays", "starling", "starlings", "crane", "cranes", "cormorant", "cormorants",
  "albatross", "albatrosses", "condor", "condors", "kestrel", "kestrels", "buzzard", "buzzards",
  "harrier", "harriers", "osprey", "ospreys", "kite", "kites", "peregrine", "merlin", "merlins",
  "swift", "swifts", "woodpecker", "woodpeckers", "lark", "larks", "nightingale", "nightingales",
  "warbler", "warblers", "chickadee", "chickadees", "titmouse", "nuthatch", "nuthatches",
  "creeper", "creepers", "shrike", "shrikes", "grackle", "grackles", "grosbeak", "grosbeaks",
  "bunting", "buntings"
];

// Pre-compiled regexes for optimization
const BIRD_REGEXES = BIRDS.map(bird => {
  const escaped = bird.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return bird.includes(' ')
    ? new RegExp(escaped, 'i')
    : new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'i');
});

/**
 * Checks if a text contains references to pigeons or other birds.
 *
 * @param {string} text
 * @returns {boolean}
 */
function containsBird(text) {
  if (!text) return false;

  // Normalize: lower case and clean common punctuation
  const cleanText = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&;:{}=\-_`~()?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return BIRD_REGEXES.some(regex => regex.test(cleanText));
}

module.exports = {
  BIRDS,
  containsBird
};
