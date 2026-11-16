# THE DIGGER — version hébergée (Gemini)

Jeu de quiz : le joueur tape un sujet, le mineur creuse à chaque bonne réponse et finit enseveli au bout de trois erreurs. Un double-clic (ou double-tap) sur le mineur lance une course-poursuite dans la mine.

## Contenu

- `index.html` : le jeu complet (scène, sons, interface, quiz et course).
- `api/questions.js` : fonction serveur qui garde la clé Gemini secrète, écrit les consignes et interroge Gemini.
- `vercel.json` : durée maximale de la fonction (60 s).

## Fonctionnement des questions

1. Gemini propose des questions candidates sur le sujet, à partir de ses propres connaissances (aucun outil payant, pas de recherche Google).
2. Un second appel répond à chaque question sans connaître la réponse attendue.
3. Une question n'est posée que si les deux appels tombent sur la même réponse.
4. Pendant la course, les questions en attente passent un troisième contrôle, réponses mélangées ; au moindre doute la question est retirée.

Sans recherche web, l'exactitude repose sur les connaissances du modèle : ces contrôles réduisent les erreurs, ils ne les éliminent pas.

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
   - `GEMINI_MODEL` (facultatif) : pour imposer un modèle. Sans elle, le serveur lit la liste des modèles accessibles à la clé et essaie les modèles Flash les plus récents, puis Pro.
4. Déployer. La branche à déployer se choisit dans les réglages du projet.

## Limites connues

- N'importe qui possédant l'adresse du jeu peut déclencher des appels sur la clé (la clé elle-même reste invisible).
- Si aucune question ne peut être confirmée, le jeu bascule sur 16 questions de culture générale intégrées.
- `index.html#debug` expose l'état interne du jeu dans `window.__digger` pour les tests automatisés.
