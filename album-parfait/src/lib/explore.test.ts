import { describe, expect, it } from 'vitest';
import { compareAlbums } from './compare';
import { bracketWinner, currentPair, pickWinner, startBracket } from './knockout';
import { applyFilter, sortTracks } from './explore';
import type { SharedAlbum } from './share';
import type { Project, Track } from './types';

let id = 1;
const t = (title: string, projectId: number, extra: Partial<Track> = {}): Track => ({
  id: id++,
  title,
  titleVersion: '',
  position: 1,
  disk: 1,
  preview: '',
  artistId: 1,
  artistName: 'A',
  projectId,
  ...extra,
});
const proj = (pid: number, recordType: Project['recordType'], releaseDate: string): Project => ({
  id: pid,
  title: `P${pid}`,
  cover: '',
  md5: String(pid),
  releaseDate,
  recordType,
});

const projects = [proj(1, 'album', '2012-01-01'), proj(2, 'album', '2020-01-01'), proj(3, 'single', '2024-01-01')];
const a = t('a', 1, { rank: 100, position: 2 });
const b = t('b', 2, { rank: 900 });
const c = t('c', 3, { rank: 500 });
const d = t('d', 1, { rank: 50, position: 1 });

describe('sortTracks', () => {
  it('par popularité', () => {
    expect(sortTracks([a, b, c, d], projects, 'popularite').map((x) => x.title)).toEqual(['b', 'c', 'a', 'd']);
  });
  it('par date, puis position', () => {
    expect(sortTracks([a, b, c, d], projects, 'date').map((x) => x.title)).toEqual(['c', 'b', 'd', 'a']);
  });
  it('par projet : ordre d’origine conservé', () => {
    expect(sortTracks([a, b, c, d], projects, 'projet').map((x) => x.title)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('applyFilter', () => {
  it('masque les projets décochés et les singles', () => {
    expect(applyFilter([a, b, c, d], projects, { hidden: new Set([2]), hideSingles: false }).map((x) => x.title)).toEqual([
      'a',
      'c',
      'd',
    ]);
    expect(applyFilter([a, b, c, d], projects, { hidden: new Set(), hideSingles: true }).map((x) => x.title)).toEqual([
      'a',
      'b',
      'd',
    ]);
  });
});

describe('knockout', () => {
  const pool = Array.from({ length: 11 }, (_, i) => t(`s${i}`, 1));
  const firstWins = () => {
    let br = startBracket(pool, 8, () => 0.5);
    let rounds = 0;
    for (;;) {
      const pair = currentPair(br);
      if (!pair) break;
      br = pickWinner(br, pair[0].id);
      rounds++;
    }
    return { br, rounds };
  };

  it('tire 8 candidats et désigne un gagnant en 7 duels', () => {
    const { br, rounds } = firstWins();
    expect(rounds).toBe(7);
    expect(bracketWinner(br)).not.toBeNull();
  });

  it('gère un nombre impair (exemption)', () => {
    let br = startBracket(pool.slice(0, 3), 8, () => 0.5);
    let duels = 0;
    while (currentPair(br)) {
      br = pickWinner(br, currentPair(br)![1].id);
      duels++;
    }
    expect(duels).toBe(2);
    expect(bracketWinner(br)).not.toBeNull();
  });

  it('un seul candidat gagne sans duel ; ignore un id hors duel', () => {
    const solo = startBracket([pool[0]], 8);
    expect(currentPair(solo)).toBeNull();
    expect(bracketWinner(solo)?.id).toBe(pool[0].id);
    const br = startBracket(pool.slice(0, 4), 8, () => 0.5);
    expect(pickWinner(br, 999999)).toBe(br);
  });
});

describe('compareAlbums', () => {
  const base: SharedAlbum = {
    v: 1,
    artist: { id: 1, name: 'A', picture: '' },
    cover: { id: 10, title: 'C', url: 'https://cdn-images.dzcdn.net/c.jpg' },
    tracks: Array.from({ length: 10 }, (_, i) => ({ id: 100 + i, title: `Song ${i}` })),
  };
  it('compte cover + pistes au même slot, et les pistes communes ailleurs', () => {
    const other: SharedAlbum = {
      ...base,
      cover: { ...base.cover, id: 11 },
      tracks: base.tracks.map((x, i) => (i === 2 ? { id: 999, title: 'Song 3 (Remastered)' } : i === 3 ? { id: 555, title: 'Other' } : x)),
    };
    const r = compareAlbums(base, other);
    expect(r.cover).toBe(false);
    expect(r.slots[0].same).toBe(true);
    expect(r.slots[2].same).toBe(false);
    expect(r.score).toBe(8);
    expect(r.total).toBe(11);
    expect(r.sharedElsewhere).toBe(1);
  });
});
