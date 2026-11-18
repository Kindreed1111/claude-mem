# Album Parfait Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SPA où l'on cherche un artiste Deezer, choisit sa meilleure cover, puis compose un album de 10 pistes (intro, outro, interlude, feat, 6 libres).

**Architecture:** Vite + React + TS côté client. La logique métier est pure (`classify.ts`, `album.ts`) et testée avec Vitest. Un proxy en liste blanche (`server/proxy.ts`) est partagé par les fonctions Vercel (`api/*.ts`) et un middleware Vite en dev.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Vitest 2, Vercel Functions (Web `GET(request)`), Google Fonts (Cormorant Garamond, IBM Plex Mono).

**Spec:** `album-parfait/docs/superpowers/specs/2026-11-18-album-parfait-design.md`

## Global Constraints

- Aucune donnée inventée : tout vient de `api.deezer.com`.
- Proxy : seuls `search/artist`, `artist/{id}/albums`, `album/{id}/tracks`, `track/{id}` ; autre chemin → 400 ; `Cache-Control: s-maxage=86400`.
- Relais image : seuls les hôtes `*.dzcdn.net` en https.
- Client : 6 requêtes en parallèle max, ≥125 ms entre deux départs ; `error.code === 4` → backoff 1 s, 2 s, 4 s (3 essais).
- Ordre des slots : `1 → 10 → 7 → 2 → 3,4,5,6,8,9`.
- Palette : `--olive-900 #333300`, `--olive-800 #353600`, `--olive-700 #3f4100`, `--cream #d6d5c5`, `--ink #1c1c00`.
- Mobile ≥ 360 px sans scroll horizontal.
- Projet indépendant dans `album-parfait/` : aucune modification hors de ce dossier.

## Review Focus

- Artiste ayant uniquement des singles : intro/outro passent en repli « tous les sons » avec un message. Testé en Task 2.
- Deluxe à 2 disques ou bonus en fin de disque 1 : l'outro est le dernier titre non bonus du disque 1. Testé en Task 2.
- Même titre sur standard et deluxe (« Money Trees » ×2) : une seule entrée dans le pool. Testé en Task 2.
- Quota Deezer atteint pendant l'analyse des crédits : retry puis piste ignorée, sans crash, et la progression arrive à son terme. Testé en Task 3.
- Recherche vide ou sans résultat : message « Aucun artiste trouvé », pas d'appel pour une chaîne vide. Testé en Task 5 (vérif Playwright).

---

### Task 1: Scaffold + proxy

**Files:**
- Create: `album-parfait/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `vercel.json`, `.gitignore`
- Create: `album-parfait/server/proxy.ts`, `api/deezer.ts`, `api/image.ts`
- Test: `album-parfait/server/proxy.test.ts`

**Interfaces:**
- Produces: `resolveDeezerTarget(params: URLSearchParams): string | null` (URL `https://api.deezer.com/...` ou null), `resolveImageTarget(raw: string | null): string | null`, `proxyFetch(target: string): Promise<Response>` (en-têtes cache + CORS same-origin). Route client : `GET /api/deezer?path=<chemin>&<query>` et `GET /api/image?url=<url>`.

- [ ] Test : `resolveDeezerTarget(new URLSearchParams('path=artist/525046/albums&limit=100&index=0'))` vaut `'https://api.deezer.com/artist/525046/albums?limit=100&index=0'`. `path=search/artist&q=kendrick lamar` donne q encodé. `path=user/1`, `path=artist/abc/albums` et `path=../x` → `null`. `resolveImageTarget('https://cdn-images.dzcdn.net/images/cover/x/1000x1000.jpg')` → identique ; `'https://evil.com/a.jpg'` et `'http://cdn-images.dzcdn.net/a'` → `null`.
- [ ] Lancer `npx vitest run server` → FAIL.
- [ ] Implémenter `server/proxy.ts`. Regex autorisées : `^search/artist$`, `^artist/\d+/albums$`, `^album/\d+/tracks$`, `^track/\d+$`. Paramètres conservés : `q, limit, index`.
- [ ] Ajouter `api/deezer.ts` / `api/image.ts` (`export async function GET(request: Request)`) et le plugin Vite `configureServer`, qui sert `/api/deezer` et `/api/image` avec les mêmes fonctions.
- [ ] `npx vitest run` → PASS ; `npx tsc --noEmit` → 0 erreur.
- [ ] Commit `feat(album-parfait): scaffold + proxy Deezer`.

