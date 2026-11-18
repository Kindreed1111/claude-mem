import type { Project, Track } from './types';

export type SortMode = 'projet' | 'popularite' | 'date';

export interface ProjectFilter {
  hidden: Set<number>;
  hideSingles: boolean;
}

export const NO_FILTER: ProjectFilter = { hidden: new Set(), hideSingles: false };

export function applyFilter(tracks: Track[], projects: Project[], filter: ProjectFilter): Track[] {
  const byId = new Map(projects.map((p) => [p.id, p]));
  return tracks.filter((t) => {
    if (filter.hidden.has(t.projectId)) return false;
    if (filter.hideSingles && byId.get(t.projectId)?.recordType === 'single') return false;
    return true;
  });
}

export function sortTracks(tracks: Track[], projects: Project[], mode: SortMode): Track[] {
  if (mode === 'projet') return tracks;
  if (mode === 'popularite') return [...tracks].sort((x, y) => (y.rank ?? 0) - (x.rank ?? 0));
  const date = new Map(projects.map((p) => [p.id, p.releaseDate]));
  return [...tracks].sort(
    (x, y) =>
      (date.get(y.projectId) ?? '').localeCompare(date.get(x.projectId) ?? '') || x.disk - y.disk || x.position - y.position,
  );
}
