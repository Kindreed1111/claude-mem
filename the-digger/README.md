# THE DIGGER — version hébergée (Gemini)

Jeu de quiz : le joueur tape un sujet, le mineur creuse à chaque bonne réponse et finit enseveli au bout de trois erreurs. Un double-clic (ou double-tap) sur le mineur lance une course-poursuite dans la mine.

## Contenu

- `public/index.html` : le jeu complet (scène, sons, interface, quiz et course).
- `public/data/questions.json` : la banque de questions vérifiées, chargée par le jeu.
- `scripts/generate-questions.mjs` : le script qui alimente la banque.
- `api/questions.js` : fonction serveur (clés secrètes) pour les sujets libres absents de la banque : collecte des sources, puis questions par Gemini.
- `vercel.json` : durée maximale de la fonction (60 s).

## Banque de questions

`GEMINI_API_KEY=… TAVILY_API_KEY=… npm run generate -- 40` ajoute au moins 40 questions à la banque (derrière un proxy HTTP : `NODE_USE_ENV_PROXY=1`).

1. Collecte par thème : un article de Wikipédia FR et une recherche Tavily (`search_depth: "advanced"`).
2. Gemini (`gemini-4-hydrogen`, `thinkingLevel: MEDIUM`, sortie JSON par `responseSchema`) rédige les questions à partir de ces seuls textes.
3. Contrôle en JavaScript : `sourceUrl` doit être exactement une des URLs collectées ; question de 95 caractères au plus ; 4 réponses distinctes de 35 caractères au plus et de longueur homogène ; un chiffre donné en réponse doit figurer dans le texte de la source. Sinon la question est rejetée.
4. Mode cumulatif : les questions existantes sont conservées et transmises à Gemini avec l'interdiction de reposer les mêmes faits.

Le contrôle garantit que la source citée fait partie des textes fournis ; il ne prouve pas à lui seul que chaque fait y est correctement lu.

Thèmes Rap US, Rap FR, Pop, Football, League of Legends et Culture générale : environ 30 questions chacun, rédigées à partir des introductions d'articles Wikipédia FR collectées, avec les mêmes contrôles (et, en plus, chaque mot de la bonne réponse doit figurer dans la page citée). Raccourcis acceptés dans la recherche : « lol », « foot », « rap fr », « rap us »…

### Ajouter un thème à la main (sans Gemini)

1. `node scripts/bank/collect.mjs "Mon thème=Titre exact de l'article"` (option `--lang=es` pour un autre Wikipédia) : ajoute le texte de l'article à `scripts/bank/sources.json`.
2. Écrire les questions dans `scripts/bank/q-<thème>.json` (`{"theme":"Mon thème","items":[{"d":"f|m|d","u":"<fin de l'URL>","q":"…","o":["bonne réponse","leurre","leurre","leurre"],"e":"anecdote"}]}`).
3. `node scripts/bank/build.mjs` contrôle tout (URL exacte, longueurs, mots de la réponse présents dans la page, doublons) puis `--write` ajoute les questions valides à la banque.

Règle des noms de thème (vérifiée par `build.mjs`) : le jeu reconnaît un thème sur des mots entiers seulement. Le nom complet du thème tapé seul ou dans une phrase (« quiz rap fr ») ouvre ce thème ; une partie du nom d'au moins 4 lettres (« aitana », « carti ») aussi ; un mot collé à un autre ne compte pas (« victor hugo » n'ouvre pas « Or », « k-pop » n'ouvre pas « Pop »). Le pluriel final est ignoré, et si deux thèmes correspondent, le nom le plus long gagne. `build.mjs` signale tout nom de thème qui, tapé en entier, ouvrirait un autre thème.

## Règles du quiz

