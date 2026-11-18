import { describe, expect, it } from 'vitest';
import { resolveDeezerTarget, resolveImageTarget } from './proxy';

describe('resolveDeezerTarget', () => {
  it('autorise les albums d’un artiste avec pagination', () => {
    expect(resolveDeezerTarget(new URLSearchParams('path=artist/525046/albums&limit=100&index=0'))).toBe(
      'https://api.deezer.com/artist/525046/albums?limit=100&index=0',
    );
  });

  it('encode la requête de recherche', () => {
    expect(resolveDeezerTarget(new URLSearchParams('path=search/artist&q=kendrick lamar'))).toBe(
      'https://api.deezer.com/search/artist?q=kendrick+lamar',
    );
  });

  it('autorise tracklist et piste', () => {
    expect(resolveDeezerTarget(new URLSearchParams('path=album/7203293/tracks&limit=100'))).toBe(
      'https://api.deezer.com/album/7203293/tracks?limit=100',
    );
    expect(resolveDeezerTarget(new URLSearchParams('path=track/3106586641'))).toBe(
      'https://api.deezer.com/track/3106586641',
    );
  });

  it('ignore les paramètres non listés', () => {
    expect(resolveDeezerTarget(new URLSearchParams('path=track/1&access_token=x'))).toBe('https://api.deezer.com/track/1');
  });

  it('refuse les valeurs hors bornes', () => {
    expect(resolveDeezerTarget(new URLSearchParams('path=search/artist&q=' + 'a'.repeat(101)))).toBeNull();
    expect(resolveDeezerTarget(new URLSearchParams('path=artist/1/albums&limit=1000'))).toBeNull();
    expect(resolveDeezerTarget(new URLSearchParams('path=artist/1/albums&index=-1'))).toBeNull();
  });

  it('refuse tout autre chemin', () => {
    for (const p of ['path=user/1', 'path=artist/abc/albums', 'path=../x', 'path=track/1/../../user/2', '']) {
      expect(resolveDeezerTarget(new URLSearchParams(p))).toBeNull();
    }
  });
});

describe('resolveImageTarget', () => {
  it('autorise le CDN Deezer en https', () => {
    const u = 'https://cdn-images.dzcdn.net/images/cover/0123456789abcdef0123456789abcdef/1000x1000-000000-80-0-0.jpg';
    expect(resolveImageTarget(u)).toBe(u);
    const e = 'https://e-cdns-images.dzcdn.net/images/cover/0123456789abcdef0123456789abcdef/500x500-000000-80-0-0.jpg';
    expect(resolveImageTarget(e)).toBe(e);
  });

  it('refuse ce qui n’est pas une pochette', () => {
    expect(resolveImageTarget('https://cdn-images.dzcdn.net/images/artist/0123456789abcdef0123456789abcdef/500x500.jpg')).toBeNull();
    expect(resolveImageTarget('https://cdnt-preview.dzcdn.net/api/1/1/a/b/c.mp3')).toBeNull();
    expect(resolveImageTarget('https://cdn-images.dzcdn.net/images/cover/x.jpg')).toBeNull();
  });

  it('refuse les autres hôtes, http et les entrées invalides', () => {
    expect(resolveImageTarget('https://evil.com/a.jpg')).toBeNull();
    expect(resolveImageTarget('https://dzcdn.net.evil.com/a.jpg')).toBeNull();
    expect(resolveImageTarget('http://cdn-images.dzcdn.net/a.jpg')).toBeNull();
    expect(resolveImageTarget('pas une url')).toBeNull();
    expect(resolveImageTarget(null)).toBeNull();
  });
});
