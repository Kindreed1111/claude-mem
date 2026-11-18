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
      const contributors = new Map<number, number[]>();
      let done = 0;
      let lastFlush = 0;
      set({ creditsTotal: toAnalyze.length });
      await Promise.all(
        toAnalyze.map(async (t) => {
          const ids = await fetchContributorIds(t.id, opts).catch(() => [] as number[]);
          if (!alive) return;
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
