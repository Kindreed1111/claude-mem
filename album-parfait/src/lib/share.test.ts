import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare, normalizeShared, parseShortShare, readHash, readShortPath, shareHash, type SharedAlbum } from './share';

const album: SharedAlbum = {
  v: 1,
  artist: { id: 525046, name: 'Kendrick Lamar', picture: 'https://cdn-images.dzcdn.net/images/artist/a/250x250.jpg' },
  cover: { id: 673968231, title: 'GNX', url: 'https://cdn-images.dzcdn.net/images/cover/x/1000x1000.jpg' },
  tracks: [
    { id: 1, title: 'wacced out murals' },
    { id: 2, title: 'luther' },
    null,
    { id: 4, title: 'Énergie — « été »' },
    null,
    null,
    { id: 7, title: 'For Free? (Interlude)' },
    null,
    null,
    { id: 10, title: 'gloria' },
  ],
};

describe('share', () => {
  it('encode puis décode à l’identique, accents compris', () => {
    const s = encodeShare(album);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeShare(s)).toEqual(album);
  });

  it('lit le hash album et défi', () => {
    expect(readHash(shareHash('album', album))).toEqual({ kind: 'album', album });
    expect(readHash(shareHash('defi', album))).toEqual({ kind: 'defi', album });
    expect(readHash('#autre')).toBeNull();
    expect(readHash('')).toBeNull();
  });

  it('rejette une charge invalide ou dangereuse', () => {
    expect(decodeShare('pas-du-base64!')).toBeNull();
    const evil = { ...album, cover: { ...album.cover, url: 'https://evil.com/x.jpg' } };
    expect(decodeShare(encodeShare(evil))).toBeNull();
    const badId = { ...album, artist: { ...album.artist, id: -3 } };
    expect(decodeShare(encodeShare(badId))).toBeNull();
    const short = { ...album, tracks: album.tracks.slice(0, 3) };
    expect(decodeShare(encodeShare(short))).toBeNull();
    const longTitle = { ...album, tracks: [{ id: 1, title: 'x'.repeat(500) }, ...album.tracks.slice(1)] };
    expect(decodeShare(encodeShare(longTitle))).toBeNull();
  });

  it('lit le chemin d’un lien court', () => {
    expect(readShortPath('/a/Ab3dE5gH')).toBe('Ab3dE5gH');
    expect(readShortPath('/a/Ab3dE5gHijkl/')).toBe('Ab3dE5gHijkl');
    expect(readShortPath('/a/abc')).toBeNull();
    expect(readShortPath('/a/Ab3dE5g!')).toBeNull();
    expect(readShortPath('/')).toBeNull();
  });

  it('valide un album de lien court', () => {
    expect(parseShortShare({ id: 'Ab3dE5gH', kind: 'defi', album }, 'Ab3dE5gH')).toEqual({ id: 'Ab3dE5gH', kind: 'defi', album });
    expect(parseShortShare({ id: 'Ab3dE5gH', kind: 'defi', album }, 'Zb3dE5gH')).toBeNull();
    expect(parseShortShare({ id: 'Ab3dE5gH', kind: 'x', album })).toBeNull();
    expect(parseShortShare({ id: 'Ab3dE5gH', kind: 'album', album: { ...album, tracks: [] } })).toBeNull();
  });

  it('normalise : clés ordonnées, champs superflus retirés', () => {
    const messy = { extra: 1, tracks: album.tracks, cover: { url: album.cover.url, title: 'GNX', id: 673968231 }, artist: album.artist, v: 1 };
    expect(JSON.stringify(normalizeShared(messy as unknown as SharedAlbum))).toBe(JSON.stringify(album));
  });

  it('accepte une photo d’artiste vide', () => {
    const noPic = { ...album, artist: { ...album.artist, picture: '' } };
    expect(decodeShare(encodeShare(noPic))).toEqual(noPic);
  });
});
