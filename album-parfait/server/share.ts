// Liens courts /a/<id> : l'album est stocké dans Upstash sous un identifiant tiré de son contenu,
// donc le même album (et le même type de lien) donne toujours le même lien.

import {
  decodeShare,
  isShareKind,
  normalizeShared,
  parseShortShare,
  SHORT_ID,
  type ShareKind,
  type SharedAlbum,
  type ShortShare,
} from '../src/lib/share.js';
import { json } from './http.js';
import { checkLimit, LIMITS, tooMany } from './ratelimit.js';
import { pipeline, redisEnv, type RedisEnv } from './redis.js';

const MAX_BODY = 16384;
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/** Un id ne désigne qu'un seul contenu : la réponse ne change jamais. */
export const IMMUTABLE = 'public, max-age=3600, s-maxage=2592000, stale-while-revalidate=2592000';
const MISSING = 'public, max-age=0, s-maxage=60';

export const shareKey = (id: string) => `ap:share:${id}`;

/** sha256 de « type:album normalisé », écrit en base62. */
export async function shareId(kind: ShareKind, album: SharedAlbum, length: 8 | 12 = 8): Promise<string> {
  const text = `${kind}:${JSON.stringify(normalizeShared(album))}`;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  let n = 0n;
  for (const b of digest) n = (n << 8n) | BigInt(b);
  let out = '';
  while (out.length < length) {
    out += B62[Number(n % 62n)];
    n /= 62n;
  }
  return out;
}

/** Corps attendu : { kind: 'album' | 'defi', album: <encodeShare(album)> }, validé par decodeShare. */
export function parseShareRequest(body: unknown): { kind: ShareKind; album: SharedAlbum } | null {
  const b = body as { kind?: unknown; album?: unknown };
  if (!b || !isShareKind(b.kind) || typeof b.album !== 'string') return null;
  const album = decodeShare(b.album);
  return album ? { kind: b.kind, album: normalizeShared(album) } : null;
}

/** Écrit l'album s'il n'existe pas encore ; en cas de collision (autre contenu sous le même id), passe à 12 caractères. */
export async function storeShare(env: RedisEnv, kind: ShareKind, album: SharedAlbum, fetchImpl: typeof fetch = fetch): Promise<string> {
  const value = JSON.stringify({ kind, album: normalizeShared(album) });
  for (const length of [8, 12] as const) {
    const id = await shareId(kind, album, length);
    const [, stored] = await pipeline(env, [['SET', shareKey(id), value, 'NX'], ['GET', shareKey(id)]], fetchImpl);
    if (stored === value) return id;
  }
  throw new Error('collision d’identifiant');
}

export async function loadShare(env: RedisEnv, id: string, fetchImpl: typeof fetch = fetch): Promise<ShortShare | null> {
  if (!SHORT_ID.test(id)) return null;
  const [raw] = await pipeline(env, [['GET', shareKey(id)]], fetchImpl);
  if (typeof raw !== 'string') return null;
  try {
    return parseShortShare({ ...(JSON.parse(raw) as object), id }, id);
  } catch {
    return null;
  }
}

export async function handleShare(
  request: Request,
  env: RedisEnv | null = redisEnv(),
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (request.method === 'GET') {
    const params = new URL(request.url).searchParams;
    const id = params.get('id') ?? '';
    if ([...params.keys()].length !== 1 || !SHORT_ID.test(id)) return json({ error: { message: 'identifiant invalide' } }, 400);
    if (!env) return json({ error: { message: 'partage indisponible' } }, 503);
    try {
      const share = await loadShare(env, id, fetchImpl);
      return share ? json(share, 200, IMMUTABLE) : json({ error: { message: 'album introuvable' } }, 404, MISSING);
    } catch (err) {
      return json({ error: { message: String(err) } }, 502);
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
    const parsed = parseShareRequest(body);
    if (!parsed) return json({ error: { message: 'album invalide' } }, 400);
    if (!env) return json({ error: { message: 'partage indisponible' } }, 503);
    const verdict = await checkLimit(request, LIMITS.shares, env, fetchImpl);
    if (!verdict.ok) return tooMany(verdict);
    try {
      const id = await storeShare(env, parsed.kind, parsed.album, fetchImpl);
      return json({ id, kind: parsed.kind, url: `/a/${id}` });
    } catch (err) {
      return json({ error: { message: String(err) } }, 502);
    }
  }

  return json({ error: { message: 'méthode non autorisée' } }, 405);
}
