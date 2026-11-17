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
  const OFFLINE_ROSTER = [{"id":"Aatrox","name":"Aatrox","title":"Épée des Darkin","tags":["Fighter"],"st":[650,114,38,4.8,32,2.05,60,0,0.651,2.5,175,8,4,3]},{"id":"Ahri","name":"Ahri","title":"Renarde à neuf queues","tags":["Mage","Assassin"],"st":[590,104,21,4.2,30,1.3,53,0,0.668,2.2,550,3,4,8]},{"id":"Akali","name":"Akali","title":"Assassine rebelle","tags":["Assassin"],"st":[600,119,23,4.7,37,2.05,62,0,0.625,3.2,125,5,3,8]},{"id":"Akshan","name":"Akshan","title":"Sentinelle rebelle","tags":["Marksman","Assassin"],"st":[610,107,26,4.7,33,1.1,52,0,0.638,4,500,0,0,0]},{"id":"Alistar","name":"Alistar","title":"Minotaure","tags":["Tank","Support"],"st":[685,120,40,4.7,32,2.05,62,0,0.625,2.125,125,6,9,5]},{"id":"Ambessa","name":"Ambessa","title":"Matriarche de guerre","tags":["Fighter","Assassin"],"st":[630,110,35,4.9,32,2.05,63,0,0.625,2.5,125,9,2,0]},{"id":"Amumu","name":"Amumu","title":"Momie mélancolique","tags":["Tank","Support"],"st":[685,94,33,4,32,2.05,57,0,0.736,2.18,125,2,6,8]},{"id":"Anivia","name":"Anivia","title":"Cryophénix","tags":["Mage"],"st":[550,92,19,4.1,30,1.3,51,0,0.658,1.68,600,1,4,10]},{"id":"Annie","name":"Annie","title":"Enfant des ténèbres","tags":["Mage","Support"],"st":[560,96,23,4,30,1.3,50,0,0.61,1.36,625,2,3,10]},{"id":"Aphelios","name":"Aphelios","title":"Arme des Lunaris","tags":["Marksman"],"st":[600,102,26,4.2,33,1.1,55,0,0.665,2.1,550,6,2,1]},{"id":"Ashe","name":"Ashe","title":"Archère de givre","tags":["Marksman","Support"],"st":[610,101,26,4.6,33,1.1,59,0,0.658,3,600,7,3,2]},{"id":"AurelionSol","name":"Aurelion Sol","title":"Forgeur d'étoiles","tags":["Mage"],"st":[600,90,22,4,30,1.3,58,0,0.625,1.5,550,2,3,8]},{"id":"Aurora","name":"Aurora","title":"Sorcière d'entre les mondes","tags":["Mage","Assassin"],"st":[607,110,23,4.5,32,1.3,53,0,0.668,2,550,3,4,8]},{"id":"Azir","name":"Azir","title":"Empereur des sables","tags":["Mage","Marksman"],"st":[575,108,25,5,30,1.3,56,0,0.625,5,525,6,3,8]},{"id":"Bard","name":"Bard","title":"Gardien errant","tags":["Support","Mage"],"st":[630,103,32,4.7,30,1.3,52,0,0.658,2,500,4,4,5]},{"id":"Belveth","name":"Bel'Veth","title":"Impératrice du Néant","tags":["Fighter"],"st":[580,105,28,5,32,2.05,55,0,0.67,0,150,4,2,7]},{"id":"Blitzcrank","name":"Blitzcrank","title":"Golem de vapeur","tags":["Tank","Support"],"st":[600,109,37,4.7,32,2.05,62,0,0.625,1.13,125,4,8,5]},{"id":"Brand","name":"Brand","title":"Vengeur flamboyant","tags":["Mage","Support"],"st":[570,105,24,4.2,30,1.3,57,0,0.681,2,550,2,2,9]},{"id":"Braum","name":"Braum","title":"Cœur de Freljord","tags":["Tank","Support"],"st":[610,112,35,5,32,2.05,55,0,0.644,3.5,125,3,9,4]},{"id":"Briar","name":"Briar","title":"Faim insatiable","tags":["Fighter","Assassin"],"st":[625,95,30,4.5,32,2.05,60,0,0.644,2,125,9,5,3]},{"id":"Caitlyn","name":"Caitlyn","title":"Shérif de Piltover","tags":["Marksman"],"st":[580,107,27,4.7,33,1.1,62,0,0.681,4,650,8,2,2]},{"id":"Camille","name":"Camille","title":"Ombre d'acier","tags":["Fighter","Assassin"],"st":[650,99,35,4.5,32,2.05,68,0,0.644,2.5,125,8,6,3]},{"id":"Cassiopeia","name":"Cassiopeia","title":"Étreinte du serpent","tags":["Mage"],"st":[610,98,18,4.7,32,1.3,53,0,0.647,1.5,550,2,3,9]},{"id":"Chogath","name":"Cho'Gath","title":"Terreur noire","tags":["Tank","Mage"],"st":[644,94,38,4.5,32,2.05,69,0,0.658,1.44,125,3,7,7]},{"id":"Corki","name":"Corki","title":"Artilleur téméraire","tags":["Marksman","Mage"],"st":[610,100,27,4.5,33,1.1,52,0,0.644,2.8,550,8,3,6]},{"id":"Darius","name":"Darius","title":"Main de Noxus","tags":["Fighter","Tank"],"st":[652,114,37,5.2,32,2.05,64,0,0.625,1,175,9,5,1]},{"id":"Diana","name":"Diana","title":"Mépris de la lune","tags":["Fighter","Assassin"],"st":[640,109,31,4.3,32,2.05,57,0,0.625,2,150,7,6,8]},{"id":"DrMundo","name":"Dr. Mundo","title":"Dément de Zaun","tags":["Tank","Fighter"],"st":[640,103,32,4.5,29,2.3,61,0,0.67,3.3,125,5,7,6]},{"id":"Draven","name":"Draven","title":"Glorieux exécuteur","tags":["Marksman"],"st":[675,104,29,4.5,33,1.1,64,0,0.679,2.7,550,9,3,1]},{"id":"Ekko","name":"Ekko","title":"Fractureur du temps","tags":["Assassin","Mage"],"st":[655,99,32,4.2,32,2.05,58,0,0.688,3.3,125,5,3,7]},{"id":"Elise","name":"Elise","title":"Reine araignée","tags":["Assassin","Mage"],"st":[620,109,30,4.5,30,1.3,55,0,0.625,1.75,550,6,5,7]},{"id":"Evelynn","name":"Evelynn","title":"Démon sadique","tags":["Assassin","Mage"],"st":[642,98,37,4.7,32,2.05,61,0,0.667,2.1,125,4,2,7]},{"id":"Ezreal","name":"Ezreal","title":"Explorateur prodigue","tags":["Marksman","Mage"],"st":[600,102,24,4.2,33,1.1,60,0,0.625,2.5,550,7,2,6]},{"id":"Fiddlesticks","name":"Fiddlesticks","title":"Effroi nocturne","tags":["Mage","Support"],"st":[650,106,34,4.7,30,1.3,55,0,0.625,2.11,480,2,3,9]},{"id":"Fiora","name":"Fiora","title":"Sublime bretteuse","tags":["Fighter","Assassin"],"st":[620,105,33,4.7,32,2.05,66,0,0.69,3.2,150,10,4,2]},{"id":"Fizz","name":"Fizz","title":"Filou des mers","tags":["Assassin","Fighter"],"st":[640,106,26,4.6,32,2.05,58,0,0.658,3.1,175,6,4,7]},{"id":"Galio","name":"Galio","title":"Colosse","tags":["Tank","Mage"],"st":[600,126,24,4.7,32,2.05,59,0,0.625,1.5,150,1,10,6]},{"id":"Gangplank","name":"Gangplank","title":"Fléau des mers","tags":["Fighter"],"st":[630,114,31,4.7,32,2.05,64,0,0.658,3.2,125,7,6,4]},{"id":"Garen","name":"Garen","title":"Force de Demacia","tags":["Fighter","Tank"],"st":[690,98,38,4.2,32,1.55,69,0,0.625,3.65,175,7,7,1]},{"id":"Gnar","name":"Gnar","title":"Chaînon manquant","tags":["Fighter","Tank"],"st":[540,79,32,3.7,30,1.3,60,0,0.625,6,175,6,5,5]},{"id":"Gragas","name":"Gragas","title":"Agitateur","tags":["Fighter","Mage"],"st":[640,115,38,5,32,2.05,64,0,0.675,2.05,125,4,7,6]},{"id":"Graves","name":"Graves","title":"Hors-la-loi","tags":["Marksman"],"st":[625,106,33,4.6,33,1.1,66,0,0.475,3,425,8,5,3]},{"id":"Gwen","name":"Gwen","title":"Couturière sacrée","tags":["Fighter"],"st":[620,115,39,4.9,32,2.05,63,0,0.69,2.25,150,7,4,5]},{"id":"Hecarim","name":"Hecarim","title":"Ombre de la guerre","tags":["Fighter","Tank"],"st":[625,106,32,5.45,32,2.05,66,0,0.67,2.5,175,8,6,4]},{"id":"Heimerdinger","name":"Heimerdinger","title":"Inventeur réputé","tags":["Mage","Support"],"st":[558,105,19,4.2,30,1.3,56,0,0.658,1.36,550,2,6,8]},{"id":"Hwei","name":"Hwei","title":"Visionnaire","tags":["Mage","Support"],"st":[580,109,21,4.7,30,1.3,54,0,0.69,2.5,550,7,1,8]},{"id":"Illaoi","name":"Illaoi","title":"Prêtresse du kraken","tags":["Fighter","Tank"],"st":[656,115,35,5,32,2.05,65,0,0.625,2.5,125,8,6,3]},{"id":"Irelia","name":"Irelia","title":"Danseuse des lames","tags":["Fighter","Assassin"],"st":[630,115,36,4.7,30,2.05,65,0,0.656,2.5,200,7,4,5]},{"id":"Ivern","name":"Ivern","title":"Aîné de la forêt","tags":["Support","Mage"],"st":[630,99,27,4.7,30,1.3,50,0,0.644,3.4,475,3,5,7]},{"id":"Janna","name":"Janna","title":"Avatar de l'air","tags":["Support","Mage"],"st":[570,90,28,4.5,30,1.3,47,0,0.625,3,550,3,5,7]},{"id":"JarvanIV","name":"Jarvan IV","title":"Exemple demacien","tags":["Fighter","Tank"],"st":[640,104,36,4.6,32,2.05,64,0,0.658,2.5,175,6,8,3]},{"id":"Jax","name":"Jax","title":"Maître d'armes","tags":["Fighter"],"st":[650,103,36,4.2,32,2.05,68,0,0.638,3.4,125,7,5,7]},{"id":"Jayce","name":"Jayce","title":"Protecteur du futur","tags":["Fighter","Marksman"],"st":[590,109,22,5,30,1.3,59,0,0.658,3,125,8,4,3]},{"id":"Jhin","name":"Jhin","title":"Virtuose","tags":["Marksman","Mage"],"st":[655,107,24,4.7,33,1.1,61,0,0.625,0,550,10,2,6]},{"id":"Jinx","name":"Jinx","title":"Gâchette folle","tags":["Marksman"],"st":[610,105,26,4.2,33,1.1,59,0,0.625,1,525,9,2,4]},{"id":"KSante","name":"K'Santé","title":"Fierté de Nazumah","tags":["Tank","Fighter"],"st":[625,120,36,5.2,30,2.1,64,0,0.688,2.5,150,8,8,7]},{"id":"Kaisa","name":"Kai'Sa","title":"Fille du Néant","tags":["Marksman","Mage"],"st":[640,102,25,4.2,33,1.1,59,0,0.644,1.8,525,8,5,3]},{"id":"Kalista","name":"Kalista","title":"Lance de la vengeance","tags":["Marksman"],"st":[560,114,24,5.2,33,1.1,57,0,0.694,4.5,525,8,2,4]},{"id":"Karma","name":"Karma","title":"Sagesse incarnée","tags":["Mage","Support"],"st":[630,109,28,5,30,1.3,49,0,0.625,2.3,525,1,7,8]},{"id":"Karthus","name":"Karthus","title":"Liche","tags":["Mage"],"st":[620,110,21,4.7,30,1.3,46,0,0.625,2.11,450,2,2,10]},{"id":"Kassadin","name":"Kassadin","title":"Chasseur du Néant","tags":["Assassin","Mage"],"st":[646,113,21,4,30,1.3,59,0,0.64,3.7,150,3,5,8]},{"id":"Katarina","name":"Katarina","title":"Lame sinistre","tags":["Assassin","Mage"],"st":[672,108,32,4.7,32,2.05,58,0,0.658,2.74,125,4,3,9]},{"id":"Kayle","name":"Kayle","title":"Vertueuse","tags":["Marksman","Mage"],"st":[670,92,26,4.2,22,1.3,50,0,0.625,1.5,175,6,6,7]},{"id":"Kayn","name":"Kayn","title":"Faucheur de l'ombre","tags":["Fighter","Assassin"],"st":[655,103,38,4.5,32,2.05,68,0,0.669,2.7,175,10,6,1]},{"id":"Kennen","name":"Kennen","title":"Cœur de la tempête","tags":["Mage"],"st":[580,98,29,4.95,30,1.3,48,0,0.625,3.4,550,6,4,7]},{"id":"Khazix","name":"Kha'Zix","title":"Faucheur du Néant","tags":["Assassin"],"st":[643,99,32,4.2,32,2.05,60,0,0.668,2.7,125,9,4,3]},{"id":"Kindred","name":"Kindred","title":"Chasseurs éternels","tags":["Marksman"],"st":[595,104,29,4.7,33,1.1,65,0,0.625,3.5,500,8,2,2]},{"id":"Kled","name":"Kled","title":"Cavalier colérique","tags":["Fighter"],"st":[410,84,35,5.2,28,2.05,65,0,0.625,3.5,125,8,2,2]},{"id":"KogMaw","name":"Kog'Maw","title":"Gueule des abysses","tags":["Marksman","Mage"],"st":[635,99,24,4.45,33,1.1,61,0,0.665,2.65,500,8,2,5]},{"id":"Leblanc","name":"LeBlanc","title":"Manipulatrice","tags":["Assassin","Mage"],"st":[598,108,22,4.2,30,1.3,55,0,0.658,1.5,525,1,4,10]},{"id":"LeeSin","name":"Lee Sin","title":"Moine aveugle","tags":["Fighter","Assassin"],"st":[645,108,36,4.5,32,2.05,66,0,0.651,3,125,8,5,3]},{"id":"Leona","name":"Leona","title":"Aube radieuse","tags":["Tank","Support"],"st":[646,101,43,4.8,32,2.05,60,0,0.625,2.9,125,4,8,3]},{"id":"Lillia","name":"Lillia","title":"Fleur timide","tags":["Fighter","Mage"],"st":[605,105,24,4.5,32,1.55,61,0,0.625,2.7,325,0,2,10]},{"id":"Lissandra","name":"Lissandra","title":"Sorcière de glace","tags":["Mage"],"st":[620,110,22,4.2,30,1.3,55,0,0.656,1.5,550,2,5,8]},{"id":"Locke","name":"Locke","title":"Exorciste cendré","tags":["Assassin","Mage"],"st":[620,109,32,4.2,32,2.05,58,0,0.688,3.3,125,6,4,2]},{"id":"Lucian","name":"Lucian","title":"Purificateur","tags":["Marksman","Assassin"],"st":[641,100,28,4.2,33,1.1,60,0,0.638,2.5,500,8,5,3]},{"id":"Lulu","name":"Lulu","title":"Sorcière féérique","tags":["Support","Mage"],"st":[565,92,26,4.6,30,1.3,47,0,0.625,2.25,550,4,5,7]},{"id":"Lux","name":"Lux","title":"Dame de lumière","tags":["Mage","Support"],"st":[580,99,21,5.2,30,1.3,54,0,0.669,3,550,2,4,9]},{"id":"Malphite","name":"Malphite","title":"Éclat du monolithe","tags":["Tank","Mage"],"st":[665,104,40,4.95,28,2.05,62,0,0.736,3.4,125,5,9,7]},{"id":"Malzahar","name":"Malzahar","title":"Prophète du Néant","tags":["Mage"],"st":[580,101,18,4.7,30,1.3,55,0,0.625,1.5,500,2,2,9]},{"id":"Maokai","name":"Maokai","title":"Tréant torturé","tags":["Tank","Support"],"st":[665,109,35,5.2,32,2.05,64,0,0.8,2.125,125,3,8,6]},{"id":"MasterYi","name":"Maître Yi","title":"Fine lame Wuju","tags":["Fighter","Assassin"],"st":[640,105,33,5,32,2.05,65,0,0.679,2.5,175,10,4,2]},{"id":"Mel","name":"Mel","title":"Reflet de l'âme","tags":["Mage","Support"],"st":[590,107,21,5.4,30,1.3,52,0,0.625,2.75,550,2,4,9]},{"id":"Milio","name":"Milio","title":"Douce flamme","tags":["Support","Mage"],"st":[560,88,26,4.6,30,1.3,48,0,0.625,3,525,2,4,8]},{"id":"MissFortune","name":"Miss Fortune","title":"Chasseuse de primes","tags":["Marksman","Mage"],"st":[625,100,25,4,33,1.1,55,0,0.656,3,550,8,2,5]},{"id":"Mordekaiser","name":"Mordekaiser","title":"Revenant de fer","tags":["Fighter","Mage"],"st":[645,104,37,4.2,32,2.05,61,0,0.625,1,175,4,6,7]},{"id":"Morgana","name":"Morgana","title":"Déchue","tags":["Support","Mage"],"st":[630,104,25,4.2,30,1.3,56,0,0.625,1.53,450,1,6,8]},{"id":"Naafiri","name":"Naafiri","title":"la meute de fer","tags":["Assassin","Fighter"],"st":[610,105,28,4.2,32,2.05,55,0,0.663,2.1,125,9,5,0]},{"id":"Nami","name":"Nami","title":"Aquamancienne","tags":["Support","Mage"],"st":[560,88,29,5.2,30,1.3,54,0,0.644,2.61,550,4,3,7]},{"id":"Nasus","name":"Nasus","title":"Gardien des sables","tags":["Fighter","Tank"],"st":[650,104,34,4.7,32,2.05,67,0,0.638,3.48,125,7,5,6]},{"id":"Nautilus","name":"Nautilus","title":"Titan des profondeurs","tags":["Tank","Support"],"st":[646,100,39,4.95,32,2.05,58,0,0.706,1,175,4,6,6]},{"id":"Neeko","name":"Neeko","title":"Caméléon curieux","tags":["Mage","Support"],"st":[610,104,21,5.2,30,1.3,48,0,0.625,3.5,550,1,1,9]},{"id":"Nidalee","name":"Nidalee","title":"Chasseresse bestiale","tags":["Assassin","Mage"],"st":[610,109,32,5,30,1.45,58,0,0.638,3.22,525,5,4,7]},{"id":"Nilah","name":"Nilah","title":"Joie incarnée","tags":["Fighter","Assassin"],"st":[570,101,27,4.2,32,2.05,58,0,0.697,1.25,225,8,4,4]},{"id":"Nocturne","name":"Nocturne","title":"Éternel cauchemar","tags":["Fighter","Assassin"],"st":[640,109,36,4.2,32,1.55,62,0,0.721,2.7,125,9,5,2]},{"id":"Nunu","name":"Nunu et Willump","title":"Le Garçon et son yéti","tags":["Tank","Mage"],"st":[610,90,29,4.2,32,2.05,61,0,0.625,2.25,125,4,6,7]},{"id":"Olaf","name":"Olaf","title":"Berzerker","tags":["Fighter","Tank"],"st":[645,119,35,4.2,32,2.05,68,0,0.72,2.7,125,9,5,3]},{"id":"Orianna","name":"Orianna","title":"Demoiselle mécanique","tags":["Mage","Support"],"st":[565,110,20,4.2,26,1.3,44,0,0.658,3.5,525,4,3,9]},{"id":"Ornn","name":"Ornn","title":"Dieu de la forge volcanique","tags":["Tank"],"st":[660,109,33,5.2,32,2.05,69,0,0.625,2,175,5,9,3]},{"id":"Pantheon","name":"Pantheon","title":"Lance éternelle","tags":["Fighter","Assassin"],"st":[650,109,40,4.95,28,2.05,64,0,0.658,2.95,175,9,4,3]},{"id":"Poppy","name":"Poppy","title":"Gardienne du marteau","tags":["Tank","Fighter"],"st":[610,110,35,5,32,2.05,56,0,0.658,2.5,125,6,7,2]},{"id":"Pyke","name":"Pyke","title":"Éventreur des abysses","tags":["Support","Assassin"],"st":[670,110,37,4.7,32,2.05,62,0,0.667,2.5,150,9,3,1]},{"id":"Qiyana","name":"Qiyana","title":"Impératrice des éléments","tags":["Assassin"],"st":[590,115,31,4.5,32,2.05,64,0,0.688,2.1,150,0,2,4]},{"id":"Quinn","name":"Quinn","title":"Ailes de Demacia","tags":["Marksman","Assassin"],"st":[565,107,28,4.7,33,1.1,59,0,0.668,3.1,525,9,4,2]},{"id":"Rakan","name":"Rakan","title":"Charmeur","tags":["Support"],"st":[610,99,30,4.9,32,2.05,62,0,0.635,3,300,2,4,8]},{"id":"Rammus","name":"Rammus","title":"Tatou blindé","tags":["Tank"],"st":[645,100,35,4.5,32,2.05,65,0,0.7,2.215,125,4,10,5]},{"id":"RekSai","name":"Rek'Sai","title":"Traqueuse du Néant","tags":["Fighter","Tank"],"st":[600,99,35,4.5,32,2.05,62,0,0.667,2,175,8,5,2]},{"id":"Rell","name":"Rell","title":"Cavalière de fer","tags":["Tank","Support"],"st":[620,104,30,4,28,1.8,55,0,0.625,2,175,0,0,0]},{"id":"Renata","name":"Renata Glasc","title":"Baronne de la chimie","tags":["Support","Mage"],"st":[545,94,27,4.7,30,1.3,49,0,0.625,2.11,550,2,6,9]},{"id":"Renekton","name":"Renekton","title":"Dévoreur des sables","tags":["Fighter","Tank"],"st":[660,111,35,5.2,28,2.05,69,0,0.665,2.75,125,8,5,2]},{"id":"Rengar","name":"Rengar","title":"Fier traqueur","tags":["Assassin","Fighter"],"st":[590,104,34,4.2,32,2.05,68,0,0.667,3,125,7,4,2]},{"id":"Riven","name":"Riven","title":"Exilée brisée","tags":["Fighter","Assassin"],"st":[630,100,33,4.4,32,2.05,64,0,0.625,3.5,125,8,5,1]},{"id":"Rumble","name":"Rumble","title":"Menace mécanisée","tags":["Fighter","Mage"],"st":[640,105,36,4.7,28,1.55,64,0,0.644,1.85,125,3,6,8]},{"id":"Ryze","name":"Ryze","title":"Mage runique","tags":["Mage"],"st":[620,124,22,4.7,32,1.3,55,0,0.658,2.11,550,2,2,10]},{"id":"Samira","name":"Samira","title":"Rose du désert","tags":["Marksman","Assassin"],"st":[630,108,26,4.7,33,1.1,57,0,0.658,3.3,500,8,5,3]},{"id":"Sejuani","name":"Sejuani","title":"Fureur du nord","tags":["Tank"],"st":[630,114,34,5.45,32,2.05,66,0,0.688,3.5,150,5,7,6]},{"id":"Senna","name":"Senna","title":"Rédemptrice","tags":["Support","Marksman"],"st":[530,89,25,4,33,1.1,50,0,0.625,2.6,600,7,2,6]},{"id":"Sett","name":"Sett","title":"Patron","tags":["Fighter","Tank"],"st":[670,114,33,4.7,28,2.05,60,0,0.625,1.75,125,8,5,1]},{"id":"Shaco","name":"Shaco","title":"Bouffon des ténèbres","tags":["Assassin"],"st":[630,99,30,4,32,2.05,63,0,0.694,3,125,8,4,6]},{"id":"Shen","name":"Shen","title":"Œil du crépuscule","tags":["Tank"],"st":[610,99,34,4.2,32,2.05,64,0,0.751,3,125,3,9,3]},{"id":"Shyvana","name":"Shyvana","title":"Demi-dragon","tags":["Fighter","Tank"],"st":[625,95,35,4,32,2.05,62,0,0.638,2,150,8,6,3]},{"id":"Singed","name":"Singed","title":"Chimiste fou","tags":["Tank","Mage"],"st":[650,96,34,4.2,32,2.05,63,0,0.7,1.9,125,4,8,7]},{"id":"Sion","name":"Sion","title":"Colosse mort-vivant","tags":["Tank","Fighter"],"st":[655,95,36,4.2,32,2.05,68,0,0.679,1.3,175,5,9,3]},{"id":"Sivir","name":"Sivir","title":"Mercenaire du désert","tags":["Marksman"],"st":[600,104,30,4,33,1.1,60,0,0.625,1.6,500,9,3,1]},{"id":"Skarner","name":"Skarner","title":"Souverain originel","tags":["Tank","Fighter"],"st":[630,110,33,4.5,32,2.05,63,0,0.625,2,150,7,8,5]},{"id":"Smolder","name":"Smolder","title":"Dragonnet flamboyant","tags":["Marksman","Mage"],"st":[575,100,24,4,33,1.1,58,0,0.638,4,550,8,2,5]},{"id":"Sona","name":"Sona","title":"Virtuose de la harpe","tags":["Support","Mage"],"st":[550,91,26,4.2,30,1.3,49,0,0.644,2.3,550,5,2,8]},{"id":"Soraka","name":"Soraka","title":"Enfant des étoiles","tags":["Support","Mage"],"st":[605,88,32,5,30,1.3,50,0,0.625,2.14,550,2,5,7]},{"id":"Swain","name":"Swain","title":"Grand général noxien","tags":["Mage","Support"],"st":[595,99,23,4.7,34,1.55,58,0,0.625,2.11,525,2,6,9]},{"id":"Sylas","name":"Sylas","title":"Révolutionnaire déchaîné","tags":["Mage","Assassin"],"st":[600,122,29,5.2,32,2.55,61,0,0.645,3.5,175,3,4,8]},{"id":"Syndra","name":"Syndra","title":"Souveraine obscure","tags":["Mage"],"st":[583,100,25,4,30,1.3,54,0,0.658,2,550,2,3,9]},{"id":"Seraphine","name":"Séraphine","title":"Chanteuse rêveuse","tags":["Support","Mage"],"st":[570,95,26,4.2,30,1.3,50,0,0.669,2,525,0,0,0]},{"id":"TahmKench","name":"Tahm Kench","title":"Roi des rivières","tags":["Tank","Support"],"st":[640,103,39,4.7,32,2.05,56,0,0.658,2.5,175,3,9,6]},{"id":"Taliyah","name":"Taliyah","title":"Tisseuse de pierres","tags":["Mage","Support"],"st":[550,104,18,4.7,28,1.3,58,0,0.658,1.36,525,1,7,8]},{"id":"Talon","name":"Talon","title":"Lame des ténèbres","tags":["Assassin"],"st":[658,109,30,4.7,36,2.05,68,0,0.625,2.9,125,9,3,1]},{"id":"Taric","name":"Taric","title":"Bouclier de Valoran","tags":["Support","Tank"],"st":[645,99,40,4.3,28,2.05,55,0,0.625,2,150,4,8,5]},{"id":"Teemo","name":"Teemo","title":"Éclaireur de Bandle","tags":["Marksman","Mage"],"st":[615,104,24,4.5,30,1.3,54,0,0.69,3.38,500,5,3,7]},{"id":"Thresh","name":"Thresh","title":"Garde aux chaînes","tags":["Support","Tank"],"st":[620,120,33,0,30,1.55,54,0,0.625,3.5,450,5,6,6]},{"id":"Tristana","name":"Tristana","title":"Canonnière yordle","tags":["Marksman","Assassin"],"st":[640,102,30,4,33,1.1,60,0,0.656,1.5,550,9,3,5]},{"id":"Trundle","name":"Trundle","title":"Roi des trolls","tags":["Fighter","Tank"],"st":[650,110,37,4.5,32,2.05,68,0,0.67,2.9,175,7,6,2]},{"id":"Tryndamere","name":"Tryndamere","title":"Roi barbare","tags":["Fighter","Assassin"],"st":[696,108,33,4.8,32,2.05,66,0,0.67,3.4,175,10,5,2]},{"id":"TwistedFate","name":"Twisted Fate","title":"Maître des cartes","tags":["Mage","Marksman"],"st":[604,108,24,4.35,30,1.3,52,0,0.625,2.5,525,6,2,6]},{"id":"Twitch","name":"Twitch","title":"Semeur de peste","tags":["Marksman","Assassin"],"st":[630,98,27,4,33,1.1,59,0,0.679,3,550,9,2,3]},{"id":"Udyr","name":"Udyr","title":"Gardien des esprits","tags":["Fighter","Tank"],"st":[664,92,31,4.7,32,2.05,62,0,0.65,3,125,8,7,4]},{"id":"Urgot","name":"Urgot","title":"Broyeur","tags":["Fighter","Tank"],"st":[655,102,36,5,32,2.05,63,0,0.625,3.75,350,8,5,3]},{"id":"Varus","name":"Varus","title":"Flèche de la vengeance","tags":["Marksman","Mage"],"st":[600,105,24,4,33,1.1,59,0,0.658,3.5,575,7,3,4]},{"id":"Vayne","name":"Vayne","title":"Chasseresse nocturne","tags":["Marksman","Assassin"],"st":[580,98,23,4.6,33,1.1,60,0,0.658,2.8,550,10,1,1]},{"id":"Veigar","name":"Veigar","title":"Seigneur des maléfices","tags":["Mage"],"st":[580,108,18,5.2,32,1.3,52,0,0.625,2.24,550,2,2,10]},{"id":"Velkoz","name":"Vel'Koz","title":"Œil du Néant","tags":["Mage","Support"],"st":[590,102,22,4.7,30,1.3,55,0,0.643,1.59,525,2,2,10]},{"id":"Vex","name":"Vex","title":"Ombre du désespoir","tags":["Mage"],"st":[590,104,23,4.45,28,1.3,54,0,0.669,1,550,0,0,0]},{"id":"Vi","name":"Vi","title":"Pacifieuse de Piltover","tags":["Fighter","Assassin"],"st":[655,105,30,4.7,32,2.05,61,0,0.644,2,125,8,5,3]},{"id":"Viego","name":"Viego","title":"Roi déchu","tags":["Fighter","Assassin"],"st":[630,109,34,4.6,32,2.05,57,0,0.658,2.75,200,6,4,2]},{"id":"Viktor","name":"Viktor","title":"Héraut de l'arcane","tags":["Mage"],"st":[600,105,23,4.4,30,1.3,53,0,0.658,2.11,525,2,4,10]},{"id":"Vladimir","name":"Vladimir","title":"Saigneur pourpre","tags":["Mage","Fighter"],"st":[600,110,24,4.5,30,1.3,55,0,0.658,2,450,2,6,8]},{"id":"Volibear","name":"Volibear","title":"Tempête impitoyable","tags":["Fighter","Tank"],"st":[650,104,35,5.2,32,2.05,65,0,0.625,2,150,7,7,4]},{"id":"Warwick","name":"Warwick","title":"Fureur déchaînée de Zaun","tags":["Fighter","Tank"],"st":[620,99,33,4.4,32,2.05,65,0,0.638,2,125,9,5,3]},{"id":"MonkeyKing","name":"Wukong","title":"Roi des singes","tags":["Fighter","Tank"],"st":[610,99,31,4.7,28,2.05,66,0,0.69,3,175,8,5,2]},{"id":"Xayah","name":"Xayah","title":"Rebelle","tags":["Marksman"],"st":[630,107,25,4.2,33,1.1,60,0,0.658,3.9,525,10,6,1]},{"id":"Xerath","name":"Xerath","title":"Mage suprême","tags":["Mage","Support"],"st":[575,106,22,4.7,30,1.3,55,0,0.658,1.36,525,1,3,10]},{"id":"XinZhao","name":"Xin Zhao","title":"Sénéchal de Demacia","tags":["Fighter","Tank"],"st":[620,106,35,4.4,32,2.05,63,0,0.645,3.5,175,8,6,3]},{"id":"Yasuo","name":"Yasuo","title":"Disgracié","tags":["Fighter","Assassin"],"st":[590,110,32,4.6,32,2.05,60,0,0.697,3.5,175,8,4,4]},{"id":"Yone","name":"Yone","title":"Inoublié","tags":["Fighter","Assassin"],"st":[620,105,33,4.6,32,2.05,62,0,0.625,3.5,175,8,4,4]},{"id":"Yorick","name":"Yorick","title":"Berger des âmes","tags":["Fighter","Tank"],"st":[650,114,36,4.5,32,2.05,62,0,0.625,2,175,6,6,4]},{"id":"Yunara","name":"Yunara","title":"Foi inébranlable","tags":["Marksman"],"st":[590,110,25,4.4,33,1.1,55,0,0.65,2,575,9,2,0]},{"id":"Yuumi","name":"Yuumi","title":"Gardienne du Grimoire","tags":["Support","Mage"],"st":[500,69,25,4.2,25,1.1,49,0,0.625,1,425,5,1,8]},{"id":"Zaahen","name":"Zaahen","title":"Incorruptible","tags":["Fighter"],"st":[640,114,36,5,32,2.05,63,0,0.625,2.5,175,8,6,1]},{"id":"Zac","name":"Zac","title":"Arme secrète","tags":["Tank","Fighter"],"st":[685,109,33,5.2,32,2.05,60,0,0.736,1.6,175,3,7,7]},{"id":"Zed","name":"Zed","title":"Maître des ombres","tags":["Assassin"],"st":[654,99,32,4.7,29,2.05,63,0,0.651,3.3,125,9,2,1]},{"id":"Zeri","name":"Zeri","title":"Étincelle de Zaun","tags":["Marksman"],"st":[600,110,24,4.2,33,1.1,56,0,0.658,2,550,8,5,3]},{"id":"Ziggs","name":"Ziggs","title":"Expert des Hexplosifs","tags":["Mage"],"st":[606,106,21,4.7,30,1.3,55,0,0.656,2,550,2,4,9]},{"id":"Zilean","name":"Zilean","title":"Gardien du Temps","tags":["Support","Mage"],"st":[574,96,24,5,30,1.3,52,0,0.658,2.13,550,2,5,8]},{"id":"Zoe","name":"Zoé","title":"Manifestation du Crépuscule","tags":["Mage"],"st":[630,106,21,4.7,30,1.3,58,0,0.658,2.5,550,1,7,8]},{"id":"Zyra","name":"Zyra","title":"Dame aux ronces","tags":["Mage","Support"],"st":[574,93,29,4.2,30,1.3,53,0,0.681,2.11,575,4,3,8]}];

  // Règles du duel (tirées au sort à chaque face-à-face)
  // Objectif du duel + défi drôle (tirés séparément)
  const OBJECTIVES = ['Premier sang', 'Premier à 2 kills'];
  // Illustrations (SVG trait néon, viewBox 64x64). Classe .a = couleur d'accent.
  const T = (x, y, s, fs) => `<text x="${x}" y="${y}" class="k"${fs ? ` style="font-size:${fs}px"` : ''}>${s}</text>`;
  const ICONS = {
    mouse: '<rect x="23" y="8" width="18" height="30" rx="9"/><path d="M32 8v9"/><path class="a" d="M12 50c8 8 32 8 40 0"/><path class="a" d="M46 46l6 4-6 4"/><path class="a" d="M18 54l-6-4 6-4"/>',
    keys: '<rect x="5" y="14" width="22" height="22" rx="5"/><rect x="37" y="14" width="22" height="22" rx="5"/>' + T(16, 31, 'Q') + T(48, 31, 'R') + '<path class="a" d="M14 44c8 10 28 10 36 0"/><path class="a" d="M45 42l5 2-1 5"/>',
    azer: '<rect x="4" y="22" width="13" height="13" rx="3"/><rect x="19" y="22" width="13" height="13" rx="3"/><rect x="34" y="22" width="13" height="13" rx="3"/><rect x="49" y="22" width="13" height="13" rx="3"/>' + T(10.5, 32.5, 'Z', 10) + T(25.5, 32.5, 'R', 10) + T(40.5, 32.5, 'A', 10) + T(55.5, 32.5, 'E', 10) + '<path class="a" d="M10 14c4-6 14-6 18 0M36 14c4-6 14-6 18 0M18 44c6 8 22 8 28 0"/>',
    flash: '<rect x="6" y="22" width="22" height="22" rx="5"/>' + T(17, 39, '?') + '<path class="a" d="M46 6l-10 22h9l-7 20 16-26h-9l7-16z"/>',
    slider: '<path d="M8 20h48M8 44h48"/><circle class="a" cx="16" cy="20" r="6"/><circle class="a" cx="48" cy="44" r="6"/>',
    finger: '<path d="M28 56V16a4 4 0 0 1 8 0v26"/><path d="M22 56c-2-8 0-14 6-16M36 34c8 0 12 6 12 12v10"/><path class="a" d="M44 10l6-4M46 18h7"/>',
    stand: '<circle cx="32" cy="11" r="5"/><path d="M32 16v21M20 27l12-5 12 5M32 37l-8 19M32 37l8 19"/><path class="a" d="M10 58h44"/>',
    dim: '<circle cx="32" cy="32" r="10"/><path class="a" d="M32 8v5M32 51v5M8 32h5M51 32h5M15 15l4 4M45 45l4 4M15 49l4-4M45 19l4-4"/>',
    mic: '<rect x="24" y="6" width="16" height="28" rx="8"/><path d="M16 28a16 16 0 0 0 32 0M32 44v10M24 56h16"/><path class="a" d="M52 14c3 4 3 10 0 14M8 14c-3 4-3 10 0 14"/>',
    pushup: '<circle cx="12" cy="28" r="5"/><path d="M17 31l32 7M23 32l-2 16M49 38l8 10"/><path class="a" d="M4 52h56"/>',
    dance: '<circle cx="28" cy="11" r="5"/><path d="M28 16l3 19M28 22l-12-9M29 23l14 3M31 35l-11 17M31 35l12 15"/><path class="a" d="M50 6v13"/><circle class="a" cx="47" cy="20" r="3"/>',
    camera: '<path d="M6 20h11l4-6h22l4 6h11v30H6z"/><circle class="a" cx="32" cy="35" r="9"/>',
    glove: '<path d="M20 56V30c0-4 6-4 6 0V14c0-4 6-4 6 0v14-16c0-4 6-4 6 0v18-14c0-4 6-4 6 0v22c0 10-6 18-15 18z"/><path class="a" d="M18 50h28"/>',
    target: '<circle cx="28" cy="36" r="18"/><circle cx="28" cy="36" r="9"/><circle class="a" cx="28" cy="36" r="2"/><path class="a" d="M58 6L32 32M50 6h8v8"/>',
    noq: '<rect x="18" y="18" width="28" height="28" rx="6"/>' + T(32, 39, 'Q') + '<circle class="a" cx="32" cy="32" r="25"/><path class="a" d="M14 14l36 36"/>',
    sword: '<path d="M50 6h8v8L28 44l-8-8z"/><path class="a" d="M14 38l12 12M10 54l8-8"/>',
    note: '<path d="M24 46V14l26-6v32"/><circle class="a" cx="18" cy="46" r="6"/><circle class="a" cx="44" cy="40" r="6"/>',
    glass: '<path d="M18 8h28l-4 48H22z"/><path class="a" d="M20 24h24"/><path class="a" d="M30 34c0 3 4 3 4 0s-2-5-2-5-2 2-2 5z"/>',
    eye: '<path d="M6 34c10 12 42 12 52 0"/><path class="a" d="M14 42l-4 5M24 46l-2 6M40 46l2 6M50 42l4 5"/>',
    shades: '<path d="M4 24h56"/><rect class="a" x="8" y="24" width="20" height="14" rx="6"/><rect class="a" x="36" y="24" width="20" height="14" rx="6"/><path d="M28 28h8"/>',
    devil: '<circle cx="32" cy="36" r="18"/><path class="a" d="M17 24l-5-14 12 9M47 24l5-14-12 9"/><path d="M24 32l5 2M40 32l-5 2M23 42c6 7 12 7 18 0"/>',
    window: '<rect x="6" y="10" width="52" height="40" rx="4"/><rect class="a" x="24" y="24" width="16" height="12" rx="2"/><path d="M6 18h52"/>',
    timer: '<circle cx="32" cy="36" r="20"/><path d="M26 8h12M32 8v8"/><path class="a" d="M32 36V24M32 36l8 6"/>',
    spells: '<rect x="6" y="18" width="24" height="24" rx="6"/><rect x="34" y="18" width="24" height="24" rx="6"/>' + T(18, 36, 'D') + T(46, 36, 'F') + '<path class="a" d="M18 50l14 8 14-8"/>',
    elbow: '<path d="M10 50l16-16 20 4"/><circle cx="26" cy="34" r="4"/><rect class="a" x="44" y="34" width="12" height="18" rx="6"/>',
    knees: '<rect x="8" y="30" width="48" height="16" rx="3"/><path d="M14 36h4M22 36h4M30 36h4M38 36h4M46 36h4"/><path class="a" d="M10 54c6-6 14-6 20 0M34 54c6-6 14-6 20 0"/>',
    switch: '<path d="M12 22h34l-8-8M52 42H18l8 8"/><circle class="a" cx="32" cy="32" r="3"/>',
    chat: '<path d="M8 12h48v28H28l-12 10v-10H8z"/>' + T(32, 31, 'GG'),
    rhyme: '<path d="M8 14h34v20H22l-8 8v-8H8z"/><path class="a" d="M30 40h26v16h-6v6l-8-6H30z"/>',
    minimap: '<rect x="8" y="8" width="48" height="48" rx="4"/><path d="M8 56L56 8"/><path class="a" d="M4 4l56 56"/>',
    laugh: '<circle cx="32" cy="32" r="22"/><path d="M22 26l6 3M42 26l-6 3"/><path class="a" d="M20 36c4 12 20 12 24 0z"/>',
    hug: '<circle cx="20" cy="12" r="5"/><circle cx="44" cy="12" r="5"/><path d="M20 17v22M44 17v22M20 26l12 6 12-6M20 39l-6 17M44 39l6 17"/><path class="a" d="M28 46c0-4 8-4 8 0 0 4-4 6-4 8 0-2-4-4-4-8z"/>',
    item: '<path d="M14 54l6-30h24l6 30z"/><path d="M24 24c0-10 16-10 16 0"/><path class="a" d="M26 38h12M32 32v12"/>',
  };

  const RULES = [
    { t: 'Souris dans ta mauvaise main', i: 'mouse' },
    { t: 'Ton adversaire choisit la touche de ton Flash', i: 'flash' },
    { t: 'Touches Q et R inversées', i: 'keys' },
    { t: 'Ton adversaire mélange tes touches A Z E R', i: 'azer' },
    { t: 'Sensibilité de la souris au minimum', i: 'slider' },
    { t: 'Sensibilité de la souris au maximum', i: 'slider' },
    { t: 'Un seul doigt sur le clavier', i: 'finger' },
    { t: 'Clavier et souris inversés de côté', i: 'switch' },
    { t: 'Joue debout, sans t\'asseoir', i: 'stand' },
    { t: 'Luminosité de l\'écran au minimum', i: 'dim' },
    { t: 'Commente toutes tes actions comme un caster', i: 'mic' },
    { t: 'Tu cries le nom de chaque sort que tu lances', i: 'mic' },
    { t: 'Chaque sbire raté = 1 pompe', i: 'pushup' },
    { t: 'Tu joues avec un accent marseillais au micro', i: 'mic' },
    { t: 'Interdit de toucher la touche Q', i: 'noq' },
    { t: 'Ton adversaire choisit tes runes', i: 'target' },
    { t: 'Ton adversaire choisit ton premier objet', i: 'item' },
    { t: 'Uniquement des auto-attaques jusqu\'au niveau 3', i: 'sword' },
    { t: '/dance obligatoire après chaque sort', i: 'dance' },
    { t: 'Caméra débloquée, la barre espace est interdite', i: 'camera' },
    { t: 'Boutons de la souris inversés (gauche ↔ droite)', i: 'mouse' },
    { t: 'Chaque fois que tu prends un coup, tu dis « aïe »', i: 'mic' },
    { t: 'Tu joues avec des gants (ou des chaussettes aux mains)', i: 'glove' },
    { t: 'Smart cast activé sur tous les sorts', i: 'flash' },
    { t: 'Tu chantes à chaque fois que tu lances ton ultime', i: 'note' },
    { t: 'Rire diabolique obligatoire à chaque kill', i: 'devil' },
    { t: 'Un œil fermé pendant tout le duel', i: 'eye' },
    { t: 'Lunettes de soleil obligatoires', i: 'shades' },
    { t: 'Jeu en fenêtré, tout petit au milieu de l\'écran', i: 'window' },
    { t: 'Toutes les 30 secondes, tu changes de main', i: 'timer' },
    { t: 'Ton adversaire choisit tes sorts d\'invocateur', i: 'spells' },
    { t: 'Souris contrôlée avec le coude pendant la première minute', i: 'elbow' },
    { t: 'Clavier posé sur tes genoux', i: 'knees' },
    { t: 'Ta main libre tient un verre d\'eau plein, interdit de renverser', i: 'glass' },
    { t: 'Chaque mort = un grand verre d\'eau cul sec', i: 'glass' },
    { t: 'Tu tapes « gg » dans le chat à chaque fois que tu meurs', i: 'chat' },
    { t: 'Tu parles uniquement en rimes au micro', i: 'rhyme' },
    { t: 'Interdit de regarder la minimap', i: 'minimap' },
    { t: 'Tu dois rire à chaque fois que ton adversaire te touche', i: 'laugh' },
    { t: 'Le perdant fait un câlin au gagnant (ou un compliment en vocal)', i: 'hug' },
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
     PRONOSTIC (estimation sur stats de base Data Dragon)
     Ce n'est PAS un winrate réel : modèle « temps pour tuer » au niveau 6,
     à partir des PV, armure, résistance magique, dégâts, vitesse d'attaque,
     portée, des notes officielles attaque/défense/magie et de la classe principale.
     ========================================================= */
  const ROLE_FACTOR = { Fighter: 1.12, Assassin: 1.12, Mage: 1, Marksman: 1, Tank: 0.85, Support: 0.7 };
  function statsArray(c) {
    const s = c.stats || {}, i = c.info || {};
    return [s.hp, s.hpperlevel, s.armor, s.armorperlevel, s.spellblock, s.spellblockperlevel,
      s.attackdamage, s.attackdamageperlevel, s.attackspeed, s.attackspeedperlevel, s.attackrange,
      i.attack, i.defense, i.magic].map((v) => Number(v) || 0);
  }
  function atLevel6(c) {
    const [hp, hpl, ar, arl, mr, mrl, ad, adl, as, asl, rng, atk, def, mag] = c.st;
    const n = 5;
    return {
      hp: hp + hpl * n, ar: ar + arl * n, mr: mr + mrl * n, ad: ad + adl * n,
      as: as * (1 + (asl * n) / 100), rng, atk, def, mag,
      role: ROLE_FACTOR[(c.tags || [])[0]] || 1,
    };
  }
  function timeToKill(a, b) {
    const dps = ((a.ad * a.as + 9 * a.atk) * 100 / (100 + b.ar) + (9 * a.mag * 100) / (100 + b.mr)) * a.role;
    let t = (b.hp * (1 + 0.035 * b.def)) / Math.max(1, dps);
    if (a.rng > b.rng + 150) t *= 0.92;
    return t;
  }
  // probabilité (0-1) que A gagne contre B, bornée entre 15 % et 85 %
  function predict(A, B) {
    if (!A.st || !B.st) return null;
    const a = atLevel6(A), b = atLevel6(B);
    const x = 3 * (Math.log(timeToKill(b, a)) - Math.log(timeToKill(a, b)));
    return Math.min(0.85, Math.max(0.15, 1 / (1 + Math.exp(-x))));
  }

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
    filter: new Set((readPref('lol1v1.filter') || '').split(',').filter(Boolean).slice(0, 1)),
    game: loadGame(),
  };

  const $ = (s) => document.querySelector(s);
  const els = {
    app: $('#app'), stage: $('.stage'), go: $('#go'), goWrap: $('#go-wrap'), goLabel: $('#go-label'),
    status: $('#status'), progress: $('.progress'), progressBar: $('#progress-bar'),
    patch: $('#patch'), mute: $('#btn-mute'), humor: $('#btn-humor'),
    faceoff: $('#faceoff'), fBlue: $('#fighter-blue'), fRed: $('#fighter-red'),
    reroll: $('#btn-reroll'),
    nameBlue: $('#name-blue'), nameRed: $('#name-red'), scoreBlue: $('#score-blue'), scoreRed: $('#score-red'),
    classBtn: $('#class-btn'), classLabel: $('#class-label'), classMenu: $('#class-menu'), classPicker: $('#class-picker'), ruleText: $('#rule-text'), ruleArt: $('#rule-art'),
    predict: $('#predict'), predictBar: $('#predict-bar'), predictBlue: $('#predict-blue'), predictRed: $('#predict-red'),
    predictBlueName: $('#predict-blue-name'), predictRedName: $('#predict-red-name'), ruleObjective: $('#rule-objective'), ruleBtn: $('#btn-rule'),
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
    toggleClassMenu(false);
    els.classPicker.classList.add('locked');

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

    const R0 = pick(RULES);
    S.lastDuel = { blue, red, rule: R0.t, icon: R0.i, objective: pick(OBJECTIVES), winner: null, pBlue: predict(blue, red) };
    S.game.history.unshift({
      blue: { id: blue.id, name: blue.name }, red: { id: red.id, name: red.name },
      rule: S.lastDuel.rule, objective: S.lastDuel.objective, winner: null, ts: Date.now(),
    });
    S.game.history = S.game.history.slice(0, 50);
    saveGame();
    renderGame();
    els.classPicker.classList.remove('locked');
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
    els.ruleObjective.textContent = S.lastDuel.objective;
    renderPrediction();
    rollRule({ t: S.lastDuel.rule, i: S.lastDuel.icon }, 900);
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
    const box = els.ruleText.closest('.rule');
    box.classList.remove('locked-in');
    box.classList.add('rolling');
    els.ruleBtn.disabled = true;
    let k = 0;
    const steps = 14;
    const next = () => {
      if (k < steps) {
        const r = pick(RULES);
        els.ruleText.textContent = r.t;
        setRuleArt(r.i);
        if (k % 2 === 0) Audio.tick('red', 0.3);
        k += 1;
        rollRule.t = setTimeout(next, 40 + k * k * 1.0);
      } else {
        els.ruleText.textContent = finalRule.t;
        setRuleArt(finalRule.i);
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

  function renderPrediction() {
    const p = S.lastDuel && S.lastDuel.pBlue;
    els.predict.hidden = p == null;
    if (p == null) return;
    const b = Math.round(p * 100), r = 100 - b;
    els.predictBlue.textContent = `${b}%`;
    els.predictRed.textContent = `${r}%`;
    els.predictBlueName.textContent = S.lastDuel.blue.name;
    els.predictRedName.textContent = S.lastDuel.red.name;
    els.predictBar.style.setProperty('--p', '50%');
    void els.predictBar.offsetWidth;
    setTimeout(() => els.predictBar.style.setProperty('--p', `${b}%`), 650);
    els.predict.classList.toggle('fav-blue', b > r);
    els.predict.classList.toggle('fav-red', r > b);
  }

  function setRuleArt(name) {
    els.ruleArt.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  function rerollRule() {
    if (!S.lastDuel) return;
    let R = pick(RULES);
    while (RULES.length > 1 && R.t === S.lastDuel.rule) R = pick(RULES);
    const r = R.t;
    S.lastDuel.rule = r;
    S.lastDuel.icon = R.i;
    if (S.game.history[0]) { S.game.history[0].rule = r; saveGame(); renderHistory(); }
    rollRule(R, 0);
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
    els.historyCount.textContent = H.length ? String(H.length) : '';
    els.historyEmpty.hidden = H.length > 0;
    els.historyList.replaceChildren(...H.map((d) => {
      const li = document.createElement('li');
      li.className = `h-item${d.winner ? ` h-item--${d.winner}` : ''}`;
      const res = d.winner ? `🏆 ${escapeHTML(playerName(d.winner))}` : 'en attente';
      li.innerHTML =
        `<div class="h-duel"><span class="h-blue">${escapeHTML(d.blue.name)}</span>` +
        `<span class="h-vs">vs</span><span class="h-red">${escapeHTML(d.red.name)}</span></div>` +
        `<div class="h-meta"><span>${escapeHTML([d.objective, d.rule].filter(Boolean).join(' · '))}</span><span class="h-res">${res}</span></div>`;
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

  /* ---------- Classe (sélecteur unique) ---------- */
  function classLabel() {
    const c = CLASSES.find(([key]) => S.filter.has(key));
    return c ? `${c[1]}s` : 'Toutes les classes';
  }

  function renderFilters() {
    const cur = [...S.filter][0] || '';
    els.classLabel.textContent = classLabel();
    els.classBtn.classList.toggle('is-on', !!cur);
    els.classMenu.innerHTML = [['', 'Toutes les classes'], ...CLASSES.map(([k, l]) => [k, `${l}s`])]
      .map(([k, l]) => `<li role="option" tabindex="-1" data-tag="${k}" aria-selected="${k === cur}">${l}</li>`).join('');
  }

  function toggleClassMenu(open) {
    const show = open === undefined ? els.classMenu.hidden : open;
    if (S.spinning && show) return;
    els.classMenu.hidden = !show;
    els.classBtn.setAttribute('aria-expanded', String(show));
  }

  function onClassPick(e) {
    const li = e.target.closest('li[data-tag]');
    if (!li || S.spinning) return;
    S.filter = new Set(li.dataset.tag ? [li.dataset.tag] : []);
    writePref('lol1v1.filter', [...S.filter].join(','));
    renderFilters();
    toggleClassMenu(false);
    if (S.ready) els.status.textContent = `${pool().length} champions · ${classLabel()}`;
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
      ...(S.lastDuel.pBlue != null ? [`📈 **Pronostic** (estimation stats de base) : ${blue.name} ${Math.round(S.lastDuel.pBlue * 100)}% – ${100 - Math.round(S.lastDuel.pBlue * 100)}% ${red.name}`] : []),
      `🎯 **Objectif** : ${S.lastDuel.objective}`,
      `🤪 **Défi** : ${S.lastDuel.rule}`,
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

  /* =========================================================
     TOGGLES
     ========================================================= */
  function renderToggles() {
    document.body.classList.toggle('humor', S.humor);
    els.humor.setAttribute('aria-pressed', String(S.humor));
    els.humor.title = `Mode Humour / BD : ${S.humor ? 'ON' : 'OFF'}`;
    els.mute.setAttribute('aria-pressed', String(S.muted));
    els.mute.classList.toggle('is-muted', S.muted);
    els.mute.title = S.muted ? 'Son coupé' : 'Son activé';
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
        .map((c) => ({ id: c.id, name: c.name, title: c.title, tags: c.tags || [], st: statsArray(c) }))
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

    idleReels();
    S.ready = true;
    setGo('ready');
    els.progress.classList.add('done');
    els.status.textContent = S.filter.size ? `${pool().length} champions · ${classLabel()}` : `${total} champions`;
  }

  /* =========================================================
     EVENTS
     ========================================================= */
  els.go.addEventListener('click', launch);
  els.reroll.addEventListener('click', launch);
  els.copy.addEventListener('click', copyDuel);
  els.close.addEventListener('click', hideFaceoff);
  els.ruleBtn.addEventListener('click', rerollRule);
  els.faceoff.addEventListener('click', (e) => {
    const b = e.target.closest('.btn-win');
    if (b) setWinner(b.dataset.side);
  });
  els.classBtn.addEventListener('click', () => toggleClassMenu());
  els.classMenu.addEventListener('click', onClassPick);
  document.addEventListener('click', (e) => { if (!els.classPicker.contains(e.target)) toggleClassMenu(false); });
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
    if (!els.classMenu.hidden) toggleClassMenu(false);
    else if (!els.history.hidden) toggleHistory(false);
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
