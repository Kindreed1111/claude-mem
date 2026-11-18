# Accueil : mur de pochettes (remplace le vinyle 3D)

## Pourquoi
Le vinyle 3D de l'accueil se fond dans le décor olive et n'apporte rien (retour utilisateur). On le remplace par un mur de vraies pochettes : de la couleur sur le fond, la démonstration immédiate de ce que fait le site, et un raccourci (clic = lance l'artiste).

## Objectifs / non-objectifs
- Objectif : mur de pochettes réelles, cliquables, qui défilent lentement à droite de l'accueil.
- Objectif : contenu = albums pressés par les visiteurs, complétés par le classement rap Deezer **France**.
- Non-objectif : toucher au vinyle 3D du récap (il reste).
- Anti-objectif : un mur qui se fond lui aussi dans le décor ; un accueil plus lourd qu'avant.

## Approches considérées
1. **Mur de pochettes** — choisi par l'utilisateur.
2. Vinyle réactif (photo de l'artiste sur la pochette) — garde le coût de la 3D sur l'accueil.
3. Accueil épuré sans visuel — ne donne pas de raison de rester.

Remplissage au démarrage : classement rap Deezer FR (choisi). Vérifié par une sonde déployée à Paris (`cdg1`) : Deezer y détecte `FR` et renvoie SDM, Niro, Ninho, Tiakola, PNL, Laylow… ; depuis un serveur US il renvoie Aesop Rock, Offset, Insane Clown Posse.

## Décisions
- **Région** (mon choix) : tout le projet Vercel passe à Paris (`"regions": ["cdg1"]`). Seul moyen vérifié d'obtenir les données Deezer France ; recherche et extraits deviennent aussi ceux de Deezer France. Latence vers Upstash : région de la base = information manquante, mesurée après déploiement de test.
- **Serveur** : `GET /api/wall`, sans paramètre (tout paramètre → 400, clé de cache fixe). Renvoie jusqu'à 30 pochettes `{albumId, title, cover, artist:{id,name,picture}}`. Ordre : albums pressés récents (dédoublonnés par album) puis classement `chart/116/albums` pour compléter. Cache CDN `s-maxage=3600, stale-while-revalidate=86400`. Échec Deezer/Redis → ce qui est disponible, liste vide au pire.
- **Albums pressés** : le POST `/api/stats` déjà validé (anti-doublon + limite 30/jour) ajoute `LPUSH ap:recent "artistId:coverId"` + `LTRIM 0 99`. Le serveur du mur résout ces identifiants via Deezer `album/{id}` (titre, pochette, artiste réels — rien de fourni par le client n'est affiché).
- **Affichage (bureau)** : 3 colonnes qui défilent verticalement à des vitesses différentes (boucle CSS), bords haut/bas fondus dans l'olive, pochettes en couleur. Survol : la colonne ralentit, la pochette se soulève et affiche artiste + album. Clic → même parcours qu'une recherche.
- **Mobile** : bande horizontale de 2 rangées qui défile, sous le champ de recherche ; masquée pendant l'affichage des résultats.
- **Mouvement réduit** : grille fixe, sans défilement.
- **Accessibilité** : boutons « Lancer {artiste} » ; défilement en pause au focus clavier.
- **Poids** : three.js n'est plus chargé sur l'accueil ; vignettes 250 px (500 px sur écrans haute densité), chargement différé.
- **Sans données** : mur absent, accueil épuré.

## Vérification
- Tests unitaires : fusion/dédoublonnage/remplissage, commandes Redis du POST, 400 sur paramètre, en-têtes de cache.
- Déploiement de test sur `album-parfait-preview.vercel.app` (aucun album pressé pendant les tests), captures bureau + mobile, Lighthouse accueil avant/après, puis production.

## Laissé au constructeur
Vitesses, tailles exactes des vignettes, nombre d'éléments affichés par colonne.
