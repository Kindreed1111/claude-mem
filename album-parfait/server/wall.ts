// /api/wall : pochettes du mur de l'accueil. D'abord les albums pressés récemment par les visiteurs
// (liste Redis alimentée par /api/stats), puis le classement rap Deezer pour compléter.
// La fonction tourne à Paris (vercel.json) : Deezer y renvoie son classement France.

import { createLimiter, DEEZER_DIRECT, dz } from '../src/lib/deezer.js';
import type { WallItem } from '../src/lib/types.js';
import { json } from './http.js';
import { pipeline, redisEnv, type RedisEnv } from './redis.js';
import { RECENT_KEY, RECENT_MAX } from './stats.js';

export const WALL_MAX = 30;
const RAP_CHART = 'chart/116/albums';
export const WALL_CACHE = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
const EMPTY_CACHE = 'public, s-maxage=60';

type RawAlbum = {
  id: number;
  title: string;
  cover_medium: string;
  cover_big: string;
  artist: { id: number; name: string; picture_medium?: string };
};

const isId = (n: number) => Number.isInteger(n) && n > 0 && n < 1e13;

/** Entrées `"artistId:albumId"` ; invalides ignorées, dédoublonnées par album, ordre conservé. */
export function parseRecent(raw: unknown): Array<{ artistId: number; albumId: number }> {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const out: Array<{ artistId: number; albumId: number }> = [];
  for (const entry of raw) {
    const m = typeof entry === 'string' ? /^(\d{1,13}):(\d{1,13})$/.exec(entry) : null;
    if (!m) continue;
    const artistId = Number(m[1]);
    const albumId = Number(m[2]);
    if (!isId(artistId) || !isId(albumId) || seen.has(albumId)) continue;
    seen.add(albumId);
    out.push({ artistId, albumId });
  }
  return out;
}

/** Albums pressés d'abord, puis le classement ; une pochette par album, `max` au plus. */
export function mergeWall(recent: WallItem[], chart: WallItem[], max = WALL_MAX): WallItem[] {
  const seen = new Set<number>();
  const out: WallItem[] = [];
  for (const item of [...recent, ...chart]) {
    if (seen.has(item.albumId)) continue;
    seen.add(item.albumId);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

function toItem(a: RawAlbum): WallItem | null {
  if (!a || !isId(a.id) || !a.cover_medium || !a.cover_big || !a.artist || !isId(a.artist.id)) return null;
  return {
    albumId: a.id,
    title: a.title,
    cover: a.cover_medium,
    coverBig: a.cover_big,
    artist: { id: a.artist.id, name: a.artist.name, picture: a.artist.picture_medium ?? '' },
  };
}

async function recentItems(env: RedisEnv | null, fetchImpl: typeof fetch): Promise<WallItem[]> {
  if (!env) return [];
  const [raw] = await pipeline(env, [['LRANGE', RECENT_KEY, '0', String(RECENT_MAX - 1)]], fetchImpl);
  const entries = parseRecent(raw).slice(0, WALL_MAX);
  // Titre, pochette et artiste viennent de Deezer : rien de ce qu'a envoyé le visiteur n'est affiché.
  const limit = createLimiter({ concurrency: 6, minIntervalMs: 50 });
  const settled = await Promise.allSettled(
    entries.map((e) => limit(() => dz<RawAlbum>(`album/${e.albumId}`, {}, fetchImpl, DEEZER_DIRECT))),
  );
  return settled.flatMap((r, i) => {
    if (r.status !== 'fulfilled') return [];
    const item = toItem(r.value);
    // Compilation ou album d'un autre artiste : le clic lancerait le mauvais artiste.
    return item && item.artist.id === entries[i].artistId ? [item] : [];
  });
}

async function chartItems(fetchImpl: typeof fetch): Promise<WallItem[]> {
  const res = await dz<{ data: RawAlbum[] }>(RAP_CHART, { limit: WALL_MAX }, fetchImpl, DEEZER_DIRECT);
  return (res.data ?? []).flatMap((a) => toItem(a) ?? []);
}

export async function computeWall(env: RedisEnv | null, fetchImpl: typeof fetch = fetch): Promise<WallItem[]> {
  const [recent, chart] = await Promise.all([
    recentItems(env, fetchImpl).catch(() => []),
    chartItems(fetchImpl).catch(() => []),
  ]);
  return mergeWall(recent, chart);
}

export async function handleWall(
  request: Request,
  fetchImpl: typeof fetch = fetch,
  env: RedisEnv | null = redisEnv(),
): Promise<Response> {
  if (new URL(request.url).search !== '') return json({ error: { message: 'paramètres inattendus' } }, 400);
  const items = await computeWall(env, fetchImpl);
  return json({ items }, 200, items.length ? WALL_CACHE : EMPTY_CACHE);
}
