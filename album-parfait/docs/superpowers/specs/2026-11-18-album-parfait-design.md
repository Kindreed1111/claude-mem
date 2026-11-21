# Album Parfait — Design

Date : 2026-11-18 · Statut : approuvé par l'utilisateur (« ok go »), amendé avec sa précision intro/outro.

## Intention

Site où l'utilisateur cherche un rappeur/artiste puis compose, en temps réel, « l'album parfait » de cet artiste : la cover, puis 10 pistes choisies dans sa discographie réelle.

## Objectifs

1. Barre de recherche d'artiste (écran d'accueil).
2. Choix de la meilleure cover parmi tous les projets de l'artiste, présentés dans un carrousel dynamique.
3. Construction de l'album en 10 pistes, dans l'ordre imposé par l'utilisateur :
   1. Piste 1 : meilleure **intro**. On propose **le premier titre de chaque projet** de l'artiste (précision de l'utilisateur), pas seulement les titres contenant « intro ».
   2. Piste 10 : meilleure **outro**. On propose **le dernier titre de chaque projet** (précision de l'utilisateur).
   3. Piste 7 : meilleure **interlude**. On propose toutes les pistes dont le titre contient « interlude ». S'il n'y en a aucune, on propose tous les sons.
   4. Piste 2 : meilleur **feat**. On propose toutes les pistes où un autre artiste est crédité.
   5. Pistes 3, 4, 5, 6, 8 et 9 : les 6 sons préférés.
4. Chaque slot reste cliquable pour changer le choix (« comme s'il faisait l'album en temps réel »).
5. Écran récap : cover choisie et tracklist des 10 pistes, exportable en image PNG (validé dans le design proposé).

## Non-objectifs

- Comptes utilisateurs, sauvegarde serveur, partage social.
- Écoute intégrale : Deezer ne fournit que des extraits de 30 s.

## Anti-objectifs

- Toute donnée inventée : titres, covers et crédits viennent uniquement de l'API Deezer.
- Un design générique « template » : la DA doit coller à la pochette fournie.

## Contraintes vérifiées (tests du 2026-11-18)

- `api.deezer.com` répond sans clé, mais **sans en-tête `Access-Control-Allow-Origin`**. Un appel direct depuis le navigateur sera bloqué, donc le proxy est obligatoire.
- `GET /artist/{id}/albums` renvoie tous les projets où l'artiste apparaît, avec les champs `id, title, cover_xl, md5_image, release_date, record_type`. Deux limites :
  - aucun champ `artist`. Exemple : « Push Thru » est un single de Talib Kweli où Kendrick Lamar n'est qu'invité ;
  - les projets ne sont pas triés strictement par date.
- `record_type` observé : `album`, `single`. La doc Deezer mentionne aussi `ep` et `compile`.
- `GET /album/{id}/tracks` renvoie `title, title_version, track_position, disk_number, preview, artist` (artiste principal). Il ne renvoie **pas les featurings** : les titres n'incluent pas « feat. » (ex. « luther » avec SZA).
- Un deluxe peut avoir un 2e disque bonus. Exemple, GKMC Deluxe : le disque 1 finit par « Compton », le disque 2 par « Bitch, Don't Kill My Vibe (Remix) ».
- `GET /track/{id}` renvoie `contributors` (ex. luther → Kendrick Lamar, SZA). Détecter les feats exige donc un appel par piste.
- Limite de débit Deezer : réponse JSON `{"error":{"code":4}}` (quota). Valeur communément documentée : 50 requêtes / 5 s, non vérifiée ici.
- Hébergement : Vercel (règle du repo : pas de compute Cloudflare facturé).

## Approches considérées

| Approche | Compromis | Choix |
|---|---|---|
| A. Vite + React + TS, une fonction serverless Vercel `/api/deezer` (proxy + cache CDN) | Léger, animations faciles, proxy minimal | **Retenue** (choix de Claude, design validé par l'utilisateur) |
| B. Next.js sur Vercel | Même résultat, plus lourd pour une app à un seul écran | Écartée |
| C. Page statique + proxy CORS public | Fragile et non maîtrisé | Écartée |

## Design

### Architecture

```
album-parfait/
  api/deezer.ts          Fonction Vercel : proxy en liste blanche vers api.deezer.com
  api/image.ts           Fonction Vercel : relais d'image (hôtes *.dzcdn.net uniquement) pour l'export PNG
  src/lib/deezer.ts      Client : fetch via /api/deezer, file d'attente + retry quota
  src/lib/classify.ts    Pur : projets propres, intro/outro par position, interlude, feat, normalisation, dédup
  src/lib/album.ts       Pur : état de l'album (slots, ordre des étapes, reducer)
  src/lib/exportImage.ts Rendu canvas du récap → PNG
  src/components/…       Search, CoverCarousel, AlbumBuilder, TrackPicker, Recap
  vite.config.ts         Proxy dev /api/* (pas besoin de Vercel en local)
```

- **Proxy** : n'autorise que `search/artist`, `artist/{id}/albums`, `album/{id}/tracks` et `track/{id}`. Ajoute `Cache-Control: s-maxage=86400`. Tout autre chemin renvoie 400.
- **Client Deezer** : concurrence limitée (6 requêtes en parallèle, ~8 req/s). Sur `error.code === 4`, attente avec backoff puis nouvel essai (3 fois maximum). Suit la pagination `next`.

### Données

- **Projets** : toutes les pages de `artist/{id}/albums`, puis la tracklist de chacun.
- **Projet « propre »** : au moins 50 % de ses pistes ont `artist.id` égal à l'artiste recherché. *(Choix de Claude : exclut les sorties d'autres artistes où il n'est qu'invité.)*
- **Covers** : projets propres, dédoublonnés par `md5_image`, triés par `release_date` décroissante.
- **Pool de pistes** : pistes de tous les projets, invitations comprises, dédoublonnées par titre normalisé. Normalisation : minuscules, sans accents ni ponctuation, apostrophes unifiées, sans suffixes entre parenthèses de type « Remastered », « Extended Version », « Deluxe », « Bonus Track ». Priorité de conservation : album > ep > compile > single, puis la sortie la plus ancienne. *(Choix de Claude.)*

### Règles par slot

- **Intro (piste 1)** : premier titre (`disk_number` 1, `track_position` 1) de chaque projet propre de type album, ep ou compile. *(Choix de Claude : on exclut les singles, sinon chaque single serait à la fois intro et outro.)* Dédoublonnage par titre normalisé.
- **Outro (piste 10)** : dernier titre du **disque 1** de chaque projet propre album, ep ou compile, en ignorant les pistes dont le titre ou `title_version` contient « bonus ». *(Choix de Claude : évite que le remix bonus d'un deluxe devienne l'outro.)* Dédoublonnage par titre normalisé.
- Intro et outro sont présentées groupées par projet : nom et cover du projet, puis le titre.
- **Interlude (piste 7)** : mot entier `interlude` dans le titre, insensible à la casse.
- **Feat (piste 2)** : `contributors` contient un artiste différent de l'artiste recherché, OU le titre contient `feat.`, `ft.` ou `(with `, OU l'artiste principal de la piste est un autre artiste.
- **Crédits** : chargés en arrière-plan dès la sélection de l'artiste, avec une progression affichée (« Analyse des crédits 120/200 »). Les pistes dont l'artiste principal est un autre artiste sont des feats sans appel supplémentaire. Le panneau feat se remplit au fur et à mesure.
- **Libre (3, 4, 5, 6, 8, 9)** : tout le pool, groupé par projet, avec un champ de filtre texte.

### Repli quand une catégorie est vide

- Interlude : tous les sons (demande explicite de l'utilisateur).
- Intro, outro, feat : même repli (tous les sons) avec la mention « Aucun … détecté — choisis le son qui s'en rapproche le plus ». *(Choix de Claude, par cohérence. Pour intro/outro, ce cas n'arrive que si l'artiste n'a que des singles.)*

### Parcours / états

`search → covers → build(étapes 1..5) → recap`

- **Recherche** : saisie avec debounce (300 ms), liste des artistes trouvés (photo, nom, nombre de fans), choix par clic ou clavier.
- **Étapes du builder** : `[1:intro] → [10:outro] → [7:interlude] → [2:feat] → [3,4,5,6,8,9:libre]`. Le slot actif est mis en évidence. Un clic sur un slot rempli le rouvre.
- **Pas de doublon** : une piste déjà placée est grisée dans les autres panneaux.
- **Extraits** : bouton ▶ sur chaque piste (balise `<audio>` avec l'URL `preview`, un seul extrait joué à la fois). *(Choix de Claude.)*
- **Bouton « Recommencer »** sur chaque écran.
- **Export** : canvas 1080×1350. Cover chargée via `/api/image` (évite un canvas « tainted »), nom de l'artiste, tracklist en serif, grain.

### Direction artistique

Couleurs mesurées sur la pochette fournie :

| Token | Hex | Source |
|---|---|---|
| `--olive-900` | `#333300` | centre de la pochette |
| `--olive-800` | `#353600` | bords |
| `--olive-700` | `#3f4100` | halo haut-gauche |
| `--cream` | `#d6d5c5` | texte « untitled unmastered. » |

Dérivés (choix de Claude) : `--ink #1c1c00` (fond profond), `--cream-dim` (crème à 60 %), accent blanc/noir pour l'étiquette « Parental Advisory ».

- **Typographie** : serif fine en minuscules pour les titres, comme la pochette (Cormorant Garamond via Google Fonts), et une mono discrète pour les numéros de piste (IBM Plex Mono).
- **Texture** : grain/bruit SVG en overlay, légère vignette.
- **Moderne** : grands espaces vides, transitions douces, carrousel 3D « bac à vinyles » (défilement à la molette, au glisser, au swipe et au clavier ; cover centrale agrandie, voisines inclinées).
- **Responsive** : mobile 360 px et plus.

### Tests

- Vitest sur `classify.ts` (projets propres, intro/outro par position et disque, exclusion bonus, interlude, normalisation, dédup, détection feat) et `album.ts` (ordre des étapes, pas de doublon, réouverture d'un slot).
- Vérification manuelle avec Playwright en dev (avec le proxy Vite) sur un artiste réel.

## Laissé au builder

- Les détails d'animation et les micro-interactions, dans le respect de la DA ci-dessus.
- La structure exacte des composants.
