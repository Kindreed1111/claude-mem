import { buildPool } from '../src/lib/classify.js';
import { DEEZER_DIRECT, fetchContributorIds } from '../src/lib/deezer.js';
import { computeDiscography, LONG_CACHE, SHORT_CACHE } from './discography.js';
import { json, soleIdParam } from './http.js';
import { checkLimit, LIMITS, tooMany } from './ratelimit.js';
import { redisEnv, type RedisEnv } from './redis.js';

export interface CreditsPayload {
  artistId: number;
  /** false si des pistes n'ont pas pu être analysées (quota) : la réponse n'est alors pas mise en cache longtemps. */
  complete: boolean;
  contributors: Record<number, number[]>;
}

/** Calcule, pour chaque piste « propre » de l'artiste, les id des artistes crédités. */
export async function computeCredits(artistId: number, fetchImpl: typeof fetch = fetch): Promise<CreditsPayload> {
  const disco = await computeDiscography(artistId, fetchImpl);
  let complete = disco.complete;
  const own = buildPool(disco.projects).filter((t) => t.artistId === artistId);
  const contributors: Record<number, number[]> = {};
  await Promise.all(
    own.map(async (t) => {
      try {
        contributors[t.id] = await fetchContributorIds(t.id, { base: DEEZER_DIRECT, fetchImpl });
      } catch {
        complete = false;
      }
    }),
  );
  return { artistId, complete, contributors };
}

export async function handleCredits(
  request: Request,
  fetchImpl: typeof fetch = fetch,
  env: RedisEnv | null = redisEnv(),
): Promise<Response> {
  const artistId = soleIdParam(request, 'artist');
  if (artistId === null) return json({ error: { message: 'artiste invalide' } }, 400);
  const verdict = await checkLimit(request, LIMITS.credits, env, fetchImpl);
  if (!verdict.ok) return tooMany(verdict);
  try {
    const payload = await computeCredits(artistId, fetchImpl);
    return json(payload, 200, payload.complete ? LONG_CACHE : SHORT_CACHE);
  } catch (err) {
    return json({ error: { message: err instanceof Error ? err.message : String(err) } }, 502);
  }
}
