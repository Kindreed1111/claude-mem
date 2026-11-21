# Mur de pochettes — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** remplacer le vinyle 3D de l'accueil par un mur de pochettes réelles, cliquables, qui défilent.

**Architecture:** `GET /api/wall` (Vercel, Paris) fusionne les albums pressés récents (liste Redis `ap:recent`, alimentée par le POST `/api/stats`) et le classement rap Deezer FR, cache CDN 1 h. Le composant `CoverWall` l'affiche en 3 colonnes (bureau) ou 2 rangées (mobile), en CSS pur.

**Tech Stack:** Vite 5 / React 18 / TS 5.6, Vitest, fonctions Vercel, Upstash REST.

**Spec:** `docs/superpowers/specs/2026-11-18-mur-de-pochettes-design.md`

## Global Constraints
- Région Vercel : `"regions": ["cdg1"]`.
- Classement : `chart/116/albums`.
- Au plus 30 pochettes ; liste Redis `ap:recent` bornée à 100 (`LTRIM 0 99`).
- Cache réponse non vide : `public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` ; vide : `public, s-maxage=60`.
- Tout paramètre de requête sur `/api/wall` → 400.
- Imports relatifs côté `api/` et `server/` avec extension `.js`.
- Aucun album pressé sur la production ou la préversion pendant les tests.

## Review Focus
1. Album pressé supprimé de Deezer (`album/{id}` en erreur) → ignoré, le reste du mur s'affiche (test Task 1).
2. Album dont l'artiste Deezer ≠ artiste de l'album pressé (compilation) → ignoré (test Task 1).
3. Moins de 6 pochettes → pas de mur (Task 2, vérif visuelle).
4. Noms très longs → légende tronquée, pas de débordement mobile (Task 3, capture iPhone).
5. Copie dupliquée de la boucle : cliquable à la souris, absente du parcours clavier (`aria-hidden`, `tabIndex=-1`) (Task 2).

---

### Task 1 : serveur du mur

**Files:**
- Create : `server/wall.ts`, `api/wall.ts`, `server/wall.test.ts`
- Modify : `server/stats.ts` (`submissionCommands`), `server/server.test.ts`, `src/lib/types.ts`, `vite.config.ts`, `vercel.json`

**Interfaces:**
- Produces (`src/lib/types.ts`) : `interface WallItem { albumId: number; title: string; cover: string; coverBig: string; artist: { id: number; name: string; picture: string } }`
- Produces (`server/wall.ts`) :
  - `parseRecent(raw: unknown): Array<{ artistId: number; albumId: number }>` — chaînes `"artistId:albumId"`, invalides ignorées, dédoublonné par album, ordre conservé.
  - `mergeWall(recent: WallItem[], chart: WallItem[], max = 30): WallItem[]` — récents d'abord, dédoublonné par `albumId`.
  - `computeWall(env: RedisEnv | null, fetchImpl?): Promise<WallItem[]>`
  - `handleWall(request: Request, fetchImpl?, env?): Promise<Response>` → `{ items: WallItem[] }`
- Produces (`server/stats.ts`) : `submissionCommands` ajoute en fin `['LPUSH','ap:recent','<artistId>:<coverId>']`, `['LTRIM','ap:recent','0','99']`.

- [ ] Tests `wall.test.ts` : parseRecent (`['1:2','x','1:2','3:4']` → 2 entrées) ; mergeWall (récent prioritaire, doublon chart retiré, coupe à 30) ; handleWall : `?x=1` → 400 ; Redis `LRANGE` + albums + chart → récents puis chart, cache long ; album en erreur ignoré ; artiste ≠ ignoré ; sans Redis → chart seul ; tout vide → `items: []`, cache court. `server.test.ts` : `cmds[12]`, `cmds[13]`.
- [ ] Lancer `npx vitest run server` → échecs attendus.
- [ ] Implémenter (résolution `album/{id}` via `dz(..., DEEZER_DIRECT)` + `createLimiter({concurrency: 6, minIntervalMs: 50})`, `Promise.allSettled`).
- [ ] `api/wall.ts` (une ligne), route dev `/api/wall`, `regions` dans `vercel.json`.
- [ ] `npx vitest run` + `npx tsc -b` → verts. Commit.

### Task 2 : composant CoverWall

**Files:**
- Create : `src/lib/wall.ts`, `src/components/CoverWall.tsx`
- Modify : `src/components/Search.tsx`, `src/styles.css`

**Interfaces:**
- Consumes : `WallItem`, `GET /api/wall`.
- Produces : `fetchWall(fetchImpl?): Promise<WallItem[]>` (erreur → `[]`) ; `<CoverWall items onPick />`.

- [ ] `Search.tsx` : retire `Vinyl3D` ; charge le mur une fois ; bureau → colonne de droite ; mobile (`max-width: 860px`) → sous le champ, masqué si des résultats sont affichés ; < 6 éléments → rien.
- [ ] `CoverWall` : 3 pistes (éléments répartis en alternance), chaque piste dupliquée pour la boucle (copie `aria-hidden`, boutons `tabIndex=-1`) ; bouton `aria-label="Lancer {artiste}"` → `onPick({id, name, picture, fans: 0})` ; `img` `srcSet` 250w/500w, `loading="lazy"` ; légende artiste + album au survol/focus.
- [ ] CSS : colonnes verticales (durées 70 s / 90 s / 80 s, la 2e en sens inverse), bords fondus (`mask-image`), pause au survol et `:focus-within` (au lieu de « ralentit » : un changement de vitesse en CSS saute) ; mobile : 2 rangées horizontales, 3e piste masquée ; mouvement réduit : pas d'animation.
- [ ] `npx tsc -b`, `npm run build`. Commit.

### Task 3 : vérification et mise en ligne
- [ ] Préversion `album-parfait-preview.vercel.app` : `/api/wall` (FR, cache), temps des appels Redis (`/api/stats?artist=…`) comparés à la production actuelle.
- [ ] Captures bureau + iPhone 13 (accueil, survol, clic → covers), Lighthouse accueil mobile/bureau vs avant (67 / 87).
- [ ] Production, re-vérification, push.
