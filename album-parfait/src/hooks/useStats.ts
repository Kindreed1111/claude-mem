import { useCallback, useEffect, useState } from 'react';
import type { StatKind, StatsResponse } from '../../server/stats';

export type Stats = { enabled: boolean; albums: number; counts: Record<StatKind, Map<number, number>>; top: NonNullable<StatsResponse['top']> | null };

const EMPTY_COUNTS = (): Stats['counts'] => ({
  intro: new Map(),
  feat: new Map(),
  interlude: new Map(),
  outro: new Map(),
  free: new Map(),
  cover: new Map(),
});

const DISABLED: Stats = { enabled: false, albums: 0, counts: EMPTY_COUNTS(), top: null };

/** Classements des joueurs pour un artiste (désactivé si le serveur n'a pas de base). */
export function useStats(artistId: number | null) {
  const [stats, setStats] = useState<Stats>(DISABLED);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!artistId) {
      setStats(DISABLED);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/stats?artist=${artistId}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<StatsResponse>) : null))
      .then((s) => {
        if (!s?.enabled || !s.top) return setStats(DISABLED);
        const counts = EMPTY_COUNTS();
        for (const k of Object.keys(counts) as StatKind[]) for (const e of s.top[k] ?? []) counts[k].set(e.id, e.count);
        setStats({ enabled: true, albums: s.albums ?? 0, counts, top: s.top });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStats(DISABLED);
      });
    return () => ctrl.abort();
  }, [artistId, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { stats, refresh };
}

/** Envoie un album terminé aux classements (une seule fois par album et par jour côté serveur). */
export async function submitAlbum(artistId: number, coverId: number, slots: number[]): Promise<boolean> {
  try {
    const r = await fetch('/api/stats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ artistId, coverId, slots }),
    });
    const body = (await r.json()) as { recorded?: boolean };
    return !!body.recorded;
  } catch {
    return false;
  }
}