### Task 2: Classification (pur)

**Files:**
- Create: `album-parfait/src/lib/types.ts`, `src/lib/classify.ts`
- Test: `album-parfait/src/lib/classify.test.ts`

**Interfaces:**
- Produces (types) : `Artist {id,name,picture,fans}`, `Project {id,title,cover,md5,releaseDate,recordType:'album'|'ep'|'single'|'compile'}`, `Track {id,title,titleVersion,position,disk,preview,artistId,artistName,projectId}`, `ProjectWithTracks = Project & {tracks: Track[]}`.
- Produces (fonctions) : `normalizeTitle(t: string): string`, `isOwnProject(p: ProjectWithTracks, artistId: number): boolean`, `coverChoices(ps: ProjectWithTracks[], artistId: number): Project[]`, `introCandidates(ps, artistId): Track[]`, `outroCandidates(ps, artistId): Track[]`, `buildPool(ps: ProjectWithTracks[]): Track[]`, `isInterlude(t: Track): boolean`, `isFeat(t: Track, artistId: number, contributorIds?: number[]): boolean`.

- [ ] Tests :
  - `normalizeTitle("Bitch, Don’t Kill My Vibe (Remix)")` = `normalizeTitle("Bitch, Don't Kill My Vibe (Remix)")` ; `normalizeTitle("Swimming Pools (Drank) (Extended Version)")` = `"swimming pools drank"` ; `"(Remix)"` conservé.
  - `isOwnProject` : 1 piste sur 3 de l'artiste → false ; 2 sur 3 → true.
  - `coverChoices` : exclut les projets non propres, dédoublonne par md5, trie par date décroissante.
  - `introCandidates` : premier titre du disque 1 pour album/ep/compile propres, singles exclus, dédup par titre normalisé (GKMC standard + deluxe → un seul « Sherane »).
  - `outroCandidates` : deluxe à 2 disques → dernier du disque 1 ; « X (Bonus Track) » en fin de disque 1 → titre précédent.
  - `buildPool` : « Money Trees » sur album + deluxe → 1 entrée, celle de la sortie la plus ancienne parmi le type prioritaire (album > ep > compile > single).
  - `isInterlude` : « For Free? (Interlude) » → true ; « Interludes Are Cool » → false (mot entier).
  - `isFeat` : contributeurs [artiste, autre] → true ; `artistId` de la piste différent → true ; titre « X (feat. Y) » → true ; sinon false.
- [ ] `npx vitest run src/lib/classify` → FAIL, puis implémenter, puis → PASS.
- [ ] Commit `feat(album-parfait): règles de classification`.

### Task 3: Client Deezer

**Files:**
- Create: `album-parfait/src/lib/deezer.ts`
- Test: `album-parfait/src/lib/deezer.test.ts`

**Interfaces:**
- Consumes: types Task 2.
- Produces: `createLimiter(opts:{concurrency:number; minIntervalMs:number}): <T>(fn:()=>Promise<T>)=>Promise<T>`, `dz<T>(path: string, query?: Record<string,string|number>, fetchImpl?: typeof fetch): Promise<T>`, `searchArtists(q: string): Promise<Artist[]>`, `fetchProjects(artistId: number): Promise<Project[]>`, `fetchTracks(projectId: number): Promise<Track[]>`, `fetchContributorIds(trackId: number): Promise<number[]>`.

- [ ] Tests (fetch mocké, timers factices) : `dz` reçoit `{error:{code:4}}` puis un succès → résout avec le succès après 1 s ; 4 réponses quota → rejette `DeezerQuotaError`. Le limiteur ne dépasse jamais 6 tâches simultanées. `fetchProjects` suit `next` sur 2 pages.
- [ ] FAIL → implémenter → PASS.
- [ ] Commit `feat(album-parfait): client Deezer avec limiteur et retry`.

### Task 4: État de l'album (pur)

**Files:**
- Create: `album-parfait/src/lib/album.ts`
- Test: `album-parfait/src/lib/album.test.ts`

**Interfaces:**
- Produces: `SLOT_ORDER = [1,10,7,2,3,4,5,6,8,9] as const`, `type SlotKind = 'intro'|'outro'|'interlude'|'feat'|'free'`, `kindForSlot(n: number): SlotKind`, `AlbumState {slots: Record<number, Track|null>; active: number|null}`, `initialAlbum(): AlbumState`, `albumReducer(s: AlbumState, a: {type:'place';track:Track}|{type:'open';slot:number}|{type:'clear';slot:number}): AlbumState`, `isPlaced(s: AlbumState, trackId: number): boolean`, `isComplete(s: AlbumState): boolean`.

