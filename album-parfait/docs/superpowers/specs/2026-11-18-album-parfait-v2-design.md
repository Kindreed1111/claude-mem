# Album Parfait v2 — ajouts

Date : 2026-11-18 · Demande : « fais tout et rajoute des éléments 3D ou animations cool dans la DA ».
Décisions de l'utilisateur : classements **oui** (il installe Upstash Redis sur Vercel), domaine perso **non**.

## Fonctionnalités

| # | Fonction | Choix de mise en œuvre (choix de Claude sauf mention) |
|---|---|---|
| 1 | Lien de partage | `#album=<base64url(JSON)>` : artiste, cover (URL vérifiée `*.dzcdn.net`), 10 pistes (id, titre). Rien n'est envoyé au serveur. |
| 2 | Sauvegarde locale | `localStorage` : brouillon en cours (`ap:draft`) + 8 derniers albums terminés (`ap:history`), affichés sur l'accueil. Tolère un stockage indisponible. |
| 3 | Formats d'export | portrait 1080×1350, story 1080×1920, carré 1080×1080. |
| 4 | Écoute de l'album | enchaîne les 10 extraits de 30 s. Les URL d'extrait Deezer expirent : URL fraîche via `track/{id}` avant lecture. |
| 5 | Vinyle qui tourne | scène Three.js sur le récap : pochette = cover choisie, vinyle qui sort et tourne pendant l'écoute ; titre en cours affiché. |
| 6 | Liens d'écoute | `https://www.deezer.com/track/{id}` sur chaque piste du récap. |
| 7 | Tri | projet (défaut, groupé), popularité (`rank` Deezer), date. |
| 8 | Filtre par projet | puces par projet + « masquer les singles », appliqués à tous les panneaux sauf intro/outro. |
| 9 | Réordonner | pistes libres 3, 4, 5, 6, 8, 9 : glisser-déposer + boutons ↑↓ (mobile/clavier). L'interlude reste en 7. |
| 10 | Changer la cover | bouton sur le récap → carrousel → retour au récap. |
| 11 | Duel | `#defi=<payload>` : l'ami compose l'album du même artiste, puis écran de comparaison (cover + 10 pistes, communs/différents, score). |
| 12 | Classements | `/api/stats` (Upstash Redis REST, `ZINCRBY`). Stocke uniquement des id numériques ; titres résolus côté client. Dédoublonnage 24 h par empreinte (IP + album). Sans variables Upstash : désactivé proprement. Podium sur le récap + badge « choisi N fois » dans les panneaux. |
| 13 | Mode 1v1 | dans un panneau : 8 candidats tirés au hasard, tournoi à élimination, le gagnant est placé. |
| 14 | Lien public | désactivation de la protection Vercel du projet. |
| 16 | Feats plus rapides | `/api/credits?artist=id` calcule les crédits côté serveur, cache CDN 7 jours (`stale-while-revalidate`). Le client lance aussi son analyse si le serveur n'a pas répondu en 3 s ; le premier arrivé gagne. |

Non fait : 15 (domaine perso), refusé par l'utilisateur.

## 3D et animations (dans la DA olive/crème)

- Accueil : vinyle 3D (Three.js) à moitié sorti d'une pochette olive « album parfait. », incliné selon la souris, rotation lente.
- Récap : même scène avec la cover choisie ; le disque sort et tourne pendant l'écoute.
- Titre d'accueil révélé mot à mot (montée + flou).
- Pistes du builder : bascule « split-flap » quand un titre est placé.
- Transitions d'écran : View Transitions API si disponible.
- Grain animé (scintillement de pellicule) et halo de lampe qui suit le curseur.
- Carrousel : reflet au sol.
- `prefers-reduced-motion` : animations coupées, scènes 3D figées. Sans WebGL : image statique.
- Three.js chargé à la demande (import dynamique) pour garder la première page légère.
