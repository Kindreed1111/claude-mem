import UPNG from 'upng-js';
import { describe, expect, it, vi } from 'vitest';
import { encodeShare, type SharedAlbum } from '../src/lib/share';
import { memoryRedis } from './memoryRedis';
import { emojiCode, handleOg, imageData, OG_HEIGHT, OG_WIDTH } from './og';
import { escapeHtml, handlePage, injectPage, metaFor, remoteIndex, requestOrigin, scriptJson } from './page';
import { handleShare, loadShare, parseShareRequest, shareId, shareKey, storeShare } from './share';

const album: SharedAlbum = {
  v: 1,
  artist: { id: 525046, name: 'Kendrick Lamar', picture: '' },
  cover: { id: 673968231, title: 'GNX', url: 'https://cdn-images.dzcdn.net/images/cover/da5256ff8cacfe9ad90521f6e3792259/1000x1000-000000-80-0-0.jpg' },
  tracks: [
    { id: 1, title: 'wacced out murals' },
    { id: 2, title: 'luther' },
    { id: 3, title: 'squabble up' },
    { id: 4, title: 'Énergie — « été »' },
    { id: 5, title: 't5' },
    { id: 6, title: 't6' },
    { id: 7, title: 'For Free? (Interlude)' },
    { id: 8, title: 't8' },
    { id: 9, title: 't9' },
    { id: 10, title: 'gloria' },
  ],
};

const INDEX = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>album parfait.</title>
    <meta name="description" content="défaut" />
    <link rel="canonical" href="https://album-parfait.vercel.app/" />
    <meta property="og:title" content="album parfait." />
    <meta property="og:image" content="https://album-parfait.vercel.app/api/og" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const post = (body: unknown, ip = '1.2.3.4') =>
  new Request('https://s/api/share', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'x-forwarded-for': ip } });

async function created(store = memoryRedis(), kind: 'album' | 'defi' = 'album', a: SharedAlbum = album) {
  const res = await handleShare(post({ kind, album: encodeShare(a) }), store.env, store.fetch);
  return { res, body: (await res.json()) as { id: string; url: string; kind: string }, store };
}

describe('identifiant court', () => {
  it('8 caractères base62, stable, propre au type de lien', async () => {
    const id = await shareId('album', album);
    expect(id).toMatch(/^[0-9A-Za-z]{8}$/);
    expect(await shareId('album', album)).toBe(id);
    expect(await shareId('defi', album)).not.toBe(id);
    expect(await shareId('album', { ...album, cover: { ...album.cover, title: 'GNX ' } })).not.toBe(id);
    expect(await shareId('album', album, 12)).toMatch(/^[0-9A-Za-z]{12}$/);
  });

  it('ignore l’ordre des clés et les champs superflus', async () => {
    const shuffled = { tracks: album.tracks, cover: album.cover, artist: { picture: '', name: 'Kendrick Lamar', id: 525046 }, v: 1, extra: 'x' };
    expect(await shareId('album', shuffled as unknown as SharedAlbum)).toBe(await shareId('album', album));
  });

  it('valide la requête avec decodeShare', () => {
    expect(parseShareRequest({ kind: 'album', album: encodeShare(album) })).toEqual({ kind: 'album', album });
    expect(parseShareRequest({ kind: 'autre', album: encodeShare(album) })).toBeNull();
    expect(parseShareRequest({ kind: 'album', album })).toBeNull();
    const evil = { ...album, cover: { ...album.cover, url: 'https://evil.com/x.jpg' } };
    expect(parseShareRequest({ kind: 'album', album: encodeShare(evil) })).toBeNull();
    expect(parseShareRequest(null)).toBeNull();
  });
});

describe('POST /api/share', () => {
  it('stocke l’album et renvoie /a/<id> ; le même album redonne le même lien', async () => {
    const { res, body, store } = await created();
    expect(res.status).toBe(200);
    expect(body.url).toBe(`/a/${body.id}`);
    expect(body.id).toBe(await shareId('album', album));
    expect(JSON.parse(store.data.get(shareKey(body.id))!)).toEqual({ kind: 'album', album });
    const again = await created(store);
    expect(again.body.id).toBe(body.id);
    const challenge = await created(store, 'defi');
    expect(challenge.body.kind).toBe('defi');
    expect(challenge.body.id).not.toBe(body.id);
  });

  it('refuse un album invalide, un JSON cassé, un corps trop gros', async () => {
    const store = memoryRedis();
    expect((await handleShare(post({ kind: 'album', album: 'pas-du-base64!' }), store.env, store.fetch)).status).toBe(400);
    expect((await handleShare(post('{'), store.env, store.fetch)).status).toBe(400);
    expect((await handleShare(post('x'.repeat(20000)), store.env, store.fetch)).status).toBe(413);
    expect(store.data.size).toBe(0);
  });

  it('limite par IP', async () => {
    const store = memoryRedis();
    for (let i = 0; i < 60; i++) expect((await handleShare(post({ kind: 'album', album: encodeShare(album) }), store.env, store.fetch)).status).toBe(200);
    const over = await handleShare(post({ kind: 'album', album: encodeShare(album) }), store.env, store.fetch);
    expect(over.status).toBe(429);
    expect(over.headers.get('retry-after')).toBeTruthy();
    expect((await handleShare(post({ kind: 'album', album: encodeShare(album) }, '5.6.7.8'), store.env, store.fetch)).status).toBe(200);
  });

  it('sans base : 503 (le client garde le lien long)', async () => {
    expect((await handleShare(post({ kind: 'album', album: encodeShare(album) }), null)).status).toBe(503);
  });

  it('collision : un autre contenu sous le même id passe à 12 caractères', async () => {
    const store = memoryRedis();
    const short = await shareId('album', album);
    store.data.set(shareKey(short), JSON.stringify({ kind: 'album', album: { ...album, cover: { ...album.cover, title: 'autre' } } }));
    const id = await storeShare(store.env, 'album', album, store.fetch);
    expect(id).toHaveLength(12);
    expect((await loadShare(store.env, id, store.fetch))?.album).toEqual(album);
  });
});

