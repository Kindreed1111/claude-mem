// Classements des joueurs, stockés dans Upstash Redis (API REST, sans dépendance).
// Seuls des identifiants numériques sont stockés : les titres sont résolus côté client.

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

export interface RedisEnv {
  url: string;
  token: string;
}

export function redisEnv(env: Record<string, string | undefined> = process.env): RedisEnv | null {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
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

async function pipeline(env: RedisEnv, commands: string[][], fetchImpl: typeof fetch): Promise<unknown[]> {
  const res = await fetchImpl(`${env.url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const out = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(`Upstash : ${failed.error}`);
  return out.map((r) => r.result);
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

async function fingerprint(request: Request, s: Submission): Promise<string> {
  const ip = (request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '').split(',')[0].trim();
  const data = new TextEncoder().encode(`${ip}|${JSON.stringify(s)}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

const json = (body: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': cache } });

export async function handleStats(
  request: Request,
  env: RedisEnv | null = redisEnv(),
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (!env) return json({ enabled: false } satisfies StatsResponse);

  if (request.method === 'GET') {
    const raw = new URL(request.url).searchParams.get('artist') ?? '';
    if (!/^\d{1,12}$/.test(raw)) return json({ error: { message: 'artiste invalide' } }, 400);
    const a = Number(raw);
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
