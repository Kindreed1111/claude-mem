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

## Liens courts

- `POST /api/share` `{ kind: 'album' | 'defi', album: encodeShare(album) }` stocke l'album dans Upstash
  sous un id de 8 caractères base62 tiré du sha256 du contenu (même album = même lien) et renvoie `/a/<id>`.
- `/a/<id>` (réécriture vers `api/page.ts`) sert `index.html` avec les balises Open Graph / Twitter et l'album injecté.
- `/api/og?id=<id>` : image d'aperçu PNG 1200×630 (satori + resvg-wasm, palette 256 couleurs), en cache CDN.
- Les anciens liens `#album=…` / `#defi=…` restent valables ; sans base, le partage retombe sur eux.
- En dev, sans variables Upstash, les liens courts vivent en mémoire (`server/memoryRedis.ts`).

Design : `docs/superpowers/specs/2026-11-18-album-parfait-design.md`.
