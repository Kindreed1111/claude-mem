import { describe, expect, it } from 'vitest';
import { candidatesFor, groupByProject } from './candidates';
import type { ProjectWithTracks, Track } from './types';

const ME = 1;
let id = 1;
const t = (title: string, position: number, projectId: number, extra: Partial<Track> = {}): Track => ({
  id: id++,
  title,
  titleVersion: '',
  position,
  disk: 1,
  preview: '',
  artistId: ME,
  artistName: 'Me',
  projectId,
  ...extra,
});

const album: ProjectWithTracks = {
  id: 10,
  title: 'LP',
  cover: '',
  md5: 'a',
  releaseDate: '2020-01-01',
  recordType: 'album',
  tracks: [t('Opening', 1, 10), t('Skit (Interlude)', 2, 10), t('Song', 3, 10), t('Closing', 4, 10)],
};
const single: ProjectWithTracks = {
  id: 20,
  title: 'Hit',
  cover: '',
  md5: 'b',
  releaseDate: '2021-01-01',
  recordType: 'single',
  tracks: [t('Hit', 1, 20)],
};

describe('candidatesFor', () => {
  it('intro et outro par position, interlude par mot-clé', () => {
    const ctx = { projects: [album, single], artistId: ME, contributors: new Map(), creditsComplete: true };
    expect(candidatesFor('intro', ctx).tracks.map((x) => x.title)).toEqual(['Opening']);
    expect(candidatesFor('outro', ctx).tracks.map((x) => x.title)).toEqual(['Closing']);
    expect(candidatesFor('interlude', ctx)).toMatchObject({ fallback: false, tracks: [{ title: 'Skit (Interlude)' }] });
  });

  it('repli sur tous les sons quand la catégorie est vide', () => {
    const ctx = { projects: [single], artistId: ME, contributors: new Map(), creditsComplete: true };
    const intro = candidatesFor('intro', ctx);
    expect(intro.fallback).toBe(true);
    expect(intro.tracks.map((x) => x.title)).toEqual(['Hit']);
    expect(candidatesFor('interlude', ctx).fallback).toBe(true);
  });

  it('feat : pas de repli tant que l’analyse des crédits n’est pas finie', () => {
    const base = { projects: [album], artistId: ME, contributors: new Map<number, number[]>() };
    expect(candidatesFor('feat', { ...base, creditsComplete: false })).toEqual({ tracks: [], fallback: false });
    expect(candidatesFor('feat', { ...base, creditsComplete: true }).fallback).toBe(true);
    const song = album.tracks[2];
    const withCredits = { ...base, contributors: new Map([[song.id, [ME, 99]]]), creditsComplete: false };
    expect(candidatesFor('feat', withCredits).tracks.map((x) => x.title)).toEqual(['Song']);
  });
});

describe('groupByProject', () => {
  it('groupe en conservant l’ordre d’apparition', () => {
    const groups = groupByProject([single.tracks[0], album.tracks[0], album.tracks[2]], [album, single]);
    expect(groups.map((g) => [g.project.title, g.tracks.length])).toEqual([
      ['Hit', 1],
      ['LP', 2],
    ]);
  });
});