describe('GET /api/share', () => {
  it('relit l’album, 404 si inconnu, 400 si id invalide', async () => {
    const { body, store } = await created();
    const ok = await handleShare(new Request(`https://s/api/share?id=${body.id}`), store.env, store.fetch);
    expect(await ok.json()).toEqual({ id: body.id, kind: 'album', album });
    expect(ok.headers.get('cache-control')).toContain('s-maxage=2592000');
    expect((await handleShare(new Request('https://s/api/share?id=ZZZZZZZZ'), store.env, store.fetch)).status).toBe(404);
    expect((await handleShare(new Request('https://s/api/share?id=abc'), store.env, store.fetch)).status).toBe(400);
    expect((await handleShare(new Request(`https://s/api/share?id=${body.id}&x=1`), store.env, store.fetch)).status).toBe(400);
  });
});

describe('page /a/<id>', () => {
  const origin = 'https://album-parfait.vercel.app';

  it('balises Open Graph et Twitter de l’album', async () => {
    const { body, store } = await created();
    const res = await handlePage(new Request(`${origin}/api/page?id=${body.id}`), async () => INDEX, store.env, store.fetch);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('<title>L’album parfait de Kendrick Lamar</title>');
    expect(html).toContain('<meta property="og:title" content="L’album parfait de Kendrick Lamar" />');
    expect(html).toContain(`<meta property="og:image" content="${origin}/api/og?id=${body.id}" />`);
    expect(html).toContain(`<meta property="og:url" content="${origin}/a/${body.id}" />`);
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toMatch(/<meta name="description" content="01 wacced out murals · 02 luther · 03 squabble up… Cover : GNX\./);
    // Les balises par défaut sont remplacées, pas dupliquées.
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html).not.toContain('content="défaut"');
    expect(html).toContain('<script id="ap-share" type="application/json">');
  });

  it('lit aussi l’id dans le chemin (/a/<id>)', async () => {
    const { body, store } = await created();
    const res = await handlePage(new Request(`${origin}/a/${body.id}`), async () => INDEX, store.env, store.fetch);
    expect(await res.text()).toContain(`/api/og?id=${body.id}`);
  });

  it('défi : ni pistes ni cover dans les balises', () => {
    const m = metaFor({ id: 'Ab3dE5gH', kind: 'defi', album }, origin);
    expect(m.title).toBe('Défi : l’album parfait de Kendrick Lamar');
    expect(m.description).not.toContain('luther');
    expect(m.description).not.toContain('GNX');
  });

  it('échappe le HTML et le JSON injectés', () => {
    const evil: SharedAlbum = { ...album, artist: { ...album.artist, name: '"><script>alert(1)</script>' } };
    const html = injectPage(INDEX, { id: 'Ab3dE5gH', kind: 'album', album: evil }, origin);
    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
    expect(scriptJson({ s: '</script><!--' })).toBe('{"s":"\\u003c/script\\u003e\\u003c!--"}');
    expect(escapeHtml(`a&b'`)).toBe('a&amp;b&#39;');
    expect(JSON.parse(scriptJson({ s: '</script> \u2028' }))).toEqual({ s: '</script> \u2028' });
  });

  it('lien inconnu : l’accueil en 404 ; base injoignable : 503', async () => {
    const store = memoryRedis();
    const missing = await handlePage(new Request(`${origin}/api/page?id=ZZZZZZZZ`), async () => INDEX, store.env, store.fetch);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain('<title>album parfait.</title>');
    const down = vi.fn().mockRejectedValue(new Error('réseau'));
    const failed = await handlePage(new Request(`${origin}/api/page?id=ZZZZZZZZ`), async () => INDEX, store.env, down);
    expect(failed.status).toBe(503);
    expect(failed.headers.get('cache-control')).toBe('no-store');
  });

  it('sans index.html : balises + redirection vers l’ancien lien', async () => {
    const { body, store } = await created();
    const res = await handlePage(new Request(`${origin}/api/page?id=${body.id}`), () => Promise.reject(new Error('x')), store.env, store.fetch);
    const html = await res.text();
    expect(html).toContain('og:title');
    expect(html).toContain(`url=/#album=${encodeShare(album)}`);
  });

  it('origine publique et index.html relu une fois', async () => {
    const r = new Request('http://localhost/api/page', { headers: { 'x-forwarded-host': 'album-parfait.vercel.app', 'x-forwarded-proto': 'https' } });
    expect(requestOrigin(r)).toBe('https://album-parfait.vercel.app');
    const fetchImpl = vi.fn().mockResolvedValue(new Response(INDEX));
    const load = remoteIndex(fetchImpl as unknown as typeof fetch);
    expect(await load(r)).toBe(INDEX);
    expect(await load(r)).toBe(INDEX);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][0])).toBe('https://album-parfait.vercel.app/index.html');
  });
});

