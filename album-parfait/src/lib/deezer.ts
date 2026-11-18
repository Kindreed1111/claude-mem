import type { Artist, Project, RecordType, Track } from './types';

export class DeezerQuotaError extends Error {
  constructor() {
    super('Quota Deezer atteint');
  }
}

const RETRY_DELAYS_MS = [1000, 2000, 4000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** File d'attente : au plus `concurrency` tâches simultanées, au moins `minIntervalMs` entre deux départs. */
export function createLimiter(opts: { concurrency: number; minIntervalMs: number }) {
  let running = 0;
  let lastStart = 0;
  const queue: Array<() => void> = [];

  const pump = () => {
    if (running >= opts.concurrency || queue.length === 0) return;
    const wait = Math.max(0, lastStart + opts.minIntervalMs - Date.now());
    if (wait > 0) {
      setTimeout(pump, wait);
      return;
    }
    lastStart = Date.now();
    running++;
    queue.shift()!();
    pump();
  };

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            running--;
            pump();
          });
      });
      pump();
    });
  };
}

const limiter = createLimiter({ concurrency: 6, minIntervalMs: 125 });

type DeezerError = { error?: { code?: number; message?: string } };

/** Côté serveur : appeler Deezer directement plutôt que via le proxy /api/deezer. */
export const DEEZER_DIRECT = 'https://api.deezer.com/';

export async function dz<T>(
  path: string,
  query: Record<string, string | number> = {},
  fetchImpl: typeof fetch = fetch,
  base?: string,
): Promise<T> {
  let url: string;
  if (base) {
    const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString();
    url = base + path + (qs ? `?${qs}` : '');
  } else {
    const params = new URLSearchParams({ path });
    for (const [k, v] of Object.entries(query)) params.set(k, String(v));
    url = `/api/deezer?${params}`;
  }

  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(url);
    const body = (await res.json()) as T & DeezerError;
    if (!body.error) return body;
    if (body.error.code !== 4) throw new Error(body.error.message ?? `Erreur Deezer ${body.error.code}`);
    if (attempt >= RETRY_DELAYS_MS.length) throw new DeezerQuotaError();
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
}

export interface RequestOptions {
  fetchImpl?: typeof fetch;
  /** Annule les requêtes encore en file (ex. l'utilisateur change d'artiste). */
  signal?: AbortSignal;
  /** URL de base Deezer (serveur) ; absent = proxy /api/deezer (navigateur). */
  base?: string;
}

const limited = <T>(path: string, query: Record<string, string | number> = {}, opts: RequestOptions = {}) =>
  limiter(() =>
    opts.signal?.aborted
      ? Promise.reject(new DOMException('Requête annulée', 'AbortError'))
      : dz<T>(path, query, opts.fetchImpl, opts.base),
  );

type Page<T> = { data: T[]; next?: string };

async function allPages<T>(path: string, opts?: RequestOptions): Promise<T[]> {
  const out: T[] = [];
  let index = 0;
  for (;;) {
    const page = await limited<Page<T>>(path, { limit: 100, index }, opts);
    out.push(...page.data);
    if (!page.next || page.data.length === 0) return out;
    index = Number(new URL(page.next).searchParams.get('index') ?? out.length);
  }
}

type RawArtist = { id: number; name: string; picture_medium: string; nb_fan: number };
type RawAlbum = { id: number; title: string; cover_xl: string; md5_image: string; release_date: string; record_type: string };
type RawTrack = {
  id: number;
  title: string;
  title_version?: string;
  track_position: number;
  disk_number: number;
  preview: string;
  rank?: number;
  artist: { id: number; name: string };
};

export async function searchArtists(q: string, opts?: RequestOptions): Promise<Artist[]> {
  const res = await limited<Page<RawArtist>>('search/artist', { q, limit: 12 }, opts);
  return res.data.map((a) => ({ id: a.id, name: a.name, picture: a.picture_medium, fans: a.nb_fan }));
}

const RECORD_TYPES: RecordType[] = ['album', 'ep', 'single', 'compile'];

export async function fetchProjects(artistId: number, opts?: RequestOptions): Promise<Project[]> {
  const raw = await allPages<RawAlbum>(`artist/${artistId}/albums`, opts);
  return raw.map((a) => ({
    id: a.id,
    title: a.title,
    cover: a.cover_xl,
    md5: a.md5_image,
    releaseDate: a.release_date,
    recordType: (RECORD_TYPES as string[]).includes(a.record_type) ? (a.record_type as RecordType) : 'album',
  }));
}

export async function fetchTracks(projectId: number, opts?: RequestOptions): Promise<Track[]> {
  const raw = await allPages<RawTrack>(`album/${projectId}/tracks`, opts);
  return raw.map((t) => ({
    id: t.id,
    title: t.title,
    titleVersion: t.title_version ?? '',
    position: t.track_position,
    disk: t.disk_number,
    preview: t.preview,
    artistId: t.artist.id,
    artistName: t.artist.name,
    projectId,
    rank: t.rank ?? 0,
  }));
}

export async function fetchContributorIds(trackId: number, opts?: RequestOptions): Promise<number[]> {
  const t = await limited<{ contributors?: Array<{ id: number }> }>(`track/${trackId}`, {}, opts);
  return (t.contributors ?? []).map((c) => c.id);
}

/** Extrait de 30 s à jour (les URL Deezer expirent au bout de quelques heures). */
export async function fetchPreview(trackId: number, opts?: RequestOptions): Promise<string> {
  const t = await limited<{ preview?: string }>(`track/${trackId}`, {}, opts);
  return t.preview ?? '';
}
