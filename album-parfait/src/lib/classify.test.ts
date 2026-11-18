import { describe, expect, it } from 'vitest';
import {
  buildPool,
  coverChoices,
  introCandidates,
  isFeat,
  isInterlude,
  isOwnProject,
  normalizeTitle,
  outroCandidates,
} from './classify';
import type { ProjectWithTracks, RecordType, Track } from './types';

const ME = 525046;
const OTHER = 999;
let nextId = 1;

function t(title: string, position: number, extra: Partial<Track> = {}): Track {
  return {
    id: nextId++,
    title,
    titleVersion: '',
    position,
    disk: 1,
    hasPreview: false,
    artistId: ME,
    artistName: 'Kendrick Lamar',
    projectId: 0,
    ...extra,
  };
}

function p(
  id: number,
  title: string,
  recordType: RecordType,
  releaseDate: string,
  tracks: Track[],
  md5 = `md5-${id}`,
): ProjectWithTracks {
  return {
    id,
    title,
    cover: `https://cdn-images.dzcdn.net/${id}.jpg`,
    md5,
    releaseDate,
    recordType,
    tracks: tracks.map((tr) => ({ ...tr, projectId: id })),
  };
}

describe('normalizeTitle', () => {
  it('unifie les apostrophes et la casse', () => {
    expect(normalizeTitle('Bitch, Don’t Kill My Vibe (Remix)')).toBe(normalizeTitle("Bitch, Don't Kill My Vibe (Remix)"));
  });
  it('retire les suffixes d’édition mais garde le reste', () => {
    expect(normalizeTitle('Swimming Pools (Drank) (Extended Version)')).toBe('swimming pools drank');
    expect(normalizeTitle('The Recipe (Bonus Track)')).toBe('the recipe');
    expect(normalizeTitle('Alright - Remastered 2020')).toBe('alright');
    expect(normalizeTitle('Bitch, Don’t Kill My Vibe (Remix)')).toBe('bitch dont kill my vibe remix');
  });
  it('retire les accents', () => {
    expect(normalizeTitle('Énergie Été')).toBe('energie ete');
  });
});

describe('isOwnProject', () => {
  it('exige au moins 50 % des pistes de l’artiste', () => {
    const guest = p(1, 'Push Thru', 'single', '2012-07-31', [
      t('Push Thru', 1, { artistId: OTHER }),
      t('Push Thru (Instrumental)', 2, { artistId: OTHER }),
      t('Push Thru (Clean)', 3),
    ]);
    const own = p(2, 'X', 'album', '2020-01-01', [t('a', 1), t('b', 2), t('c', 3, { artistId: OTHER })]);
    expect(isOwnProject(guest, ME)).toBe(false);
    expect(isOwnProject(own, ME)).toBe(true);
  });
  it('un projet sans piste n’est pas propre', () => {
    expect(isOwnProject(p(3, 'vide', 'album', '2020-01-01', []), ME)).toBe(false);
  });
});

describe('coverChoices', () => {
  it('exclut les projets invités, dédoublonne par md5, trie du plus récent au plus ancien', () => {
    const projects = [
      p(1, 'Old', 'album', '2011-07-02', [t('a', 1)]),
      p(2, 'New', 'album', '2024-11-22', [t('b', 1)]),
      p(3, 'Guest', 'single', '2025-01-01', [t('c', 1, { artistId: OTHER })]),
      p(4, 'Same cover', 'single', '2023-01-01', [t('d', 1)], 'md5-1'),
      p(5, 'Mid', 'album', '2015-03-16', [t('e', 1)]),
    ];
    expect(coverChoices(projects, ME).map((x) => x.title)).toEqual(['New', 'Mid', 'Old']);
  });

  it('dédoublonne aussi par titre normalisé quand le md5 diffère (garde la plus ancienne)', () => {
    const projects = [
      p(11853396, 'Feu (Ré-édition)', 'album', '2015-12-04', [t('a', 1)], 'md5-a'),
      p(11853454, 'Feu (Ré-Édition)', 'album', '2015-11-27', [t('b', 1)], 'md5-b'),
    ];
    expect(coverChoices(projects, ME).map((x) => x.id)).toEqual([11853454]);
  });

  it('ignore les suffixes d’édition et préfère l’album au single', () => {
    const projects = [
      p(1, 'Humanoïde', 'single', '2015-05-01', [t('a', 1)]),
      p(2, 'Humanoide (Deluxe)', 'album', '2016-01-01', [t('b', 1)]),
      p(3, 'Humanoïde - Remastered', 'ep', '2015-01-01', [t('c', 1)]),
    ];
    expect(coverChoices(projects, ME).map((x) => x.id)).toEqual([2]);
  });

  it('garde deux covers différentes aux titres différents (cas Nekfeu)', () => {
    const projects = [
      p(10565677, 'Feu', 'album', '2015-06-23', [t('a', 1)], 'beb38882'),
      p(11853396, 'Feu (Ré-édition)', 'album', '2015-12-04', [t('b', 1)], '45f0e973'),
      p(11853454, 'Feu (Ré-édition)', 'album', '2015-11-27', [t('c', 1)], '45f0e973'),
      p(320919827, 'Feu', 'album', '2015-12-11', [t('d', 1)], '45f0e973'),
    ];
    expect(coverChoices(projects, ME).map((x) => [x.id, x.title])).toEqual([
      [11853454, 'Feu (Ré-édition)'],
      [10565677, 'Feu'],
    ]);
  });

  it('ne regroupe pas deux projets dont le titre normalisé est vide', () => {
    const projects = [p(1, '…', 'album', '2020-01-01', [t('a', 1)]), p(2, '?!', 'album', '2021-01-01', [t('b', 1)])];
    expect(coverChoices(projects, ME).map((x) => x.id)).toEqual([2, 1]);
  });
});