- « Grand filon » (ou Entrée sans rien taper) mélange tous les thèmes ; un thème de la banque peut être choisi ou tapé. Un sujet absent de la banque passe par Gemini en direct (plus lent).
- Sources d'un sujet libre : l'article Wikipédia FR le plus proche, plus une recherche Tavily (`search_depth: "basic"`) tant que `TAVILY_API_KEY` existe et que Tavily répond. Si Tavily refuse (crédits épuisés, erreur), Wikipédia seul. Si aucune source n'est trouvée, Gemini répond de mémoire et la question n'a pas de lien.
- Le lien « Voir la source » d'une question n'est gardé que si les mots de la bonne réponse figurent dans la page citée ; sinon une autre page collectée qui les contient est citée, ou le lien est retiré.
- Difficulté selon la profondeur : Friche (0 à 25 m) facile, Galerie (25 à 70 m) moyen, Abysse (70 à 150 m) difficile, Noyau (150 m et plus) expert (mètres creusés ×2), affichée sous le panneau de profondeur. Une autre difficulté n'est jamais servie : quand toutes les questions d'une difficulté ont été vues, seuls leurs identifiants sont oubliés. Les réponses sont remélangées à chaque affichage.
- Mètres : une bonne réponse fait creuser 5, 7, 9… m ; une question difficile rapporte 25 % de plus (prime de risque).
- Jauge d'air : 15 s (Friche), 12 s (Galerie), 9 s (Abysse), 7 s (Noyau). À zéro, éboulement : une erreur.
- Outils, gagnés avec les mètres cumulés sur toutes les parties (ligne « Pelle » de l'écran de fin) : Pelle de chantier (0 m), Pioche en acier (100 m : +2 m par bonne réponse), Marteau-piqueur (250 m : +2 s d'air), Foreuse thermique (500 m : un casque réparé tous les 100 m d'une même descente). Les bonus se cumulent ; l'outil équipé est dessiné dans les mains du mineur.
- Strates : Terre & Argile (0 m), Roche & Charbon (50 m), Galerie de Cristal (150 m), Filon d'Or (300 m), Noyau Magmatique (500 m). La strate atteinte est la ligne « Filon » de l'écran de fin.
- Sans réseau, 16 questions intégrées servent de secours.

## La course

- Lancement : deux clics rapides sur le mineur, à n'importe quelle profondeur. En surface, le rival arrive par la gauche et le mineur file à droite ; sous terre, un passage s'ouvre dans la paroi de droite.
- Commandes : Espace / flèche haut / tap pour sauter (appui long = saut plus haut), flèche bas / glissé vers le bas pour glisser, Échap ou le panneau « retour » pour arrêter.
- Règles : un obstacle touché fait trébucher et rapproche le rival pendant quelques secondes ; un second choc pendant ce temps et il attrape le mineur, puis le ramène par la pelle là où il était. Le rival lance des pelletées de sable qui deviennent des obstacles. Un wagonnet rend invincible quelques secondes. Les pépites rapportent des points.
- Le quiz (et la jauge d'air) est figé pendant la course et reprend sur la même question. Les questions suivantes se préparent pendant ce temps (5 d'avance au plus).
- Records (quiz et course) enregistrés dans le navigateur du joueur.

## Déploiement sur Vercel (offre gratuite)

1. Sur vercel.com, créer un projet en important ce dépôt GitHub.
2. Régler « Root Directory » sur `the-digger`.
3. Dans Settings → Environment Variables, ajouter :
   - `GEMINI_API_KEY` : la clé API Gemini. C'est la seule valeur obligatoire.
   - `TAVILY_API_KEY` (facultatif) : ajoute des résultats web aux sources des sujets libres.
   - `GEMINI_MODEL` (facultatif) : modèle essayé en premier. S'il est refusé (quota atteint), le serveur passe aux autres modèles accessibles à la clé, chacun ayant son propre quota gratuit.
4. Déployer. La branche à déployer se choisit dans les réglages du projet.

## Limites connues

- N'importe qui possédant l'adresse du jeu peut déclencher des appels sur la clé (la clé elle-même reste invisible).
- Un sujet libre que Gemini ne confirme pas bascule sur la banque.
- `index.html#debug` expose l'état interne du jeu dans `window.__digger` pour les tests automatisés.
