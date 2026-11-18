// Limites par IP (fenêtre fixe), comptées dans Upstash. Seuls les appels qui arrivent jusqu'à la fonction
// sont comptés : une réponse servie par le cache CDN ne coûte rien et ne compte pas.

import { clientIp, json } from './http.js';
import { pipeline, redisEnv, sha256, type RedisEnv } from './redis.js';

export interface Limit {
  bucket: string;
  max: number;
  windowSec: number;
}

export const LIMITS = {
  /** Discographie non encore en cache : ~1 + nombre de projets appels Deezer. */
  discography: { bucket: 'disco', max: 30, windowSec: 3600 },
  /** Analyse des crédits non encore en cache : jusqu'à plusieurs centaines d'appels Deezer. */
  credits: { bucket: 'credits', max: 30, windowSec: 3600 },
  /** Albums envoyés aux classements. */
  albums: { bucket: 'albums', max: 30, windowSec: 86400 },
} satisfies Record<string, Limit>;

export interface Verdict {
  ok: boolean;
  retryAfter: number;
}

/** Sans base, ou si la base ne répond pas, on laisse passer : le site reste utilisable. */
export async function checkLimit(
  request: Request,
  limit: Limit,
  env: RedisEnv | null = redisEnv(),
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<Verdict> {
  const seconds = Math.floor(now / 1000);
  const retryAfter = limit.windowSec - (seconds % limit.windowSec);
  if (!env) return { ok: true, retryAfter };
  const key = `ap:rl:${limit.bucket}:${await sha256(clientIp(request) || 'inconnu')}:${Math.floor(seconds / limit.windowSec)}`;
  try {
    const [count] = await pipeline(env, [['INCR', key], ['EXPIRE', key, String(limit.windowSec)]], fetchImpl);
    return { ok: Number(count) <= limit.max, retryAfter };
  } catch {
    return { ok: true, retryAfter };
  }
}

export const tooMany = (v: Verdict) =>
  json({ error: { message: 'Trop de requêtes, réessaie un peu plus tard.' } }, 429, 'no-store', { 'retry-after': String(v.retryAfter) });
