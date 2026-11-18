import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeShare, type SharedAlbum } from './share';
import { buildShareUrl, prefetchShortUrl, resolveShareUrl } from './shareLink';

const album: SharedAlbum = {
  v: 1,
  artist: { id: 1, name: 'A', picture: '' },
  cover: { id: 2, title: 'C', url: 'https://cdn-images.dzcdn.net/images/cover/x/1000x1000.jpg' },
  tracks: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, title: `t${i + 1}` })),
};
const other = (n: number): SharedAlbum => ({ ...album, artist: { ...album.artist, id: n } });
const ok = (id: string) => vi.fn(async () => new Response(JSON.stringify({ id, url: `/a/${id}` })));

describe('liens de partage', () => {
  beforeEach(() => vi.stubGlobal('location', { origin: 'https://ap.test', pathname: '/a/Ab3dE5gH' }));
  afterEach(() => vi.unstubAllGlobals());

  it('lien long sans le chemin du lien court', () => {
    expect(buildShareUrl('album', album)).toBe(`https://ap.test/#album=${encodeShare(album)}`);
  });

  it('lien court, demandé une seule fois par album et type', async () => {
    const fetchImpl = ok('Zz9yX8wV');
    const a = other(10);
    expect(await resolveShareUrl('album', a, 1000, fetchImpl as unknown as typeof fetch)).toBe('https://ap.test/a/Zz9yX8wV');
    await prefetchShortUrl('album', a, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/share');
    expect(JSON.parse(String(init.body))).toEqual({ kind: 'album', album: encodeShare(a) });
  });

  it('serveur absent ou lent : repli sur le lien long', async () => {
    const a = other(11);
    const down = vi.fn(async () => new Response('{}', { status: 503 }));
    expect(await resolveShareUrl('defi', a, 1000, down as unknown as typeof fetch)).toBe(`https://ap.test/#defi=${encodeShare(a)}`);
    const b = other(12);
    const slow = vi.fn(() => new Promise<Response>(() => undefined));
    expect(await resolveShareUrl('album', b, 20, slow as unknown as typeof fetch)).toBe(`https://ap.test/#album=${encodeShare(b)}`);
  });

  it('un échec n’est pas mis en cache', async () => {
    const a = other(13);
    const flaky = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'Qq1wE2rT' })));
    expect(await prefetchShortUrl('album', a, flaky as unknown as typeof fetch)).toBeNull();
    expect(await prefetchShortUrl('album', a, flaky as unknown as typeof fetch)).toBe('https://ap.test/a/Qq1wE2rT');
  });
});
