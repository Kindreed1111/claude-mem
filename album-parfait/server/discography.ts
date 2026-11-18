// /api/discography : projets + tracklists d'un artiste en une réponse, gardée en cache par le CDN.
// Remplace la quarantaine d'appels que le navigateur faisait via /api/deezer.

import { DEEZER_DIRECT, fetchProjects, fetchTracks } from '../src/lib/deezer.js';
import type { ProjectWithTracks } from '../src/lib/types.js';
import { json, soleIdParam } from './http.js';
import { checkLimit, LIMITS, tooMany } from './ratelimit.js';
import type { RedisEnv } from './redis.js';
import { redisEnv } from './redis.js';

export interface DiscographyPayload {
  artistId: number;
  /** false si des tracklists n'ont pas pu être lues (quota) : la réponse n'est alors pas gardée longtemps. */
  complete: boolean;
  projects: ProjectWithTracks[];
}

export async function computeDiscography(artistId: number, fetchImpl: typeof fetch = fetch): Promise<DiscographyPayload> {
  const opts = { base: DEEZER_DIRECT, fetchImpl };
  const projects = await fetchProjects(artistId, opts);
  let complete = true;
  const withTracks = await Promise.all(
    projects.map(async (p) => ({
      ...p,
      tracks: await fetchTracks(p.id, opts).catch(() => {
        complete = false;
        return [];
      }),
    })),
  );
  return { artistId, complete, projects: withTracks.filter((p) => p.tracks.length > 0) };
}

/** Complet : 1 jour frais, puis encore 7 jours servi immédiatement pendant que le CDN se met à jour. */
export const LONG_CACHE = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';
export const SHORT_CACHE = 'public, s-maxage=60';

export async function handleDiscography(
  request: Request,
  fetchImpl: typeof fetch = fetch,
  env: RedisEnv | null = redisEnv(),
): Promise<Response> {
  const artistId = soleIdParam(request, 'artist');
  if (artistId === null) return json({ error: { message: 'artiste invalide' } }, 400);
  const verdict = await checkLimit(request, LIMITS.discography, env, fetchImpl);
  if (!verdict.ok) return tooMany(verdict);
  try {
    const payload = await computeDiscography(artistId, fetchImpl);
    return json(payload, 200, payload.complete ? LONG_CACHE : SHORT_CACHE);
  } catch (err) {
    return json({ error: { message: err instanceof Error ? err.message : String(err) } }, 502);
  }
}
