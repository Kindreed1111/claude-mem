(() => {
  'use strict';

  /* =========================================================
     CONFIG
     ========================================================= */
  const DD = 'https://ddragon.leagueoflegends.com';
  const HUMOR_DIR = './humor-bank/';
  const HUMOR_EXTS = ['png', 'jpg', 'webp'];
  const AFTER_WIN = 15;          // cartes visibles après la carte gagnante
  const START_AT = 10;           // index logique de départ (carte centrée au repos)
  const DURATION = { blue: 4300, red: 5100 };
  const SETTLE_MS = 380;
  const TICK_MIN_GAP = 28;
  const PRELOAD_TIMEOUT = 3000;  // ms max par source d'image au préchargement

  // Roster de secours (Data Dragon 16.22.1, fr_FR) si l'API est inaccessible
  const OFFLINE_VERSION = '16.22.1';
  const OFFLINE_ROSTER = [{"id": "Aatrox", "name": "Aatrox", "title": "Épée des Darkin", "tags": ["Fighter"]}, {"id": "Ahri", "name": "Ahri", "title": "Renarde à neuf queues", "tags": ["Mage", "Assassin"]}, {"id": "Akali", "name": "Akali", "title": "Assassine rebelle", "tags": ["Assassin"]}, {"id": "Akshan", "name": "Akshan", "title": "Sentinelle rebelle", "tags": ["Marksman", "Assassin"]}, {"id": "Alistar", "name": "Alistar", "title": "Minotaure", "tags": ["Tank", "Support"]}, {"id": "Ambessa", "name": "Ambessa", "title": "Matriarche de guerre", "tags": ["Fighter", "Assassin"]}, {"id": "Amumu", "name": "Amumu", "title": "Momie mélancolique", "tags": ["Tank", "Support"]}, {"id": "Anivia", "name": "Anivia", "title": "Cryophénix", "tags": ["Mage"]}, {"id": "Annie", "name": "Annie", "title": "Enfant des ténèbres", "tags": ["Mage", "Support"]}, {"id": "Aphelios", "name": "Aphelios", "title": "Arme des Lunaris", "tags": ["Marksman"]}, {"id": "Ashe", "name": "Ashe", "title": "Archère de givre", "tags": ["Marksman", "Support"]}, {"id": "AurelionSol", "name": "Aurelion Sol", "title": "Forgeur d'étoiles", "tags": ["Mage"]}, {"id": "Aurora", "name": "Aurora", "title": "Sorcière d'entre les mondes", "tags": ["Mage", "Assassin"]}, {"id": "Azir", "name": "Azir", "title": "Empereur des sables", "tags": ["Mage", "Marksman"]}, {"id": "Bard", "name": "Bard", "title": "Gardien errant", "tags": ["Support", "Mage"]}, {"id": "Belveth", "name": "Bel'Veth", "title": "Impératrice du Néant", "tags": ["Fighter"]}, {"id": "Blitzcrank", "name": "Blitzcrank", "title": "Golem de vapeur", "tags": ["Tank", "Support"]}, {"id": "Brand", "name": "Brand", "title": "Vengeur flamboyant", "tags": ["Mage", "Support"]}, {"id": "Braum", "name": "Braum", "title": "Cœur de Freljord", "tags": ["Tank", "Support"]}, {"id": "Briar", "name": "Briar", "title": "Faim insatiable", "tags": ["Fighter", "Assassin"]}, {"id": "Caitlyn", "name": "Caitlyn", "title": "Shérif de Piltover", "tags": ["Marksman"]}, {"id": "Camille", "name": "Camille", "title": "Ombre d'acier", "tags": ["Fighter", "Assassin"]}, {"id": "Cassiopeia", "name": "Cassiopeia", "title": "Étreinte du serpent", "tags": ["Mage"]}, {"id": "Chogath", "name": "Cho'Gath", "title": "Terreur noire", "tags": ["Tank", "Mage"]}, {"id": "Corki", "name": "Corki", "title": "Artilleur téméraire", "tags": ["Marksman", "Mage"]}, {"id": "Darius", "name": "Darius", "title": "Main de Noxus", "tags": ["Fighter", "Tank"]}, {"id": "Diana", "name": "Diana", "title": "Mépris de la lune", "tags": ["Fighter", "Assassin"]}, {"id": "DrMundo", "name": "Dr. Mundo", "title": "Dément de Zaun", "tags": ["Tank", "Fighter"]}, {"id": "Draven", "name": "Draven", "title": "Glorieux exécuteur", "tags": ["Marksman"]}, {"id": "Ekko", "name": "Ekko", "title": "Fractureur du temps", "tags": ["Assassin", "Mage"]}, {"id": "Elise", "name": "Elise", "title": "Reine araignée", "tags": ["Assassin", "Mage"]}, {"id": "Evelynn", "name": "Evelynn", "title": "Démon sadique", "tags": ["Assassin", "Mage"]}, {"id": "Ezreal", "name": "Ezreal", "title": "Explorateur prodigue", "tags": ["Marksman", "Mage"]}, {"id": "Fiddlesticks", "name": "Fiddlesticks", "title": "Effroi nocturne", "tags": ["Mage", "Support"]}, {"id": "Fiora", "name": "Fiora", "title": "Sublime bretteuse", "tags": ["Fighter", "Assassin"]}, {"id": "Fizz", "name": "Fizz", "title": "Filou des mers", "tags": ["Assassin", "Fighter"]}, {"id": "Galio", "name": "Galio", "title": "Colosse", "tags": ["Tank", "Mage"]}, {"id": "Gangplank", "name": "Gangplank", "title": "Fléau des mers", "tags": ["Fighter"]}, {"id": "Garen", "name": "Garen", "title": "Force de Demacia", "tags": ["Fighter", "Tank"]}, {"id": "Gnar", "name": "Gnar", "title": "Chaînon manquant", "tags": ["Fighter", "Tank"]}, {"id": "Gragas", "name": "Gragas", "title": "Agitateur", "tags": ["Fighter", "Mage"]}, {"id": "Graves", "name": "Graves", "title": "Hors-la-loi", "tags": ["Marksman"]}, {"id": "Gwen", "name": "Gwen", "title": "Couturière sacrée", "tags": ["Fighter"]}, {"id": "Hecarim", "name": "Hecarim", "title": "Ombre de la guerre", "tags": ["Fighter", "Tank"]}, {"id": "Heimerdinger", "name": "Heimerdinger", "title": "Inventeur réputé", "tags": ["Mage", "Support"]}, {"id": "Hwei", "name": "Hwei", "title": "Visionnaire", "tags": ["Mage", "Support"]}, {"id": "Illaoi", "name": "Illaoi", "title": "Prêtresse du kraken", "tags": ["Fighter", "Tank"]}, {"id": "Irelia", "name": "Irelia", "title": "Danseuse des lames", "tags": ["Fighter", "Assassin"]}, {"id": "Ivern", "name": "Ivern", "title": "Aîné de la forêt", "tags": ["Support", "Mage"]}, {"id": "Janna", "name": "Janna", "title": "Avatar de l'air", "tags": ["Support", "Mage"]}, {"id": "JarvanIV", "name": "Jarvan IV", "title": "Exemple demacien", "tags": ["Fighter", "Tank"]}, {"id": "Jax", "name": "Jax", "title": "Maître d'armes", "tags": ["Fighter"]}, {"id": "Jayce", "name": "Jayce", "title": "Protecteur du futur", "tags": ["Fighter", "Marksman"]}, {"id": "Jhin", "name": "Jhin", "title": "Virtuose", "tags": ["Marksman", "Mage"]}, {"id": "Jinx", "name": "Jinx", "title": "Gâchette folle", "tags": ["Marksman"]}, {"id": "KSante", "name": "K'Santé", "title": "Fierté de Nazumah", "tags": ["Tank", "Fighter"]}, {"id": "Kaisa", "name": "Kai'Sa", "title": "Fille du Néant", "tags": ["Marksman", "Mage"]}, {"id": "Kalista", "name": "Kalista", "title": "Lance de la vengeance", "tags": ["Marksman"]}, {"id": "Karma", "name": "Karma", "title": "Sagesse incarnée", "tags": ["Mage", "Support"]}, {"id": "Karthus", "name": "Karthus", "title": "Liche", "tags": ["Mage"]}, {"id": "Kassadin", "name": "Kassadin", "title": "Chasseur du Néant", "tags": ["Assassin", "Mage"]}, {"id": "Katarina", "name": "Katarina", "title": "Lame sinistre", "tags": ["Assassin", "Mage"]}, {"id": "Kayle", "name": "Kayle", "title": "Vertueuse", "tags": ["Marksman", "Mage"]}, {"id": "Kayn", "name": "Kayn", "title": "Faucheur de l'ombre", "tags": ["Fighter", "Assassin"]}, {"id": "Kennen", "name": "Kennen", "title": "Cœur de la tempête", "tags": ["Mage"]}, {"id": "Khazix", "name": "Kha'Zix", "title": "Faucheur du Néant", "tags": ["Assassin"]}, {"id": "Kindred", "name": "Kindred", "title": "Chasseurs éternels", "tags": ["Marksman"]}, {"id": "Kled", "name": "Kled", "title": "Cavalier colérique", "tags": ["Fighter"]}, {"id": "KogMaw", "name": "Kog'Maw", "title": "Gueule des abysses", "tags": ["Marksman", "Mage"]}, {"id": "Leblanc", "name": "LeBlanc", "title": "Manipulatrice", "tags": ["Assassin", "Mage"]}, {"id": "LeeSin", "name": "Lee Sin", "title": "Moine aveugle", "tags": ["Fighter", "Assassin"]}, {"id": "Leona", "name": "Leona", "title": "Aube radieuse", "tags": ["Tank", "Support"]}, {"id": "Lillia", "name": "Lillia", "title": "Fleur timide", "tags": ["Fighter", "Mage"]}, {"id": "Lissandra", "name": "Lissandra", "title": "Sorcière de glace", "tags": ["Mage"]}, {"id": "Locke", "name": "Locke", "title": "Exorciste cendré", "tags": ["Assassin", "Mage"]}, {"id": "Lucian", "name": "Lucian", "title": "Purificateur", "tags": ["Marksman", "Assassin"]}, {"id": "Lulu", "name": "Lulu", "title": "Sorcière féérique", "tags": ["Support", "Mage"]}, {"id": "Lux", "name": "Lux", "title": "Dame de lumière", "tags": ["Mage", "Support"]}, {"id": "Malphite", "name": "Malphite", "title": "Éclat du monolithe", "tags": ["Tank", "Mage"]}, {"id": "Malzahar", "name": "Malzahar", "title": "Prophète du Néant", "tags": ["Mage"]}, {"id": "Maokai", "name": "Maokai", "title": "Tréant torturé", "tags": ["Tank", "Support"]}, {"id": "MasterYi", "name": "Maître Yi", "title": "Fine lame Wuju", "tags": ["Fighter", "Assassin"]}, {"id": "Mel", "name": "Mel", "title": "Reflet de l'âme", "tags": ["Mage", "Support"]}, {"id": "Milio", "name": "Milio", "title": "Douce flamme", "tags": ["Support", "Mage"]}, {"id": "MissFortune", "name": "Miss Fortune", "title": "Chasseuse de primes", "tags": ["Marksman", "Mage"]}, {"id": "Mordekaiser", "name": "Mordekaiser", "title": "Revenant de fer", "tags": ["Fighter", "Mage"]}, {"id": "Morgana", "name": "Morgana", "title": "Déchue", "tags": ["Support", "Mage"]}, {"id": "Naafiri", "name": "Naafiri", "title": "la meute de fer", "tags": ["Assassin", "Fighter"]}, {"id": "Nami", "name": "Nami", "title": "Aquamancienne", "tags": ["Support", "Mage"]}, {"id": "Nasus", "name": "Nasus", "title": "Gardien des sables", "tags": ["Fighter", "Tank"]}, {"id": "Nautilus", "name": "Nautilus", "title": "Titan des profondeurs", "tags": ["Tank", "Support"]}, {"id": "Neeko", "name": "Neeko", "title": "Caméléon curieux", "tags": ["Mage", "Support"]}, {"id": "Nidalee", "name": "Nidalee", "title": "Chasseresse bestiale", "tags": ["Assassin", "Mage"]}, {"id": "Nilah", "name": "Nilah", "title": "Joie incarnée", "tags": ["Fighter", "Assassin"]}, {"id": "Nocturne", "name": "Nocturne", "title": "Éternel cauchemar", "tags": ["Fighter", "Assassin"]}, {"id": "Nunu", "name": "Nunu et Willump", "title": "Le Garçon et son yéti", "tags": ["Tank", "Mage"]}, {"id": "Olaf", "name": "Olaf", "title": "Berzerker", "tags": ["Fighter", "Tank"]}, {"id": "Orianna", "name": "Orianna", "title": "Demoiselle mécanique", "tags": ["Mage", "Support"]}, {"id": "Ornn", "name": "Ornn", "title": "Dieu de la forge volcanique", "tags": ["Tank"]}, {"id": "Pantheon", "name": "Pantheon", "title": "Lance éternelle", "tags": ["Fighter", "Assassin"]}, {"id": "Poppy", "name": "Poppy", "title": "Gardienne du marteau", "tags": ["Tank", "Fighter"]}, {"id": "Pyke", "name": "Pyke", "title": "Éventreur des abysses", "tags": ["Support", "Assassin"]}, {"id": "Qiyana", "name": "Qiyana", "title": "Impératrice des éléments", "tags": ["Assassin"]}, {"id": "Quinn", "name": "Quinn", "title": "Ailes de Demacia", "tags": ["Marksman", "Assassin"]}, {"id": "Rakan", "name": "Rakan", "title": "Charmeur", "tags": ["Support"]}, {"id": "Rammus", "name": "Rammus", "title": "Tatou blindé", "tags": ["Tank"]}, {"id": "RekSai", "name": "Rek'Sai", "title": "Traqueuse du Néant", "tags": ["Fighter", "Tank"]}, {"id": "Rell", "name": "Rell", "title": "Cavalière de fer", "tags": ["Tank", "Support"]}, {"id": "Renata", "name": "Renata Glasc", "title": "Baronne de la chimie", "tags": ["Support", "Mage"]}, {"id": "Renekton", "name": "Renekton", "title": "Dévoreur des sables", "tags": ["Fighter", "Tank"]}, {"id": "Rengar", "name": "Rengar", "title": "Fier traqueur", "tags": ["Assassin", "Fighter"]}, {"id": "Riven", "name": "Riven", "title": "Exilée brisée", "tags": ["Fighter", "Assassin"]}, {"id": "Rumble", "name": "Rumble", "title": "Menace mécanisée", "tags": ["Fighter", "Mage"]}, {"id": "Ryze", "name": "Ryze", "title": "Mage runique", "tags": ["Mage"]}, {"id": "Samira", "name": "Samira", "title": "Rose du désert", "tags": ["Marksman", "Assassin"]}, {"id": "Sejuani", "name": "Sejuani", "title": "Fureur du nord", "tags": ["Tank"]}, {"id": "Senna", "name": "Senna", "title": "Rédemptrice", "tags": ["Support", "Marksman"]}, {"id": "Sett", "name": "Sett", "title": "Patron", "tags": ["Fighter", "Tank"]}, {"id": "Shaco", "name": "Shaco", "title": "Bouffon des ténèbres", "tags": ["Assassin"]}, {"id": "Shen", "name": "Shen", "title": "Œil du crépuscule", "tags": ["Tank"]}, {"id": "Shyvana", "name": "Shyvana", "title": "Demi-dragon", "tags": ["Fighter", "Tank"]}, {"id": "Singed", "name": "Singed", "title": "Chimiste fou", "tags": ["Tank", "Mage"]}, {"id": "Sion", "name": "Sion", "title": "Colosse mort-vivant", "tags": ["Tank", "Fighter"]}, {"id": "Sivir", "name": "Sivir", "title": "Mercenaire du désert", "tags": ["Marksman"]}, {"id": "Skarner", "name": "Skarner", "title": "Souverain originel", "tags": ["Tank", "Fighter"]}, {"id": "Smolder", "name": "Smolder", "title": "Dragonnet flamboyant", "tags": ["Marksman", "Mage"]}, {"id": "Sona", "name": "Sona", "title": "Virtuose de la harpe", "tags": ["Support", "Mage"]}, {"id": "Soraka", "name": "Soraka", "title": "Enfant des étoiles", "tags": ["Support", "Mage"]}, {"id": "Swain", "name": "Swain", "title": "Grand général noxien", "tags": ["Mage", "Support"]}, {"id": "Sylas", "name": "Sylas", "title": "Révolutionnaire déchaîné", "tags": ["Mage", "Assassin"]}, {"id": "Syndra", "name": "Syndra", "title": "Souveraine obscure", "tags": ["Mage"]}, {"id": "Seraphine", "name": "Séraphine", "title": "Chanteuse rêveuse", "tags": ["Support", "Mage"]}, {"id": "TahmKench", "name": "Tahm Kench", "title": "Roi des rivières", "tags": ["Tank", "Support"]}, {"id": "Taliyah", "name": "Taliyah", "title": "Tisseuse de pierres", "tags": ["Mage", "Support"]}, {"id": "Talon", "name": "Talon", "title": "Lame des ténèbres", "tags": ["Assassin"]}, {"id": "Taric", "name": "Taric", "title": "Bouclier de Valoran", "tags": ["Support", "Tank"]}, {"id": "Teemo", "name": "Teemo", "title": "Éclaireur de Bandle", "tags": ["Marksman", "Mage"]}, {"id": "Thresh", "name": "Thresh", "title": "Garde aux chaînes", "tags": ["Support", "Tank"]}, {"id": "Tristana", "name": "Tristana", "title": "Canonnière yordle", "tags": ["Marksman", "Assassin"]}, {"id": "Trundle", "name": "Trundle", "title": "Roi des trolls", "tags": ["Fighter", "Tank"]}, {"id": "Tryndamere", "name": "Tryndamere", "title": "Roi barbare", "tags": ["Fighter", "Assassin"]}, {"id": "TwistedFate", "name": "Twisted Fate", "title": "Maître des cartes", "tags": ["Mage", "Marksman"]}, {"id": "Twitch", "name": "Twitch", "title": "Semeur de peste", "tags": ["Marksman", "Assassin"]}, {"id": "Udyr", "name": "Udyr", "title": "Gardien des esprits", "tags": ["Fighter", "Tank"]}, {"id": "Urgot", "name": "Urgot", "title": "Broyeur", "tags": ["Fighter", "Tank"]}, {"id": "Varus", "name": "Varus", "title": "Flèche de la vengeance", "tags": ["Marksman", "Mage"]}, {"id": "Vayne", "name": "Vayne", "title": "Chasseresse nocturne", "tags": ["Marksman", "Assassin"]}, {"id": "Veigar", "name": "Veigar", "title": "Seigneur des maléfices", "tags": ["Mage"]}, {"id": "Velkoz", "name": "Vel'Koz", "title": "Œil du Néant", "tags": ["Mage", "Support"]}, {"id": "Vex", "name": "Vex", "title": "Ombre du désespoir", "tags": ["Mage"]}, {"id": "Vi", "name": "Vi", "title": "Pacifieuse de Piltover", "tags": ["Fighter", "Assassin"]}, {"id": "Viego", "name": "Viego", "title": "Roi déchu", "tags": ["Fighter", "Assassin"]}, {"id": "Viktor", "name": "Viktor", "title": "Héraut de l'arcane", "tags": ["Mage"]}, {"id": "Vladimir", "name": "Vladimir", "title": "Saigneur pourpre", "tags": ["Mage", "Fighter"]}, {"id": "Volibear", "name": "Volibear", "title": "Tempête impitoyable", "tags": ["Fighter", "Tank"]}, {"id": "Warwick", "name": "Warwick", "title": "Fureur déchaînée de Zaun", "tags": ["Fighter", "Tank"]}, {"id": "MonkeyKing", "name": "Wukong", "title": "Roi des singes", "tags": ["Fighter", "Tank"]}, {"id": "Xayah", "name": "Xayah", "title": "Rebelle", "tags": ["Marksman"]}, {"id": "Xerath", "name": "Xerath", "title": "Mage suprême", "tags": ["Mage", "Support"]}, {"id": "XinZhao", "name": "Xin Zhao", "title": "Sénéchal de Demacia", "tags": ["Fighter", "Tank"]}, {"id": "Yasuo", "name": "Yasuo", "title": "Disgracié", "tags": ["Fighter", "Assassin"]}, {"id": "Yone", "name": "Yone", "title": "Inoublié", "tags": ["Fighter", "Assassin"]}, {"id": "Yorick", "name": "Yorick", "title": "Berger des âmes", "tags": ["Fighter", "Tank"]}, {"id": "Yunara", "name": "Yunara", "title": "Foi inébranlable", "tags": ["Marksman"]}, {"id": "Yuumi", "name": "Yuumi", "title": "Gardienne du Grimoire", "tags": ["Support", "Mage"]}, {"id": "Zaahen", "name": "Zaahen", "title": "Incorruptible", "tags": ["Fighter"]}, {"id": "Zac", "name": "Zac", "title": "Arme secrète", "tags": ["Tank", "Fighter"]}, {"id": "Zed", "name": "Zed", "title": "Maître des ombres", "tags": ["Assassin"]}, {"id": "Zeri", "name": "Zeri", "title": "Étincelle de Zaun", "tags": ["Marksman"]}, {"id": "Ziggs", "name": "Ziggs", "title": "Expert des Hexplosifs", "tags": ["Mage"]}, {"id": "Zilean", "name": "Zilean", "title": "Gardien du Temps", "tags": ["Support", "Mage"]}, {"id": "Zoe", "name": "Zoé", "title": "Manifestation du Crépuscule", "tags": ["Mage"]}, {"id": "Zyra", "name": "Zyra", "title": "Dame aux ronces", "tags": ["Mage", "Support"]}];

  // Règles du duel (tirées au sort à chaque face-à-face)
  const RULES = [
    'Premier sang',
    'Premier à 2 kills',
    'Premier à 100 sbires',
    'Première tour détruite',
    'Premier sang · Flash interdit',
    'Premier à 2 kills · retour base interdit',
    'Premier sang · touche R (ultime) interdite',
    'Premier sang · Ignite + Ghost obligatoires',
    'Premier à 2 kills · aucune potion',
    'Premier sang · aucun achat avant le kill',
    'Premier sang · bottes interdites',
    'Le plus de sbires à 10 min',
    'Premier sang · interdit de quitter la lane',
    'Premier à 2 kills · le perdant fait /dance sous la tour adverse',
    'Premier sang · le perdant écrit « gg ez » à lui-même',
    'Premier à 3 kills · mode chaos, tout est permis',
  ];
  const CLASSES = [
    ['Fighter', 'Combattant'], ['Mage', 'Mage'], ['Assassin', 'Assassin'],
    ['Tank', 'Tank'], ['Support', 'Support'], ['Marksman', 'Tireur'],
  ];

  const EMOJIS = ['😂', '💀', '🔥', '🤡', '😤', '🧂', '🗿', '😎', '🤯', '🥶', '🐐', '💅', '🫠', '😭', '🍿', '🤓', '👀', '🙃'];
  const PUNCHLINES = [
    'Flash dans le mur, comme d\'hab',
    '0/10 mais c\'est la faute du jungler',
    'Tape /ff à 15 min pile',
    'Roi incontesté du /all chat',
    'Spécialiste du tower dive à 1 PV',
    'Prend le buff de l\'ADC sans demander',
    'Une ward ? C\'est quoi une ward ?',
    '0 % de mana, 100 % de confiance',
    'Reporté pour mauvaise attitude (encore)',
    'Pentakill… en ARAM',
    '47 pings par minute, minimum',
    'Champion OP selon un TikTok',
    'Se fait gank. Toujours. Partout.',
    'A acheté 6 Doran, assume',
    'Le 1v5, mais seulement dans sa tête',
    'Ultime dans le vide, garanti',
    'Back à 2 PV, mort dans le bush',
    'Smurf autoproclamé (Silver II)',
    'Diff jungle, évidemment',
    'Joue en mute all depuis 2019',
    '{n}, Fléau du Bronze IV',
    '{n} l\'Incompris',
    '{n}, Seigneur des lanes perdues',
    '{n}, Champion du /dance',
    '« Nerf {n} svp » — tout le monde',
    '{n} : le pick préféré des hardstuck',
    '{n}, Gardien du bush de la rivière',
    '{n}, Maître du recall interrompu',
  ];

  /* =========================================================
     STATE
     ========================================================= */
  const S = {
    version: null,
    champions: [],          // {id, name, title}
    resolved: new Map(),    // id -> {src, humor}
    decor: new Map(),       // id -> {emoji, punch, tilt, hue}
    spinning: false,
    ready: false,
    muted: readPref('lol1v1.muted') === '1',
    humor: readPref('lol1v1.humor') === '1',
    lastDuel: null,
    filter: new Set((readPref('lol1v1.filter') || '').split(',').filter(Boolean)),
    game: loadGame(),
  };

  const $ = (s) => document.querySelector(s);
  const els = {
    app: $('#app'), stage: $('.stage'), go: $('#go'), goWrap: $('#go-wrap'), goLabel: $('#go-label'),
    status: $('#status'), progress: $('.progress'), progressBar: $('#progress-bar'),
    patch: $('#patch'), mute: $('#btn-mute'), humor: $('#btn-humor'), exportBtn: $('#btn-export'),
    faceoff: $('#faceoff'), fBlue: $('#fighter-blue'), fRed: $('#fighter-red'),
    reroll: $('#btn-reroll'),
    nameBlue: $('#name-blue'), nameRed: $('#name-red'), scoreBlue: $('#score-blue'), scoreRed: $('#score-red'),
    filters: $('#filters'), ruleText: $('#rule-text'), ruleBtn: $('#btn-rule'),
    historyBtn: $('#btn-history'), historyCount: $('#history-count'), history: $('#history'),
    historyList: $('#history-list'), historyEmpty: $('#history-empty'), historyClose: $('#history-close'), reset: $('#btn-reset'), copy: $('#btn-copy'), close: $('#btn-close'), toast: $('#toast'),
  };

  function makeReel(side, selector, reversed) {
    const win = $(selector);
    return {
      side, win, reversed,
      rail: win.closest('.rail'),
      track: win.querySelector('.rail-track'),
      logical: [],       // champions dans l'ordre logique (index 0 = premier à passer)
      cards: [],         // éléments DOM dans l'ordre DOM
      restLogical: 0,    // index logique de la carte centrée
      current: null,     // champion centré
      x: 0,
    };
  }
  // Haut = Blue Side, défile de gauche à droite (ordre DOM inversé)
  // Bas  = Red Side,  défile de droite à gauche
  const reels = {
    blue: makeReel('blue', '#reel-blue', true),
    red: makeReel('red', '#reel-red', false),
  };

  /* =========================================================
     UTILS
     ========================================================= */
  function readPref(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function writePref(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } }
  function loadGame() {
    const empty = { names: { blue: '', red: '' }, score: { blue: 0, red: 0 }, history: [] };
    try {
      const g = JSON.parse(readPref('lol1v1.game') || 'null');
      if (g && g.score && Array.isArray(g.history)) return { ...empty, ...g, names: { ...empty.names, ...(g.names || {}) } };
    } catch (_) { /* ignore */ }
    return empty;
  }
  function saveGame() { writePref('lol1v1.game', JSON.stringify(S.game)); }
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rand(arr.length)];
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = rand(i + 1); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const iconUrl = (id) => `${DD}/cdn/${S.version}/img/champion/${id}.png`;
  const loadingArtUrl = (id) => `${DD}/cdn/img/champion/loading/${id}_0.jpg`;
  const humorUrls = (id) => HUMOR_EXTS.map((e) => `${HUMOR_DIR}${id}.${e}`);
  const localArtUrl = (id) => `./champions/${id}.jpg`; // images du site officiel leagueoflegends.com

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  // cubic-bezier solver (même modèle que CSS)
  function bezier(p1x, p1y, p2x, p2y) {
    const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
    const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(t) - x;
        if (Math.abs(e) < 1e-6) break;
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      let lo = 0, hi = 1;
      for (let i = 0; i < 30 && Math.abs(sx(t) - x) > 1e-6; i++) {
        if (sx(t) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
  }
  // accélération courte et forte puis longue décélération (suspense)
  const spinEase = bezier(0.2, 0.0, 0.02, 1);
  const settleEase = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  /* =========================================================
     AUDIO (Web Audio API, procédural)
     ========================================================= */
  const Audio = (() => {
    let ctx = null, master = null, noiseBuf = null;

    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6;
        master = ctx.createGain();
        master.gain.value = S.muted ? 0 : 0.85;
        master.connect(comp).connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function out(pan) {
      if (pan && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(master); return p;
      }
      return master;
    }
    function env(g, t, peak, attack, decay) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }
    function noise(t, dur, filterType, freq, q, peak, decay, dest) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); env(g, t, peak, 0.002, decay);
      src.connect(f).connect(g).connect(dest);
      src.start(t, Math.random() * 0.5, dur);
      return f;
    }
    function setMuted(m) {
      if (master) master.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.02);
    }

    function tick(side, intensity) {
      if (S.muted || !ensure()) return;
      const t = ctx.currentTime;
      const dest = out(side === 'blue' ? -0.35 : 0.35);
      const o = ctx.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(side === 'blue' ? 2600 : 2000, t);
      o.frequency.exponentialRampToValueAtTime(side === 'blue' ? 1300 : 1000, t + 0.025);
      const g = ctx.createGain(); env(g, t, 0.05 + 0.04 * intensity, 0.001, 0.03);
      o.connect(g).connect(dest); o.start(t); o.stop(t + 0.05);
      noise(t, 0.04, 'highpass', 3500, 0.7, 0.09 + 0.05 * intensity, 0.022, dest);
    }

    function whoosh() {
      if (S.muted || !ensure()) return;
      const t = ctx.currentTime;
      const f = noise(t, 0.9, 'bandpass', 300, 1.2, 0.35, 0.8, master);
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(4200, t + 0.7);
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.6);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = ctx.createGain(); env(g, t, 0.12, 0.05, 0.6);
      o.connect(lp).connect(g).connect(master); o.start(t); o.stop(t + 0.75);
    }

    function impact(side) {
      if (S.muted || !ensure()) return;
      const t = ctx.currentTime;
      const dest = out(side === 'blue' ? -0.2 : 0.2);
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.4);
      const g = ctx.createGain(); env(g, t, 0.9, 0.004, 0.55);
      o.connect(g).connect(dest); o.start(t); o.stop(t + 0.65);
      noise(t, 0.3, 'lowpass', 1100, 0.8, 0.6, 0.2, dest);
      // clac métallique
      const m = ctx.createOscillator(); m.type = 'triangle'; m.frequency.value = side === 'blue' ? 1240 : 980;
      const mg = ctx.createGain(); env(mg, t, 0.12, 0.001, 0.12);
      m.connect(mg).connect(dest); m.start(t); m.stop(t + 0.15);
    }

    function gong() {
      if (S.muted || !ensure()) return;
      const t = ctx.currentTime;
      // explosion
      const f = noise(t, 1, 'lowpass', 5000, 0.6, 0.9, 1.1, master);
      f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(180, t + 1.1);
      // sub
      const sub = ctx.createOscillator(); sub.type = 'sine';
      sub.frequency.setValueAtTime(70, t); sub.frequency.exponentialRampToValueAtTime(28, t + 1.2);
      const sg = ctx.createGain(); env(sg, t, 1.0, 0.01, 1.3);
      sub.connect(sg).connect(master); sub.start(t); sub.stop(t + 1.5);
      // gong : partiels inharmoniques
      const f0 = 96;
      [[1, 0.42, 4.2], [1.48, 0.28, 3.4], [1.97, 0.22, 3.0], [2.53, 0.16, 2.4], [3.1, 0.1, 1.8], [4.27, 0.07, 1.2], [5.6, 0.04, 0.8]]
        .forEach(([ratio, peak, decay], i) => {
          const o = ctx.createOscillator(); o.type = 'sine';
          const fr = f0 * ratio;
          o.frequency.setValueAtTime(fr * 1.012, t);
          o.frequency.exponentialRampToValueAtTime(fr, t + 0.4);
          const g = ctx.createGain(); env(g, t + 0.01 * i, peak, 0.008, decay);
          o.connect(g).connect(master); o.start(t); o.stop(t + decay + 0.2);
        });
    }

    return { ensure, tick, whoosh, impact, gong, setMuted };
  })();

  /* =========================================================
     IMAGES (humor-bank prioritaire, fallback Riot via onerror)
     ========================================================= */
  // Chaîne de sources pour une carte : humor-bank (.png/.jpg/.webp) puis icône Riot
  const sourcesFor = (id) => [...humorUrls(id), localArtUrl(id), iconUrl(id)];

  // Préchargement : uniquement via onerror/onload d'un élément <img> (aucun fetch)
  function preloadChampion(champ) {
    return new Promise((resolve) => {
      const srcs = sourcesFor(champ.id);
      const nHumor = HUMOR_EXTS.length;
      let i = 0, settled = false, timer = 0;
      const img = new Image();
      img.decoding = 'async';
      const finish = (r) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        img.onload = img.onerror = null;
        S.resolved.set(champ.id, r);
        resolve(r);
      };
      const tryAt = (k) => {
        i = k;
        clearTimeout(timer);
        // une requête qui ne répond jamais ne doit pas bloquer le chargement
        timer = setTimeout(() => img.onerror && img.onerror(), PRELOAD_TIMEOUT);
        img.src = srcs[i];
      };
      img.onload = () => {
        clearTimeout(timer);
        const r = { src: srcs[i], humor: i < nHumor };
        if (!img.decode) { finish(r); return; }
        Promise.race([img.decode(), new Promise((ok) => setTimeout(ok, 800))]).then(() => finish(r), () => finish(r));
      };
      img.onerror = () => {
        if (settled) return;
        if (i + 1 < srcs.length) tryAt(i + 1);
        else finish({ src: null, humor: false });
      };
      tryAt(0);
    });
  }

  function preloadUrl(url, timeoutMs) {
    return new Promise((resolve) => {
      const img = new Image();
      const t = setTimeout(() => resolve(false), timeoutMs);
      img.onload = () => { clearTimeout(t); resolve(true); };
      img.onerror = () => { clearTimeout(t); resolve(false); };
      img.src = url;
    });
  }

  // Crée un <img> qui bascule sur la source suivante via onerror.
  // `host` reçoit la classe .meme quand c'est l'icône Riot qui est affichée.
  function champImg(champ, host, srcs, nHumor) {
    const img = document.createElement('img');
    img.alt = champ.name;
    img.draggable = false;
    img.decoding = 'async';
    let i = 0;
    const known = S.resolved.get(champ.id);
    if (known && srcs === null) {
      // déjà résolu au préchargement : on démarre directement sur la bonne source
      srcs = sourcesFor(champ.id);
      nHumor = HUMOR_EXTS.length;
      i = known.src ? Math.max(0, srcs.indexOf(known.src)) : srcs.length - 1;
    } else if (srcs === null) {
      srcs = sourcesFor(champ.id);
      nHumor = HUMOR_EXTS.length;
    }
    const apply = () => {
      host.classList.toggle('meme', i >= nHumor);
      img.src = srcs[i];
    };
    img.onerror = () => {
      if (i < srcs.length - 1) { i += 1; apply(); }
      else {
        img.onerror = null; img.style.visibility = 'hidden'; host.classList.add('meme');
        const box = img.parentElement;
        if (box) { box.classList.add('noimg'); box.dataset.initials = champ.name.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 2).toUpperCase(); }
      }
    };
    apply();
    host.style.setProperty('--ph', `${[...champ.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)}`);
    return img;
  }

  /* =========================================================
     DÉCOR HUMOUR
     ========================================================= */
  function decorFor(champ) {
    let d = S.decor.get(champ.id);
    if (!d) {
      d = {
        emoji: pick(EMOJIS),
        punch: pick(PUNCHLINES).replace('{n}', champ.name),
        tilt: (Math.random() * 6 - 3).toFixed(2) + 'deg',
        hue: Math.round(Math.random() * 50 - 25) + 'deg',
      };
      S.decor.set(champ.id, d);
    }
    return d;
  }

  /* =========================================================
     REELS
     ========================================================= */
  function cardEl(champ) {
    const d = decorFor(champ);
    const card = document.createElement('div');
    card.className = 'card';
    card.style.setProperty('--tilt', d.tilt);
    card.style.setProperty('--hue', d.hue);
    const art = document.createElement('div');
    art.className = 'card-art';
    art.appendChild(champImg(champ, card, null));
    card.appendChild(art);
    card.insertAdjacentHTML('beforeend',
      `<span class="card-badge" aria-hidden="true">${d.emoji}</span>` +
      `<div class="card-body"><div class="card-name">${escapeHTML(champ.name)}</div>` +
      `<div class="card-punch"><span class="p-title">${escapeHTML(champ.title)}</span>` +
      `<span class="p-joke">${escapeHTML(d.punch)}</span></div></div>`);
    return card;
  }

  const domIndex = (reel, logicalIdx) => (reel.reversed ? reel.logical.length - 1 - logicalIdx : logicalIdx);

  function build(reel, logical) {
    reel.logical = logical;
    const order = reel.reversed ? logical.slice().reverse() : logical;
    const frag = document.createDocumentFragment();
    reel.cards = order.map((c) => { const el = cardEl(c); frag.appendChild(el); return el; });
    reel.track.replaceChildren(frag);
  }

  function setX(reel, x) {
    reel.x = x;
    reel.track.style.transform = `translate3d(${x}px,0,0)`;
  }

  // translateX = largeurConteneur / 2 - positionCentreCarte (calculé au moment T)
  function xFor(reel, logicalIdx) {
    const card = reel.cards[domIndex(reel, logicalIdx)];
    return reel.win.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2);
  }

  function place(reel, logicalIdx) {
    reel.restLogical = logicalIdx;
    reel.current = reel.logical[logicalIdx];
    setX(reel, xFor(reel, logicalIdx));
  }

  // Ruban = 100 % du roster mélangé. Gagnant à l'index totalChampions - 15.
  // Les 25 cartes visibles au repos sont recopiées en tête pour un départ sans saut.
  function pool() {
    if (!S.filter.size) return S.champions;
    return S.champions.filter((c) => (c.tags || []).some((t) => S.filter.has(t)));
  }

  function buildSpinStrip(reel, winner) {
    const all = pool();
    const head = reel.logical.length
      ? reel.logical.slice(Math.max(0, reel.restLogical - START_AT), reel.restLogical + AFTER_WIN)
      : [];
    const headSet = new Set(head);
    const rest = shuffle(all.filter((c) => !headSet.has(c) && c !== winner));
    let strip = head.concat(rest);
    // petit pool (filtre) : on répète le pool pour garder un long défilement
    while (strip.length < head.length + 3 * AFTER_WIN) strip = strip.concat(shuffle(all.filter((c) => c !== winner)));
    // après insertion, le gagnant est à l'index (longueur totale - 15)
    const landIdx = Math.max(head.length, strip.length + 1 - AFTER_WIN);
    strip.splice(landIdx, 0, winner);
    const startIdx = head.length ? Math.min(START_AT, reel.restLogical) : START_AT;
    return { strip, landIdx, startIdx };
  }

  function animateReel(reel, toX, duration) {
    return new Promise((resolve) => {
      const fromX = reel.x;
      const dist = toX - fromX;
      const dir = Math.sign(dist) || 1;
      const step = Math.abs(reel.cards[1].offsetLeft - reel.cards[0].offsetLeft);
      const overshoot = dir * step * 0.16;
      const center = reel.win.clientWidth / 2;
      const total = Math.abs(dist);
      let t0 = null, lastCell = null, lastTick = 0, prevX = fromX, prevT = 0;

      function frame(now) {
        if (t0 === null) { t0 = now; prevT = now; }
        const el = now - t0;
        let x;
        if (el < duration) {
          x = fromX + (dist + overshoot) * spinEase(el / duration);
        } else if (el < duration + SETTLE_MS) {
          x = toX + overshoot * (1 - settleEase((el - duration) / SETTLE_MS));
        } else {
          setX(reel, toX);
          resolve();
          return;
        }
        setX(reel, x);

        if (el < duration) {
          const cell = Math.floor((center - x) / step);
          if (lastCell !== null && cell !== lastCell && now - lastTick >= TICK_MIN_GAP) {
            const v = Math.abs(x - prevX) / Math.max(1, now - prevT); // px/ms
            Audio.tick(reel.side, Math.min(1, v / 4));
            lastTick = now;
          }
          lastCell = cell;
        }
        prevX = x; prevT = now;
        requestAnimationFrame(frame);
      }
      if (total < 1) { resolve(); return; }
      requestAnimationFrame(frame);
    });
  }

  async function spinReel(reel, winner, duration) {
    const { strip, landIdx, startIdx } = buildSpinStrip(reel, winner);
    build(reel, strip);
    place(reel, startIdx);
    // force le layout avant l'animation
    void reel.track.offsetWidth;
    reel.rail.classList.add('spinning');
    const target = xFor(reel, landIdx); // calculé au moment du clic, selon la largeur réelle
    await animateReel(reel, target, duration);
    setX(reel, xFor(reel, landIdx)); // recalage si la fenêtre a changé de taille pendant la rotation
    reel.restLogical = landIdx;
    reel.current = winner;
    reel.rail.classList.remove('spinning');
    reel.cards[domIndex(reel, landIdx)].classList.add('is-winner');
    Audio.impact(reel.side);
  }

  function idleReels() {
    Object.values(reels).forEach((reel) => {
      build(reel, shuffle(S.champions));
      place(reel, START_AT);
    });
  }

  /* =========================================================
     GO / DUEL
     ========================================================= */
  function setGo(state) {
    els.go.classList.toggle('running', state === 'running');
    els.goWrap.classList.toggle('locked', state !== 'ready');
    els.go.disabled = state !== 'ready';
    els.goLabel.textContent = state === 'running' ? 'EN COURS…' : state === 'ready' ? 'GO' : 'CHARGEMENT…';
  }

  async function launch() {
    if (S.spinning || !S.ready) return;
    S.spinning = true;
    hideFaceoff();
    setGo('running');
    Audio.ensure();
    Audio.whoosh();

    const P = pool();
    const blue = pick(P);
    let red = pick(P);
    while (red === blue) red = pick(P);
    els.filters.classList.add('locked');

    // préchargement des visuels du face-à-face pendant la rotation
    const artReady = Promise.all([blue, red].map((c) => {
      const r = S.resolved.get(c.id);
      return r && r.humor ? Promise.resolve(true) : preloadUrl(localArtUrl(c.id), 4000);
    }));

    els.status.textContent = 'Tirage en cours…';
    await Promise.all([
      spinReel(reels.blue, blue, DURATION.blue),
      spinReel(reels.red, red, DURATION.red),
    ]);
    await Promise.race([artReady, new Promise((r) => setTimeout(r, 600))]);

    S.lastDuel = { blue, red, rule: pick(RULES), winner: null };
    S.game.history.unshift({
      blue: { id: blue.id, name: blue.name }, red: { id: red.id, name: red.name },
      rule: S.lastDuel.rule, winner: null, ts: Date.now(),
    });
    S.game.history = S.game.history.slice(0, 50);
    saveGame();
    renderGame();
    els.filters.classList.remove('locked');
    els.status.textContent = `${blue.name} vs ${red.name}`;
    showFaceoff(blue, red);
    S.spinning = false;
    setGo('ready');
  }

  function fighterInto(host, champ, side) {
    const d = decorFor(champ);
    const r = S.resolved.get(champ.id);
    host.className = `fighter fighter--${side}`;
    host.replaceChildren();
    const frame = document.createElement('div');
    frame.className = 'fighter-frame';
    frame.insertAdjacentHTML('beforeend', `<span class="fighter-side">${side === 'blue' ? 'BLUE SIDE' : 'RED SIDE'}</span>`);
    const srcs = r && r.humor
      ? [r.src, localArtUrl(champ.id), loadingArtUrl(champ.id), iconUrl(champ.id)]
      : [localArtUrl(champ.id), loadingArtUrl(champ.id), iconUrl(champ.id)];
    frame.appendChild(champImg(champ, host, srcs, r && r.humor ? 1 : 0));
    host.appendChild(frame);
    host.insertAdjacentHTML('beforeend',
      `<span class="fighter-badge" aria-hidden="true">${d.emoji}</span>` +
      `<div class="fighter-name">${escapeHTML(champ.name)}</div>` +
      `<div class="fighter-title">${escapeHTML(champ.title)}</div>` +
      `<div class="fighter-punch">${escapeHTML(d.punch)}</div>` +
      `<button class="btn-win" type="button" data-side="${side}">🏆 VICTOIRE <span class="win-name"></span></button>`);
  }

  function showFaceoff(blue, red) {
    fighterInto(els.fBlue, blue, 'blue');
    fighterInto(els.fRed, red, 'red');
    els.stage.classList.remove('shake');
    void els.stage.offsetWidth;
    els.stage.classList.add('shake');
    Audio.gong();
    renderWinState();
    rollRule(S.lastDuel.rule, 900);
    // relance les animations CSS
    els.faceoff.hidden = false;
    els.faceoff.querySelectorAll('.faceoff-backdrop, .faceoff-flash, .fighter, .vs, .rule, .faceoff-actions').forEach((n) => {
      n.style.animation = 'none'; void n.offsetWidth; n.style.animation = '';
    });
    setTimeout(() => els.reroll.focus({ preventScroll: true }), 50);
  }

  // Défilement « machine à sous » de la règle, qui ralentit puis se fige
  function rollRule(finalRule, delayMs) {
    clearTimeout(rollRule.t);
    const box = els.ruleText.parentElement;
    box.classList.remove('locked-in');
    box.classList.add('rolling');
    els.ruleBtn.disabled = true;
    let k = 0;
    const steps = 16;
    const next = () => {
      if (k < steps) {
        els.ruleText.textContent = pick(RULES);
        if (k % 2 === 0) Audio.tick('red', 0.3);
        k += 1;
        rollRule.t = setTimeout(next, 40 + k * k * 1.3);
      } else {
        els.ruleText.textContent = finalRule;
        box.classList.remove('rolling');
        void box.offsetWidth;
        box.classList.add('locked-in');
        els.ruleBtn.disabled = false;
        Audio.impact('red');
      }
    };
    els.ruleText.textContent = '…';
    rollRule.t = setTimeout(next, delayMs || 0);
  }

  function rerollRule() {
    if (!S.lastDuel) return;
    let r = pick(RULES);
    while (RULES.length > 1 && r === S.lastDuel.rule) r = pick(RULES);
    S.lastDuel.rule = r;
    if (S.game.history[0]) { S.game.history[0].rule = r; saveGame(); renderHistory(); }
    rollRule(r, 0);
  }

  /* ---------- Joueurs, scores, historique ---------- */
  const playerName = (side) => (S.game.names[side] || '').trim() || (side === 'blue' ? 'Blue' : 'Red');

  function setWinner(side) {
    const duel = S.game.history[0];
    if (!duel || !S.lastDuel) return;
    if (duel.winner === side) return;
    if (duel.winner) S.game.score[duel.winner] = Math.max(0, S.game.score[duel.winner] - 1);
    duel.winner = side;
    S.lastDuel.winner = side;
    S.game.score[side] += 1;
    saveGame();
    renderGame();
    renderWinState();
    Audio.impact(side);
    showToast(`🏆 Point pour ${playerName(side)} (${S.game.score.blue} – ${S.game.score.red})`);
  }

  function renderWinState() {
    const w = S.lastDuel && S.lastDuel.winner;
    [['blue', els.fBlue], ['red', els.fRed]].forEach(([side, host]) => {
      host.classList.toggle('is-champ', w === side);
      host.classList.toggle('is-loser', !!w && w !== side);
      const btn = host.querySelector('.btn-win');
      if (btn) {
        btn.querySelector('.win-name').textContent = playerName(side);
        btn.setAttribute('aria-pressed', String(w === side));
      }
    });
  }

  function renderHistory() {
    const H = S.game.history;
    els.historyCount.textContent = String(H.length);
    els.historyEmpty.hidden = H.length > 0;
    els.historyList.replaceChildren(...H.map((d) => {
      const li = document.createElement('li');
      li.className = `h-item${d.winner ? ` h-item--${d.winner}` : ''}`;
      const res = d.winner ? `🏆 ${escapeHTML(playerName(d.winner))}` : 'en attente';
      li.innerHTML =
        `<div class="h-duel"><span class="h-blue">${escapeHTML(d.blue.name)}</span>` +
        `<span class="h-vs">vs</span><span class="h-red">${escapeHTML(d.red.name)}</span></div>` +
        `<div class="h-meta"><span>${escapeHTML(d.rule || '')}</span><span class="h-res">${res}</span></div>`;
      return li;
    }));
  }

  function renderGame() {
    [['blue', els.scoreBlue], ['red', els.scoreRed]].forEach(([side, el]) => {
      const v = String(S.game.score[side]);
      if (el.textContent !== v) { el.textContent = v; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    if (document.activeElement !== els.nameBlue) els.nameBlue.value = S.game.names.blue || '';
    if (document.activeElement !== els.nameRed) els.nameRed.value = S.game.names.red || '';
    renderHistory();
  }

  function toggleHistory(open) {
    const show = open === undefined ? els.history.hidden : open;
    els.history.hidden = !show;
    els.historyBtn.setAttribute('aria-expanded', String(show));
  }

  /* ---------- Filtres par classe ---------- */
  function renderFilters() {
    const btn = (key, label, active) =>
      `<button class="filter${active ? ' is-on' : ''}" type="button" data-tag="${key}" aria-pressed="${active}">${label}</button>`;
    els.filters.innerHTML = btn('', 'Tous', S.filter.size === 0) +
      CLASSES.map(([k, l]) => btn(k, l, S.filter.has(k))).join('');
  }

  function onFilterClick(e) {
    const b = e.target.closest('.filter');
    if (!b || S.spinning) return;
    const tag = b.dataset.tag;
    if (!tag) S.filter.clear();
    else if (S.filter.has(tag)) S.filter.delete(tag);
    else S.filter.add(tag);
    writePref('lol1v1.filter', [...S.filter].join(','));
    renderFilters();
    if (S.ready) {
      const n = pool().length;
      const names = CLASSES.filter(([k]) => S.filter.has(k)).map(([, l]) => l).join(' + ');
      els.status.textContent = S.filter.size ? `${n} champions · ${names}` : `${n} champions · roster complet`;
    }
  }

  function hideFaceoff() {
    els.faceoff.hidden = true;
  }

  function duelText() {
    const { blue, red } = S.lastDuel;
    const db = decorFor(blue), dr = decorFor(red);
    return [
      '⚔️ **DUEL 1V1 — LEAGUE OF LEGENDS** ⚔️',
      '',
      `🔵 **${playerName('blue')}** : **${blue.name}**${blue.title ? ` — *${blue.title}*` : ''}`,
      '                 🆚',
      `🔴 **${playerName('red')}** : **${red.name}**${red.title ? ` — *${red.title}*` : ''}`,
      '',
      `> ${db.emoji} ${blue.name} : « ${db.punch} »`,
      `> ${dr.emoji} ${red.name} : « ${dr.punch} »`,
      '',
      `📜 **Règle** : ${S.lastDuel.rule}`,
      `📊 Score : ${playerName('blue')} ${S.game.score.blue} – ${S.game.score.red} ${playerName('red')}`,
      '',
      `🎲 Tiré au sort · Data Dragon ${S.version}`,
      'Qui gagne ? Réagissez 🔵 ou 🔴',
    ].join('\n');
  }

  async function copyDuel() {
    if (!S.lastDuel) return;
    const text = duelText();
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (_) { ok = false; }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.remove();
    }
    showToast(ok ? 'Duel copié — prêt à coller sur Discord ✅' : 'Copie impossible dans ce navigateur ❌');
  }

  function exportNames() {
    const lines = [
      `# Noms de fichiers exacts pour ./humor-bank/ — Data Dragon ${S.version}`,
      `# ${S.champions.length} champions. Extensions acceptées : .png, .jpg, .webp`,
      '# Format : ID.png    (nom affiché)',
      '',
      ...S.champions.map((c) => `${c.id}.png    (${c.name})`),
      '',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'noms-fichiers.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* =========================================================
     TOGGLES
     ========================================================= */
  function renderToggles() {
    document.body.classList.toggle('humor', S.humor);
    els.humor.setAttribute('aria-pressed', String(S.humor));
    els.humor.textContent = `Mode Humour / BD : ${S.humor ? 'ON' : 'OFF'}`;
    els.mute.setAttribute('aria-pressed', String(S.muted));
    els.mute.textContent = S.muted ? '🔇 Son : OFF' : '🔊 Son : ON';
  }

  /* =========================================================
     BOOT
     ========================================================= */
  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
    return res.json();
  }

  async function boot() {
    setGo('loading');
    els.status.classList.remove('error');
    els.status.textContent = 'Connexion à Data Dragon…';
    els.progress.classList.remove('done');
    els.progressBar.style.width = '4%';
    try {
      const versions = await fetchJSON(`${DD}/api/versions.json`);
      S.version = versions[0];
      els.patch.textContent = `Data Dragon ${S.version}`;
      const data = await fetchJSON(`${DD}/cdn/${S.version}/data/fr_FR/champion.json`);
      S.champions = Object.values(data.data)
        .map((c) => ({ id: c.id, name: c.name, title: c.title, tags: c.tags || [] }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      if (S.champions.length < 2) throw new Error('Roster vide');
    } catch (err) {
      console.error(err);
      S.offline = true;
      S.version = S.version || OFFLINE_VERSION;
      els.patch.textContent = `Roster intégré · Data Dragon ${OFFLINE_VERSION}`;
      S.champions = OFFLINE_ROSTER.map((c) => ({ ...c }));
    }

    // Préchargement de toutes les images du roster avant la première animation
    let done = 0;
    const total = S.champions.length;
    els.status.textContent = `Préchargement des visuels 0/${total}…`;
    await Promise.all(S.champions.map((c) => preloadChampion(c).then(() => {
      done += 1;
      els.progressBar.style.width = `${4 + (96 * done) / total}%`;
      if (done % 8 === 0 || done === total) els.status.textContent = `Préchargement des visuels ${done}/${total}…`;
    })));

    const nHumor = [...S.resolved.values()].filter((r) => r.humor).length;
    idleReels();
    S.ready = true;
    setGo('ready');
    els.exportBtn.disabled = false;
    els.progress.classList.add('done');
    els.status.textContent = S.offline
      ? `${total} champions (roster intégré, Data Dragon ${OFFLINE_VERSION})`
      : `${total} champions chargés · ${nHumor} image${nHumor > 1 ? 's' : ''} humor-bank`;
  }

  /* =========================================================
     EVENTS
     ========================================================= */
  els.go.addEventListener('click', launch);
  els.reroll.addEventListener('click', launch);
  els.copy.addEventListener('click', copyDuel);
  els.close.addEventListener('click', hideFaceoff);
  els.exportBtn.addEventListener('click', exportNames);
  els.ruleBtn.addEventListener('click', rerollRule);
  els.faceoff.addEventListener('click', (e) => {
    const b = e.target.closest('.btn-win');
    if (b) setWinner(b.dataset.side);
  });
  els.filters.addEventListener('click', onFilterClick);
  els.historyBtn.addEventListener('click', () => toggleHistory());
  els.historyClose.addEventListener('click', () => toggleHistory(false));
  els.reset.addEventListener('click', () => {
    if (!window.confirm('Remettre les scores et l\'historique à zéro ?')) return;
    S.game.score = { blue: 0, red: 0 };
    S.game.history = [];
    saveGame();
    renderGame();
    showToast('Scores remis à zéro');
  });
  [['blue', els.nameBlue], ['red', els.nameRed]].forEach(([side, input]) => {
    input.addEventListener('input', () => {
      S.game.names[side] = input.value.slice(0, 16);
      saveGame();
      renderHistory();
      renderWinState();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  });
  els.mute.addEventListener('click', () => {
    S.muted = !S.muted;
    writePref('lol1v1.muted', S.muted ? '1' : '0');
    Audio.setMuted(S.muted);
    renderToggles();
  });
  els.humor.addEventListener('click', () => {
    S.humor = !S.humor;
    writePref('lol1v1.humor', S.humor ? '1' : '0');
    renderToggles();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!els.history.hidden) toggleHistory(false);
    else if (!els.faceoff.hidden) hideFaceoff();
  });
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      if (S.spinning || !S.ready) return;
      Object.values(reels).forEach((r) => setX(r, xFor(r, r.restLogical)));
    });
  });

  renderToggles();
  renderFilters();
  renderGame();
  boot();
})();
