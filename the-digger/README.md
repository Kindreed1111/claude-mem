# THE DIGGER — version hébergée (Gemini + recherche Google)

Jeu de quiz : le joueur tape un sujet, le mineur creuse à chaque bonne réponse et finit enseveli au bout de trois erreurs.

## Contenu

- `index.html` : le jeu complet (scène, sons, interface).
- `api/questions.js` : fonction serveur qui garde la clé Gemini secrète, écrit les consignes et interroge Gemini avec la recherche Google.
- `vercel.json` : durée maximale de la fonction (60 s).

## Fonctionnement des questions

1. Gemini recherche le sujet sur Google et propose des questions candidates.
2. Un second appel, lui aussi avec recherche, répond à chaque question sans connaître la réponse attendue.
3. Une question n'est posée que si les deux appels tombent sur la même réponse. Une réponse de Gemini sans résultat de recherche est rejetée.

## Déploiement sur Vercel (offre gratuite)

1. Sur vercel.com, créer un projet en important ce dépôt GitHub.
2. Régler « Root Directory » sur `the-digger`.
3. Dans Settings → Environment Variables, ajouter :
   - `GEMINI_API_KEY` : la clé API Gemini.
   - `GEMINI_MODEL` : l'identifiant d'un modèle Gemini compatible avec la recherche Google (liste sur ai.google.dev, page « Models »).
4. Déployer. La branche à déployer se choisit dans Settings → Git.

## Limites connues

- N'importe qui possédant l'adresse du jeu peut déclencher des appels facturés sur la clé (la clé elle-même reste invisible).
- La disponibilité de la recherche Google sur l'offre gratuite de Gemini dépend du modèle : à vérifier sur la page tarifs de Google.
- Si aucune question ne peut être confirmée, le jeu bascule sur 16 questions de culture générale intégrées.
