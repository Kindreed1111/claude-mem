import type { Project, ProjectWithTracks, RecordType, Track } from './types';

const RECORD_PRIORITY: Record<RecordType, number> = { album: 0, ep: 1, compile: 2, single: 3 };
const EDITION_RE = /\b(remaster(ed)?|extended|deluxe|bonus|explicit|clean|album version|radio edit|version)\b/i;
const FEAT_GROUP_RE = /^\s*(feat|ft|with)\b/i;

/** Clé de comparaison d'un titre : sans casse, accents, ponctuation ni suffixes d'édition. */
export function normalizeTitle(title: string): string {
  let s = title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`´]/g, "'");
  s = s.replace(/[([]([^)\]]*)[)\]]/g, (group, inner: string) =>
    EDITION_RE.test(inner) || FEAT_GROUP_RE.test(inner) ? ' ' : group,
  );
  s = s.replace(/\s[-–—]\s(.*)$/, (suffix, inner: string) => (EDITION_RE.test(inner) ? '' : suffix));
  return s
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Un projet est « propre » si au moins la moitié de ses pistes ont l'artiste comme artiste principal. */
export function isOwnProject(project: ProjectWithTracks, artistId: number): boolean {
  if (project.tracks.length === 0) return false;
  const own = project.tracks.filter((t) => t.artistId === artistId).length;
  return own / project.tracks.length >= 0.5;
}

const byDateDesc = (a: Project, b: Project) => b.releaseDate.localeCompare(a.releaseDate);
const byPriority = (a: Project, b: Project) =>
  RECORD_PRIORITY[a.recordType] - RECORD_PRIORITY[b.recordType] || a.releaseDate.localeCompare(b.releaseDate);

/**
 * Une cover par image (md5) et par titre normalisé : une réédition au même titre ne s'affiche pas deux fois.
 * La version gardée est la prioritaire (album > ep > compile > single, puis la plus ancienne).
 */
export function coverChoices(projects: ProjectWithTracks[], artistId: number): Project[] {
  const kept: ProjectWithTracks[] = [];
  const md5s = new Set<string>();
  const titles = new Set<string>();
  for (const p of projects.filter((x) => isOwnProject(x, artistId)).sort(byPriority)) {
    const title = normalizeTitle(p.title);
    if (md5s.has(p.md5) || (title && titles.has(title))) continue;
    md5s.add(p.md5);
    if (title) titles.add(title);
    kept.push(p);
  }
  return kept.sort(byDateDesc);
}

function fullProjects(projects: ProjectWithTracks[], artistId: number): ProjectWithTracks[] {
  return projects.filter((p) => p.recordType !== 'single' && isOwnProject(p, artistId)).sort(byDateDesc);
}

function uniqueByTitle(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((t) => {
    const key = normalizeTitle(t.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const isBonus = (t: Track) => /\bbonus\b/i.test(t.title) || /\bbonus\b/i.test(t.titleVersion);

/** Premier titre (disque 1) de chaque projet propre hors singles, du plus récent au plus ancien. */
export function introCandidates(projects: ProjectWithTracks[], artistId: number): Track[] {
  const picks = fullProjects(projects, artistId).map((p) =>
    p.tracks.filter((t) => t.disk === 1).reduce<Track | undefined>((best, t) => (!best || t.position < best.position ? t : best), undefined),
  );
  return uniqueByTitle(picks.filter((t): t is Track => !!t));
}

/** Dernier titre non bonus du disque 1 de chaque projet propre hors singles. */
export function outroCandidates(projects: ProjectWithTracks[], artistId: number): Track[] {
  const picks = fullProjects(projects, artistId).map((p) =>
    p.tracks
      .filter((t) => t.disk === 1 && !isBonus(t))
      .reduce<Track | undefined>((best, t) => (!best || t.position > best.position ? t : best), undefined),
  );
  return uniqueByTitle(picks.filter((t): t is Track => !!t));
}

/** Toutes les pistes, une seule version par titre (album > ep > compile > single, puis la plus ancienne). */
export function buildPool(projects: ProjectWithTracks[]): Track[] {
  const chosen = new Map<string, Track>();
  for (const p of [...projects].sort(byPriority)) {
    for (const t of p.tracks) {
      const key = normalizeTitle(t.title);
      if (!chosen.has(key)) chosen.set(key, t);
    }
  }
  const order = new Map([...projects].sort(byDateDesc).map((p, i) => [p.id, i]));
  return [...chosen.values()].sort(
    (a, b) => (order.get(a.projectId) ?? 0) - (order.get(b.projectId) ?? 0) || a.disk - b.disk || a.position - b.position,
  );
}

export function isInterlude(track: Track): boolean {
  return /\binterlude\b/i.test(track.title);
}

export function isFeat(track: Track, artistId: number, contributorIds?: number[]): boolean {
  if (track.artistId !== artistId) return true;
  if (contributorIds?.some((id) => id !== artistId)) return true;
  return /\b(feat|ft)\b\.?\s/i.test(track.title) || /\(with\s/i.test(track.title);
}
