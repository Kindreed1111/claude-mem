import { buildPool } from '../src/lib/classify.js';
import { DEEZER_DIRECT, fetchContributorIds, fetchProjects, fetchTracks } from '../src/lib/deezer.js';

export interface CreditsPayload {
  artistId: number;
  /** false si des pistes n'ont pas pu être analysées (quota) : la réponse n'est alors pas mise en cache longtemps. */
  complete: boolean;
  contributors: Record<number, number[]>;
}

/** Calcule, pour chaque piste « propre » de l'artiste, les id des artistes crédités. */
export async function computeCredits(artistId: number, fetchImpl: typeof fetch = fetch): Promise<CreditsPayload> {
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
  const own = buildPool(withTracks).filter((t) => t.artistId === artistId);
  const contributors: Record<number, number[]> = {};
  await Promise.all(
    own.map(async (t) => {
      try {
        contributors[t.id] = await fetchContributorIds(t.id, opts);
      } catch {
        complete = false;
      }
    }),
  );
  return { artistId, complete, contributors };
}

const json = (body: unknown, status: number, cache: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': cache },
  });

export async function handleCredits(request: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const raw = new URL(request.url).searchParams.get('artist') ?? '';
  if (!/^\d{1,12}$/.test(raw)) return json({ error: { message: 'artiste invalide' } }, 400, 'no-store');
  try {
    const payload = await computeCredits(Number(raw), fetchImpl);
    const cache = payload.complete
      ? 'public, max-age=300, s-maxage=604800, stale-while-revalidate=86400'
      : 'public, s-maxage=60';
    return json(payload, 200, cache);
  } catch (err) {
    return json({ error: { message: err instanceof Error ? err.message : String(err) } }, 502, 'no-store');
  }
}
