import { normalizeTitle } from './classify';
import type { SharedAlbum } from './share';

export interface Comparison {
  cover: boolean;
  slots: Array<{ slot: number; mine: string | null; theirs: string | null; same: boolean }>;
  /** Points : cover identique + chaque piste identique au même numéro. */
  score: number;
  total: number;
  /** Pistes présentes dans les deux albums mais à des numéros différents. */
  sharedElsewhere: number;
}

const key = (t: { title: string } | null) => (t ? normalizeTitle(t.title) : null);

export function compareAlbums(mine: SharedAlbum, theirs: SharedAlbum): Comparison {
  const cover = mine.cover.id === theirs.cover.id;
  const slots = mine.tracks.map((t, i) => {
    const o = theirs.tracks[i];
    const same = !!t && !!o && (t.id === o.id || key(t) === key(o));
    return { slot: i + 1, mine: t?.title ?? null, theirs: o?.title ?? null, same };
  });
  const theirKeys = new Set(theirs.tracks.map(key).filter(Boolean));
  const sharedElsewhere = mine.tracks.filter((t, i) => t && !slots[i].same && theirKeys.has(key(t))).length;
  const score = (cover ? 1 : 0) + slots.filter((s) => s.same).length;
  return { cover, slots, score, total: 11, sharedElsewhere };
}
