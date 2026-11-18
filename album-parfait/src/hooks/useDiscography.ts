import { useEffect, useState } from 'react';
import { buildPool } from '../lib/classify';
import { fetchContributorIds, fetchProjects, fetchTracks } from '../lib/deezer';
import type { Artist, ProjectWithTracks } from '../lib/types';

export interface Discography {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  projects: ProjectWithTracks[];
  loaded: number;
  total: number;
  contributors: Map<number, number[]>;
  creditsDone: number;
  creditsTotal: number;
}

const SERVER_GRACE_MS = 3000;

async function fetchServerCredits(artistId: number, signal: AbortSignal): Promise<Map<number, number[]> | null> {
  try {
    const r = await fetch(`/api/credits?artist=${artistId}`, { signal });
    if (!r.ok) return null;
    const body = (await r.json()) as { contributors?: Record<string, number[]>; complete?: boolean };
    if (!body.contributors || body.complete === false) return null;
    return new Map(Object.entries(body.contributors).map(([k, v]) => [Number(k), v]));
  } catch {
    return null;
  }
}

const EMPTY: Discography = {
  status: 'idle',
  error: null,
  projects: [],
  loaded: 0,
  total: 0,
  contributors: new Map(),
  creditsDone: 0,
  creditsTotal: 0,
};

/** Charge projets + tracklists, puis analyse les crédits (featurings) en arrière-plan. */
export function useDiscography(artist: Artist | null): Discography {
  const [state, setState] = useState<Discography>(EMPTY);

  useEffect(() => {
    if (!artist) {
      setState(EMPTY);
      return;
    }
    let alive = true;
    const ctrl = new AbortController();
    const opts = { signal: ctrl.signal };
    const set = (patch: Partial<Discography>) => alive && setState((s) => ({ ...s, ...patch }));
    setState({ ...EMPTY, status: 'loading' });

    (async () => {
      const projects = await fetchProjects(artist.id, opts);
      set({ total: projects.length });
      let loaded = 0;
      const withTracks = await Promise.all(
        projects.map(async (p) => {
          const tracks = await fetchTracks(p.id, opts).catch(() => []);
          set({ loaded: ++loaded });
          return { ...p, tracks };
        }),
      );
      if (!alive) return;
      const usable = withTracks.filter((p) => p.tracks.length > 0);
      set({ status: 'ready', projects: usable });

      // Les pistes dont l'artiste principal est un autre sont déjà des feats : pas besoin de les analyser.
      const toAnalyze = buildPool(usable).filter((t) => t.artistId === artist.id);
      set({ creditsTotal: toAnalyze.length });

      // 1) Le serveur garde l'analyse en cache : instantané si quelqu'un a déjà cherché cet artiste.
      const clientCtrl = new AbortController();
      ctrl.signal.addEventListener('abort', () => clientCtrl.abort());
      let serverDone = false;
      const server = fetchServerCredits(artist.id, ctrl.signal).then((map) => {
        if (!alive || !map) return;
        serverDone = true;
        clientCtrl.abort();
        set({ contributors: map, creditsDone: toAnalyze.length });
      });
      await Promise.race([server, new Promise((r) => setTimeout(r, SERVER_GRACE_MS))]);
      if (serverDone || !alive) return;

      // 2) Sinon, analyse progressive dans le navigateur (le premier des deux qui finit gagne).
      const contributors = new Map<number, number[]>();
      let done = 0;
      let lastFlush = 0;
      await Promise.all(
        toAnalyze.map(async (t) => {
          const ids = await fetchContributorIds(t.id, { signal: clientCtrl.signal }).catch(() => [] as number[]);
          if (!alive || serverDone) return;
          contributors.set(t.id, ids);
          done++;
          if (done === toAnalyze.length || Date.now() - lastFlush > 400) {
            lastFlush = Date.now();
            set({ contributors: new Map(contributors), creditsDone: done });
          }
        }),
      );
    })().catch((err: unknown) => set({ status: 'error', error: err instanceof Error ? err.message : String(err) }));

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [artist]);

  return state;
}
