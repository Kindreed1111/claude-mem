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

## Règles du quiz

- « Grand filon » (ou Entrée sans rien taper) mélange tous les thèmes ; un thème de la banque peut être choisi ou tapé. Un sujet absent de la banque passe par Gemini en direct (plus lent).
- Sources d'un sujet libre : l'article Wikipédia FR le plus proche, plus une recherche Tavily (`search_depth: "basic"`) tant que `TAVILY_API_KEY` existe et que Tavily répond. Si Tavily refuse (crédits épuisés, erreur), Wikipédia seul. Si aucune source n'est trouvée, Gemini répond de mémoire et la question n'a pas de lien.
- Le lien « Voir la source » d'une question n'est gardé que si les mots de la bonne réponse figurent dans la page citée ; sinon une autre page collectée qui les contient est citée, ou le lien est retiré.
- Difficulté selon la profondeur : facile jusqu'au niveau 5, moyen jusqu'au niveau 10, difficile ensuite. Les réponses sont remélangées à chaque affichage ; les questions déjà vues (mémorisées dans le navigateur) passent en dernier.
- Jauge d'air : 15 s par question, moins en profondeur (9 s au minimum). À zéro, éboulement : une erreur.
- Strates : Terre & Argile (0 m), Roche & Charbon (50 m), Galerie de Cristal (150 m), Filon d'Or (300 m), Noyau Magmatique (500 m). La strate atteinte est la ligne « Filon » de l'écran de fin.
- Fièvre de l'or : à partir de 3 bonnes réponses d'affilée ; toutes les 5, un casque perdu est rendu.
- Sans réseau, 16 questions intégrées servent de secours.

## La course

- Lancement : deux clics rapides sur le mineur, à n'importe quelle profondeur. En surface, le rival arrive par la gauche et le mineur file à droite ; sous terre, un passage s'ouvre dans la paroi de droite.
- Commandes : Espace / flèche haut / tap pour sauter (appui long = saut plus haut), flèche bas / glissé vers le bas pour glisser, Échap ou le panneau « retour » pour arrêter.
- Règles : un obstacle touché fait trébucher et rapproche le rival pendant quelques secondes ; un second choc pendant ce temps et il attrape le mineur, puis le ramène par la pelle là où il était. Le rival lance des pelletées de sable qui deviennent des obstacles. Un wagonnet rend invincible quelques secondes. Les pépites rapportent des points.
- Le quiz est figé pendant la course et reprend sur la même question. Les questions suivantes se préparent pendant ce temps (5 d'avance au plus).
- Records (quiz et course) enregistrés dans le navigateur du joueur.

## Déploiement sur Vercel (offre gratuite)

1. Sur vercel.com, créer un projet en important ce dépôt GitHub.
2. Régler « Root Directory » sur `the-digger`.
3. Dans Settings → Environment Variables, ajouter :
   - `GEMINI_API_KEY` : la clé API Gemini. C'est la seule valeur obligatoire.
   - `TAVILY_API_KEY` (facultatif) : ajoute des résultats web aux sources des sujets libres.
   - `GEMINI_MODEL` (facultatif) : pour imposer un modèle. Sans elle, le serveur lit la liste des modèles accessibles à la clé et essaie les modèles Flash les plus récents, puis Pro.
4. Déployer. La branche à déployer se choisit dans les réglages du projet.

## Limites connues

- N'importe qui possédant l'adresse du jeu peut déclencher des appels sur la clé (la clé elle-même reste invisible).
- Un sujet libre que Gemini ne confirme pas bascule sur la banque.
- `index.html#debug` expose l'état interne du jeu dans `window.__digger` pour les tests automatisés.