const gkmc = p(9416314, 'good kid, m.A.A.d city', 'album', '2013-04-02', [
  t('Sherane a.k.a Master Splinter’s Daughter', 1),
  t('Money Trees', 2),
  t('Compton', 3),
]);
const gkmcDeluxe = p(7203293, 'good kid, m.A.A.d city (Deluxe)', 'album', '2013-03-19', [
  t('Sherane a.k.a Master Splinter’s Daughter', 1),
  t('Money Trees', 2),
  t('Compton', 3),
  t('The Recipe (Bonus Track)', 1, { disk: 2, titleVersion: '(Bonus Track)' }),
  t('Bitch, Don’t Kill My Vibe (Remix)', 2, { disk: 2, titleVersion: '(Remix)' }),
]);
const damnCollector = p(58993682, 'DAMN. COLLECTORS EDITION.', 'album', '2017-12-08', [
  t('DUCKWORTH.', 1),
  t('BLOOD.', 2),
  t('HUMBLE. (Bonus Track)', 3, { titleVersion: '(Bonus Track)' }),
]);
const single = p(582140742, 'Not Like Us', 'single', '2024-05-04', [t('Not Like Us', 1)]);
const guestSingle = p(5128231, 'Push Thru', 'single', '2012-07-31', [
  t('Push Thru (feat. Kendrick Lamar and Curren$y)', 1, { artistId: OTHER, artistName: 'Talib Kweli' }),
]);

describe('introCandidates', () => {
  it('prend le premier titre du disque 1 de chaque projet propre non single, sans doublon', () => {
    const intros = introCandidates([gkmc, gkmcDeluxe, damnCollector, single, guestSingle], ME);
    expect(intros.map((x) => x.title)).toEqual(['DUCKWORTH.', 'Sherane a.k.a Master Splinter’s Daughter']);
  });
  it('renvoie une liste vide pour un artiste qui n’a que des singles', () => {
    expect(introCandidates([single], ME)).toEqual([]);
    expect(outroCandidates([single], ME)).toEqual([]);
  });
});

describe('outroCandidates', () => {
  it('prend le dernier titre non bonus du disque 1', () => {
    const outros = outroCandidates([gkmcDeluxe, damnCollector], ME);
    expect(outros.map((x) => x.title)).toEqual(['BLOOD.', 'Compton']);
  });
});

describe('buildPool', () => {
  it('garde une seule version par titre, en priorisant le type puis la sortie la plus ancienne', () => {
    const pool = buildPool([gkmc, gkmcDeluxe, single, guestSingle]);
    const money = pool.filter((x) => normalizeTitle(x.title) === 'money trees');
    expect(money).toHaveLength(1);
    expect(money[0].projectId).toBe(7203293);
    expect(pool.some((x) => x.title.startsWith('Push Thru'))).toBe(true);
  });
  it('préfère la version album à la version single', () => {
    const albumWithHit = p(673968231, 'GNX', 'album', '2024-11-22', [t('Not Like Us', 1)]);
    const pool = buildPool([single, albumWithHit]);
    expect(pool.filter((x) => x.title === 'Not Like Us').map((x) => x.projectId)).toEqual([673968231]);
  });
});

describe('isInterlude', () => {
  it('détecte le mot entier', () => {
    expect(isInterlude(t('For Free? (Interlude)', 1))).toBe(true);
    expect(isInterlude(t('INTERLUDE', 1))).toBe(true);
    expect(isInterlude(t('Interludes Are Cool', 1))).toBe(false);
  });
});

describe('isFeat', () => {
  it('détecte un autre contributeur, un autre artiste principal ou une mention dans le titre', () => {
    expect(isFeat(t('luther', 1), ME, [ME, 123])).toBe(true);
    expect(isFeat(t('Push Thru', 1, { artistId: OTHER }), ME)).toBe(true);
    expect(isFeat(t('X (feat. Y)', 1), ME)).toBe(true);
    expect(isFeat(t('X ft. Y', 1), ME)).toBe(true);
    expect(isFeat(t('X (with Y)', 1), ME)).toBe(true);
    expect(isFeat(t('HUMBLE.', 1), ME, [ME])).toBe(false);
    expect(isFeat(t('Left', 1), ME)).toBe(false);
  });
});
