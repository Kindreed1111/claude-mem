// Classements des joueurs, stockés dans Upstash Redis (API REST, sans dépendance).
// Seuls des identifiants numériques sont stockés : les titres sont résolus côté client.

import { clientIp, json, soleIdParam } from './http.js';
import { checkLimit, LIMITS } from './ratelimit.js';
import { pipeline, redisEnv, sha256, type RedisEnv } from './redis.js';

export { redisEnv } from './redis.js';

export type StatKind = 'intro' | 'feat' | 'interlude' | 'outro' | 'free' | 'cover';
export const STAT_KINDS: StatKind[] = ['intro', 'feat', 'interlude', 'outro', 'free', 'cover'];
const SLOT_KIND: Record<number, StatKind> = { 1: 'intro', 2: 'feat', 7: 'interlude', 10: 'outro' };
const TOP = 10;
const MAX_BODY = 2048;

export interface Submission {
  artistId: number;
  coverId: number;
  /** Index 0 = piste 1. */
  slots: number[];
}

export interface StatsResponse {
  enabled: boolean;
  albums?: number;
  top?: Record<StatKind, Array<{ id: number; count: number }>>;
}

const isId = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0 && n < 1e13;

export function parseSubmission(body: unknown): Submission | null {
  const b = body as Submission;
  if (!b || !isId(b.artistId) || !isId(b.coverId) || !Array.isArray(b.slots) || b.slots.length !== 10) return null;
  if (!b.slots.every(isId)) return null;
  if (new Set(b.slots).size !== 10) return null;
  return { artistId: b.artistId, coverId: b.coverId, slots: [...b.slots] };
}

const key = (artistId: number, suffix: string) => `ap:${artistId}:${suffix}`;

export function submissionCommands(s: Submission): string[][] {
  const cmds = s.slots.map((trackId, i) => ['ZINCRBY', key(s.artistId, SLOT_KIND[i + 1] ?? 'free'), '1', String(trackId)]);
  cmds.push(['ZINCRBY', key(s.artistId, 'cover'), '1', String(s.coverId)]);
  cmds.push(['INCR', key(s.artistId, 'albums')]);
  return cmds;
}

function toTop(flat: unknown): Array<{ id: number; count: number }> {
  const arr = Array.isArray(flat) ? flat : [];
  const out: Array<{ id: number; count: number }> = [];
  for (let i = 0; i + 1 < arr.length; i += 2) {
    const id = Number(arr[i]);
    const count = Number(arr[i + 1]);
    if (isId(id) && Number.isFinite(count)) out.push({ id, count });
  }
  return out;
}

/** Empreinte « même IP + même album » : un album identique n'est compté qu'une fois par jour. */
const fingerprint = (request: Request, s: Submission) => sha256(`${clientIp(request)}|${JSON.stringify(s)}`);

export async function handleStats(
  request: Request,
  env: RedisEnv | null = redisEnv(),
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (!env) return json({ enabled: false } satisfies StatsResponse);

  if (request.method === 'GET') {
    const a = soleIdParam(request, 'artist');
    if (a === null) return json({ error: { message: 'artiste invalide' } }, 400);
    try {
      const results = await pipeline(
        env,
        [...STAT_KINDS.map((k) => ['ZREVRANGE', key(a, k), '0', String(TOP - 1), 'WITHSCORES']), ['GET', key(a, 'albums')]],
        fetchImpl,
      );
      const top = Object.fromEntries(STAT_KINDS.map((k, i) => [k, toTop(results[i])])) as StatsResponse['top'];
      const albums = Number(results[STAT_KINDS.length] ?? 0) || 0;
      return json({ enabled: true, albums, top } satisfies StatsResponse, 200, 'public, s-maxage=30, stale-while-revalidate=300');
    } catch (err) {
      return json({ enabled: true, error: { message: String(err) } }, 502);
    }
  }

  if (request.method === 'POST') {
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: { message: 'requête trop grosse' } }, 413);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: { message: 'JSON invalide' } }, 400);
    }
    const s = parseSubmission(body);
    if (!s) return json({ error: { message: 'album invalide' } }, 400);
    const verdict = await checkLimit(request, LIMITS.albums, env, fetchImpl);
    if (!verdict.ok) return json({ enabled: true, recorded: false, reason: 'limite du jour atteinte' }, 429);
    try {
      const fp = await fingerprint(request, s);
      const [fresh] = await pipeline(env, [['SET', `ap:seen:${fp}`, '1', 'NX', 'EX', '86400']], fetchImpl);
      if (fresh !== 'OK') return json({ enabled: true, recorded: false, reason: 'déjà compté' });
      await pipeline(env, submissionCommands(s), fetchImpl);
      return json({ enabled: true, recorded: true });
    } catch (err) {
      return json({ enabled: true, error: { message: String(err) } }, 502);
    }
  }

  return json({ error: { message: 'méthode non autorisée' } }, 405);
}