- [ ] Tests : état initial `active === 1`. Après place → `active === 10`, puis 7, puis 2, puis 3. `open(1)` sur un slot rempli → `active === 1`, et place remplace puis renvoie vers le prochain slot vide. Placer une piste déjà posée → état inchangé. 10 placements → `isComplete` true et `active === null`.
- [ ] FAIL → implémenter → PASS.
- [ ] Commit `feat(album-parfait): reducer de l'album`.

### Task 5: DA + recherche + carrousel de covers

**Files:**
- Create: `album-parfait/src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/components/Search.tsx`, `src/components/CoverCarousel.tsx`, `src/hooks/useDiscography.ts`

**Interfaces:**
- Consumes: Task 2, 3.
- Produces: `useDiscography(artist: Artist|null): {status:'idle'|'loading'|'ready'|'error'; projects: ProjectWithTracks[]; contributors: Map<number, number[]>; creditsDone: number; creditsTotal: number}`. Charge les projets et tracklists, puis les crédits en arrière-plan, uniquement pour les pistes dont `artistId === artist.id`.
- `App` : écrans `search → covers → build → recap`, état `{artist, cover, album}`.

- [ ] Styles : tokens de la palette, grain SVG en overlay, vignette, Cormorant Garamond en minuscules, Plex Mono pour les numéros.
- [ ] Search : debounce 300 ms, aucun appel si `q.trim() === ''`, liste (photo, nom, fans), navigation ↑↓ Entrée, « Aucun artiste trouvé ».
- [ ] CoverCarousel : coverflow 3D (cover centrale à l'échelle 1, voisines `rotateY(±45deg)`), molette, glisser/swipe, ←→, clic pour centrer, bouton « choisir cette cover ».
- [ ] Vérif : `npm run dev`, recherche « kendrick lamar » ; Playwright 1440 et 390 px. Le carrousel affiche les covers de GNX… Overly Dedicated, sans « Push Thru ».
- [ ] Commit `feat(album-parfait): recherche et carrousel de covers`.

### Task 6: Builder

**Files:**
- Create: `album-parfait/src/components/AlbumBuilder.tsx`, `src/components/TrackPicker.tsx`, `src/components/PreviewPlayer.tsx`

**Interfaces:**
- Consumes: Task 2, 4, 5.
- Produces: `<AlbumBuilder projects contributors creditsDone creditsTotal artist cover album dispatch onDone />`.

- [ ] Tracklist des 10 slots à gauche (numéro mono, libellé du type, titre choisi) et panneau de choix à droite (empilé sur mobile). Candidats par kind :
  - intro/outro : `introCandidates` / `outroCandidates`, groupés par projet (cover + titre du projet) ;
  - interlude : `pool.filter(isInterlude)` ;
  - feat : `pool.filter(isFeat)`, avec progression « Analyse des crédits n/N » ;
  - libre : pool groupé par projet + filtre texte.
- [ ] Repli liste vide → tout le pool + « Aucun(e) {type} détecté(e) — choisis le son qui s'en rapproche le plus ».
- [ ] Pistes déjà placées grisées et non cliquables. Bouton ▶ (un seul `<audio>` partagé).
- [ ] Vérif Playwright : remplir les 10 slots sur Kendrick Lamar. Intro propose « wacced out murals », « Sherane… », « Wesley's Theory »… ; outro de GKMC = « Compton ».
- [ ] Commit `feat(album-parfait): builder de l'album`.

### Task 7: Récap + export PNG

**Files:**
- Create: `album-parfait/src/components/Recap.tsx`, `src/lib/exportImage.ts`

**Interfaces:**
- Produces: `renderAlbumPng(opts:{coverUrl:string; artistName:string; tracks:Track[]}): Promise<Blob>` (canvas 1080×1350, cover via `/api/image?url=`).

- [ ] Récap : grande cover, nom de l'artiste, « album parfait », tracklist 1–10, boutons « Télécharger l'image » et « Recommencer ».
- [ ] Vérif Playwright : clic export → téléchargement PNG non vide (> 50 Ko).
- [ ] Commit `feat(album-parfait): récap et export image`.
