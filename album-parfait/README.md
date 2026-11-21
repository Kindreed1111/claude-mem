# album parfait.

Cherche un artiste Deezer, choisis sa meilleure cover, compose son album parfait en 10 pistes
(1 intro · 2 feat · 7 interlude · 10 outro · 6 sons libres), puis exporte-le en image.

## Lancer

```bash
npm install
npm run dev
```

Derrière un proxy HTTP (Node ≥ 22.21) : `NODE_USE_ENV_PROXY=1 npm run dev`.

## Tests

```bash
npm test
npm run typecheck
```

## Déployer (Vercel)

Importer le dossier `album-parfait/` comme projet Vercel (framework Vite).
Les fonctions `api/deezer.ts` et `api/image.ts` servent de proxy en liste blanche vers l'API Deezer,
qui n'envoie pas d'en-tête CORS.

Design : `docs/superpowers/specs/2026-11-18-album-parfait-design.md`.