describe('image d’aperçu', () => {
  // PNG 1×1 valide.
  const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk2Lb9PwAF+AKU3aEGcgAAAABJRU5ErkJggg==', 'base64');
  const imageFetch = vi.fn(async (_url: string) => new Response(PIXEL, { headers: { 'content-type': 'image/png' } }));
  const size = (png: Buffer) => [png.readUInt32BE(16), png.readUInt32BE(20)];

  it('PNG 1200×630 mis en cache CDN', async () => {
    const { body, store } = await created();
    const res = await handleOg(new Request(`https://s/api/og?id=${body.id}`), store.env, store.fetch, imageFetch as unknown as typeof fetch);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toContain('s-maxage=2592000');
    const png = Buffer.from(await res.arrayBuffer());
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(size(png)).toEqual([OG_WIDTH, OG_HEIGHT]);
    expect(png[25]).toBe(3); // PNG à palette
    expect(String(imageFetch.mock.calls[0][0])).toContain('/500x500-');
  }, 30000);

  it('cover photo : PNG à palette nettement plus léger', async () => {
    // Cover de 500×500 en dégradés bruités, proche d'une photo.
    const w = 500;
    const rgba = new Uint8Array(w * w * 4);
    for (let i = 0; i < w * w; i++) {
      const x = i % w;
      const y = Math.floor(i / w);
      const n = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      rgba.set([(x * 255) / w, (y * 255) / w, 128 + n * 40, 255], i * 4);
    }
    const photo = Buffer.from(UPNG.encode([rgba.buffer], w, w, 0));
    const photoFetch = vi.fn(async () => new Response(photo, { headers: { 'content-type': 'image/png' } }));
    const { body, store } = await created();
    const res = await handleOg(new Request(`https://s/api/og?id=${body.id}`), store.env, store.fetch, photoFetch as unknown as typeof fetch);
    const png = await res.arrayBuffer();
    expect(png.byteLength).toBeLessThan(300_000);
  }, 30000);

  it('cover injoignable : image de secours, cache court', async () => {
    const { body, store } = await created();
    const down = vi.fn().mockRejectedValue(new Error('réseau'));
    const res = await handleOg(new Request(`https://s/api/og?id=${body.id}`), store.env, store.fetch, down);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('s-maxage=600');
  }, 30000);

  it('écriture non latine et emoji sans réseau : l’image sort quand même', async () => {
    const jp: SharedAlbum = { ...album, artist: { ...album.artist, name: '宇多田ヒカル 🔥' } };
    const { body, store } = await created(memoryRedis(), 'album', jp);
    const down = vi.fn().mockRejectedValue(new Error('réseau'));
    const res = await handleOg(new Request(`https://s/api/og?id=${body.id}`), store.env, store.fetch, down);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(down.mock.calls.some(([u]) => String(u).startsWith('https://fonts.googleapis.com/css2?family=Noto+Sans+JP'))).toBe(true);
    expect(down.mock.calls.some(([u]) => String(u).includes('/twemoji@14.0.2/assets/svg/1f525.svg'))).toBe(true);
  }, 30000);

  it('nom de fichier Twemoji', () => {
    expect(emojiCode('🔥')).toBe('1f525');
    expect(emojiCode('❤️')).toBe('2764');
    expect(emojiCode('👩‍❤️‍👨')).toBe('1f469-200d-2764-fe0f-200d-1f468');
  });

  it('accueil sans id, erreurs d’id', async () => {
    const store = memoryRedis();
    const home = await handleOg(new Request('https://s/api/og'), store.env, store.fetch);
    expect(size(Buffer.from(await home.arrayBuffer()))).toEqual([OG_WIDTH, OG_HEIGHT]);
    expect((await handleOg(new Request('https://s/api/og?id=ZZZZZZZZ'), store.env, store.fetch)).status).toBe(404);
    expect((await handleOg(new Request('https://s/api/og?id=ZZZZZZZZ&v=2'), store.env, store.fetch)).status).toBe(400);
  }, 30000);

  it('ne va chercher que des images Deezer', async () => {
    const f = vi.fn();
    expect(await imageData('https://evil.com/x.png', f as unknown as typeof fetch)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
