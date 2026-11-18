import type { SlotKind } from './album';
import { buildPool, introCandidates, isFeat, isInterlude, outroCandidates } from './classify';
import type { Project, ProjectWithTracks, Track } from './types';

export interface CandidateContext {
  projects: ProjectWithTracks[];
  artistId: number;
  contributors: Map<number, number[]>;
  creditsComplete: boolean;
}

export interface Candidates {
  tracks: Track[];
  /** true : aucune piste de la catégorie, on propose tous les sons. */
  fallback: boolean;
}

export function candidatesFor(kind: SlotKind, ctx: CandidateContext): Candidates {
  const pool = buildPool(ctx.projects);
  let tracks: Track[];
  switch (kind) {
    case 'intro':
      tracks = introCandidates(ctx.projects, ctx.artistId);
      break;
    case 'outro':
      tracks = outroCandidates(ctx.projects, ctx.artistId);
      break;
    case 'interlude':
      tracks = pool.filter(isInterlude);
      break;
    case 'feat':
      tracks = pool.filter((t) => isFeat(t, ctx.artistId, ctx.contributors.get(t.id)));
      if (tracks.length === 0 && !ctx.creditsComplete) return { tracks: [], fallback: false };
      break;
    case 'free':
      return { tracks: pool, fallback: false };
  }
  return tracks.length > 0 ? { tracks, fallback: false } : { tracks: pool, fallback: true };
}

export function groupByProject(tracks: Track[], projects: Project[]): Array<{ project: Project; tracks: Track[] }> {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const groups = new Map<number, { project: Project; tracks: Track[] }>();
  for (const t of tracks) {
    const project = byId.get(t.projectId);
    if (!project) continue;
    if (!groups.has(project.id)) groups.set(project.id, { project, tracks: [] });
    groups.get(project.id)!.tracks.push(t);
  }
  return [...groups.values()];
}
