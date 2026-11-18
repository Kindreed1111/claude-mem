// Image d'aperçu 1200×630 (Open Graph / Twitter) d'un lien court, dans la DA du site :
// olive #333300, crème #d6d5c5, Cormorant Garamond et IBM Plex Mono.

// Rendu : satori (≥ 0.33.5, qui échappe correctement le texte fourni par les joueurs) puis resvg en WebAssembly.
// @vercel/og n'est pas utilisé : ses versions 1.0.x plantent en ESM sous Node (hb.wasm introuvable)
// et ses versions 0.x embarquent un satori vulnérable (GHSA-wx4j-mvgx-mqwp).

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactElement } from 'react';
import satori from 'satori';
import UPNG from 'upng-js';
import { isDeezerImage, SHORT_ID, type ShortShare } from '../src/lib/share.js';
import { json } from './http.js';
import { redisEnv, type RedisEnv } from './redis.js';
import { loadShare } from './share.js';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
const OK_CACHE = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000';
/** Cover injoignable : image de secours, régénérée bientôt. */
const DEGRADED_CACHE = 'public, max-age=300, s-maxage=600';

const OLIVE = '#333300';
const CREAM = '#d6d5c5';
const CREAM_DIM = 'rgba(214, 213, 197, 0.6)';
const LINE = 'rgba(214, 213, 197, 0.22)';
// Le sous-ensemble « latin étendu » porte un autre nom : Satori ne retient qu'une police par famille et graisse.
const SERIF = 'Cormorant Garamond, Cormorant Garamond Ext';
const MONO = 'IBM Plex Mono, IBM Plex Mono Ext';
const [SERIF_BASE, SERIF_EXT] = ['Cormorant Garamond', 'Cormorant Garamond Ext'];
const [MONO_BASE, MONO_EXT] = ['IBM Plex Mono', 'IBM Plex Mono Ext'];

type Style = Record<string, string | number>;
interface VNode {
  type: string;
  props: Record<string, unknown>;
}
type Child = VNode | string | null;

/** Satori accepte des objets { type, props } : pas besoin de JSX côté serveur. */
function h(type: string, style: Style, ...children: Child[]): VNode {
  const kids = children.filter((c) => c !== null);
  return { type, props: { style, children: kids.length === 1 ? kids[0] : kids } };
}
const img = (src: string, style: Style): VNode => ({ type: 'img', props: { src, style } });

// ——— Polices (sous-ensembles latin + latin étendu, licence OFL) ———
type FontWeight = 300 | 400;
const FONT_FILES: Array<[string, FontWeight, 'normal' | 'italic', string]> = [
  [SERIF_BASE, 300, 'normal', 'cormorant-garamond-latin-300-normal.woff'],
  [SERIF_EXT, 300, 'normal', 'cormorant-garamond-latin-ext-300-normal.woff'],
  [SERIF_BASE, 300, 'italic', 'cormorant-garamond-latin-300-italic.woff'],
  [SERIF_EXT, 300, 'italic', 'cormorant-garamond-latin-ext-300-italic.woff'],
  [SERIF_BASE, 400, 'normal', 'cormorant-garamond-latin-400-normal.woff'],
  [SERIF_EXT, 400, 'normal', 'cormorant-garamond-latin-ext-400-normal.woff'],
  [MONO_BASE, 400, 'normal', 'ibm-plex-mono-latin-400-normal.woff'],
  [MONO_EXT, 400, 'normal', 'ibm-plex-mono-latin-ext-400-normal.woff'],
];

let fonts: Promise<Font[]> | null = null;
function loadFonts() {
  fonts ??= Promise.all(
    FONT_FILES.map(async ([name, weight, style, file]) => {
      const buf = await readFile(new URL(`./fonts/${file}`, import.meta.url));
      return { name, weight, style, data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer };
    }),
  );
  fonts.catch(() => {
    fonts = null;
  });
  return fonts;
}

let resvg: Promise<void> | null = null;
function loadResvg() {
  resvg ??= readFile(createRequire(import.meta.url).resolve('@resvg/resvg-wasm/index_bg.wasm'))
    .then((wasm) => initWasm(wasm))
    .catch((e: unknown) => {
      // Module déjà initialisé (rechargement à chaud en dev) : rien à refaire.
      if (!String(e).includes('Already initialized')) throw e;
    });
  resvg.catch(() => {
    resvg = null;
  });
  return resvg;
}

// ——— Écritures non latines et emoji : polices Noto et Twemoji chargées à la demande, comme @vercel/og ———
const FALLBACK_FONTS: Record<string, string[]> = {
  'ja-JP': ['Noto+Sans+JP'],
  'ko-KR': ['Noto+Sans+KR'],
  'zh-CN': ['Noto+Sans+SC'],
  'zh-TW': ['Noto+Sans+TC'],
  'zh-HK': ['Noto+Sans+HK'],
  'th-TH': ['Noto+Sans+Thai'],
  'bn-IN': ['Noto+Sans+Bengali'],
  'ar-AR': ['Noto+Sans+Arabic'],
  'ta-IN': ['Noto+Sans+Tamil'],
  'ml-IN': ['Noto+Sans+Malayalam'],
  'he-IL': ['Noto+Sans+Hebrew'],
  'te-IN': ['Noto+Sans+Telugu'],
  devanagari: ['Noto+Sans+Devanagari'],
  kannada: ['Noto+Sans+Kannada'],
  symbol: ['Noto+Sans+Symbols', 'Noto+Sans+Symbols+2'],
  math: ['Noto+Sans+Math'],
  unknown: ['Noto+Sans'],
};
/** Un vieux Safari : Google Fonts répond alors en TTF, que satori sait lire. */
const TTF_AGENT =
  'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1';

interface Font {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: 'normal' | 'italic';
  lang?: string;
}

async function googleFont(family: string, text: string, fetchImpl: typeof fetch): Promise<ArrayBuffer | null> {
  const css = await fetchImpl(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`, {
    headers: { 'user-agent': TTF_AGENT },
    signal: AbortSignal.timeout(4000),
  });
  const src = /src: url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\) format\('(?:opentype|truetype)'\)/.exec(await css.text())?.[1];
  if (!src) return null;
  const res = await fetchImpl(src, { signal: AbortSignal.timeout(4000) });
  return res.ok ? res.arrayBuffer() : null;
}

/** Nom de fichier Twemoji : points de code en hexadécimal, sans sélecteur de variante hors séquences ZWJ. */
export function emojiCode(segment: string): string {
  const s = segment.includes('\u200d') ? segment : segment.replace(/\ufe0f/g, '');
  return [...s].map((c) => c.codePointAt(0)!.toString(16)).join('-');
}

async function loadAsset(code: string, segment: string, fetchImpl: typeof fetch): Promise<string | Font[]> {
  if (code === 'emoji') {
    const res = await fetchImpl(`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${emojiCode(segment)}.svg`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('svg')) throw new Error(`emoji ${res.status}`);
    return `data:image/svg+xml;base64,${Buffer.from(await res.text()).toString('base64')}`;
  }
  const out: Font[] = [];
  for (const lang of code.split('|')) {
    for (const family of FALLBACK_FONTS[lang] ?? []) {
      const data = await googleFont(family, segment, fetchImpl);
      if (data) out.push({ name: `secours-${lang}-${family}`, data, weight: 400, style: 'normal', lang: lang === 'unknown' ? undefined : lang });
    }
  }
  return out;
}

const assets = new Map<string, Promise<string | Font[]>>();
/** Échec réseau : le glyphe manque, l'image sort quand même (et l'échec n'est pas retenu). */
function additionalAsset(fetchImpl: typeof fetch) {
  return (code: string, segment: string): Promise<string | Font[]> => {
    const key = `${code}\n${segment}`;
    let pending = assets.get(key);
    if (!pending) {
      pending = loadAsset(code, segment, fetchImpl).catch(() => {
        assets.delete(key);
        return code === 'emoji' ? '' : [];
      });
      assets.set(key, pending);
      if (assets.size > 300) assets.delete(assets.keys().next().value!);
    }
    return pending;
  };
}

/** Image Deezer en data URI (500×500 suffit), ou null si elle ne vient pas. */
export async function imageData(url: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  if (!isDeezerImage(url)) return null;
  const resized = url.replace(/\/\d{2,4}x\d{2,4}-/, '/500x500-');
  for (const candidate of resized === url ? [url] : [resized, url]) {
    try {
      const res = await fetchImpl(candidate, { signal: AbortSignal.timeout(5000) });
      const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
      if (!res.ok || !/^image\/(?:jpeg|png)$/.test(type)) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0 || buf.length > 3_000_000) continue;
      return `data:${type};base64,${buf.toString('base64')}`;
    } catch {
      /* candidat suivant */
    }
  }
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const nameSize = (name: string) => (name.length <= 12 ? 96 : name.length <= 18 ? 80 : name.length <= 28 ? 64 : 52);

function frame(left: VNode, right: VNode[]): VNode {
  return h(
    'div',
    {
      display: 'flex',
      width: OG_WIDTH,
      height: OG_HEIGHT,
      padding: 64,
      backgroundColor: OLIVE,
      backgroundImage: 'radial-gradient(circle at 18% 12%, rgba(77, 80, 0, 0.8) 0%, rgba(51, 51, 0, 0) 60%)',
      color: CREAM,
      fontFamily: MONO,
    },
    left,
    h('div', { display: 'flex', flexDirection: 'column', width: OG_WIDTH - 2 * 64 - 502 - 56, minWidth: 0, marginLeft: 56, height: 502 }, ...right),
  );
}

const wordmark = () =>
  h(
    'div',
    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    h('div', { fontFamily: SERIF, fontWeight: 400, fontSize: 32 }, 'album parfait.'),
    h('div', { fontSize: 14, letterSpacing: 2, color: CREAM_DIM }, 'ALBUM-PARFAIT.VERCEL.APP'),
  );

const kicker = (text: string) =>
  h('div', { display: 'flex', marginTop: 'auto', fontSize: 15, letterSpacing: 2.1, color: CREAM_DIM, textTransform: 'uppercase' }, text);

const headline = (name: string) =>
  h(
    'div',
    {
      display: 'block',
      marginTop: 12,
      fontFamily: SERIF,
      fontWeight: 300,
      fontSize: nameSize(name),
      lineHeight: 0.98,
      letterSpacing: -1.5,
      lineClamp: 2,
    },
    name,
  );

// Flou modéré : resvg met ~1,8 s pour un flou de 50 px, ~0,4 s pour 24 px.
const shadow = '0 18px 24px rgba(0, 0, 0, 0.5)';

function vinyl(label: string | null): VNode {
  return h(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 502,
      height: 502,
      borderRadius: 251,
      backgroundColor: '#0b0b0b',
      backgroundImage: 'repeating-radial-gradient(circle, #0b0b0b 0px, #0b0b0b 3px, #1d1d16 4px, #0b0b0b 6px)',
      boxShadow: shadow,
    },
    h(
      'div',
      {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 196,
        height: 196,
        borderRadius: 98,
        backgroundColor: CREAM,
        color: OLIVE,
        fontFamily: SERIF,
        fontSize: 54,
        overflow: 'hidden',
      },
      label ? img(label, { width: 196, height: 196, borderRadius: 98, objectFit: 'cover' }) : 'ap.',
    ),
  );
}

export function albumCard(share: ShortShare, cover: string | null): VNode {
  const { album } = share;
  const rows = album.tracks.slice(0, 3).map((t, i) =>
    h(
      'div',
      { display: 'flex', alignItems: 'center', borderTop: `1px solid ${LINE}`, paddingTop: 9, paddingBottom: 9 },
      h('div', { display: 'flex', width: 44, fontSize: 15, color: CREAM_DIM }, pad(i + 1)),
      h(
        'div',
        { display: 'block', flex: 1, minWidth: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 32, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
        t?.title ?? '—',
      ),
    ),
  );
  const rest = album.tracks.length - 3;
  return frame(cover ? img(cover, { width: 502, height: 502, objectFit: 'cover', boxShadow: shadow }) : vinyl(null), [
    wordmark(),
    kicker('l’album parfait de'),
    headline(album.artist.name),
    h('div', { display: 'flex', flexDirection: 'column', marginTop: 26 }, ...rows),
    h(
      'div',
      { display: 'flex', borderTop: `1px solid ${LINE}`, paddingTop: 12, fontSize: 14, color: CREAM_DIM, whiteSpace: 'nowrap', overflow: 'hidden' },
      `+ ${rest} pistes · cover : ${album.cover.title}`,
    ),
  ]);
}

/** Défi : ni pistes ni cover, l'ami doit d'abord composer le sien. */
export function challengeCard(share: ShortShare, picture: string | null): VNode {
  return frame(vinyl(picture), [
    wordmark(),
    kicker('défi · compose l’album parfait de'),
    headline(share.album.artist.name),
    h(
      'div',
      { display: 'flex', marginTop: 26, fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 34, lineHeight: 1.15 },
      'ton ami a pressé le sien. compose le tien, puis comparez.',
    ),
    h('div', { display: 'flex', borderTop: `1px solid ${LINE}`, marginTop: 22, paddingTop: 12, fontSize: 14, color: CREAM_DIM }, '10 pistes · 1 cover · le duel'),
  ]);
}

export function homeCard(): VNode {
  return frame(vinyl(null), [
    h('div', { display: 'flex', fontSize: 14, letterSpacing: 2, color: CREAM_DIM }, 'ALBUM-PARFAIT.VERCEL.APP'),
    kicker('un artiste · une cover · 10 pistes'),
    h('div', { display: 'flex', marginTop: 12, fontFamily: SERIF, fontWeight: 300, fontSize: 104, lineHeight: 0.95, letterSpacing: -2 }, 'album parfait.'),
    h(
      'div',
      { display: 'flex', marginTop: 26, fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 34, lineHeight: 1.15 },
      'compose l’album parfait de ton artiste, puis partage-le ou défie un ami.',
    ),
    h('div', { display: 'flex', borderTop: `1px solid ${LINE}`, marginTop: 22, paddingTop: 12, fontSize: 14, color: CREAM_DIM }, 'intro · feat · interlude · outro'),
  ]);
}

/**
 * PNG 8 bits (palette de 256 couleurs) : une cover colorée passe d'environ 550 Ko à 120 Ko.
 * WhatsApp n'affiche pas les images d'aperçu trop lourdes (environ 300 Ko).
 */
export function quantize(png: ArrayBuffer): ArrayBuffer {
  const img = UPNG.decode(png);
  const out = UPNG.encode(UPNG.toRGBA8(img), img.width, img.height, 256);
  return out.byteLength < png.byteLength ? out : png;
}

export async function renderPng(node: VNode, fetchImpl: typeof fetch = fetch): Promise<ArrayBuffer> {
  const [fontList] = await Promise.all([loadFonts(), loadResvg()]);
  const svg = await satori(node as unknown as ReactElement, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: fontList,
    loadAdditionalAsset: additionalAsset(fetchImpl),
  });
  const renderer = new Resvg(svg, { fitTo: { mode: 'original' } });
  const image = renderer.render();
  try {
    const png = image.asPng();
    return quantize(png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer);
  } finally {
    image.free();
    renderer.free();
  }
}

const png = (data: ArrayBuffer, cache: string) =>
  new Response(data, { status: 200, headers: { 'content-type': 'image/png', 'cache-control': cache } });

export async function handleOg(
  request: Request,
  env: RedisEnv | null = redisEnv(),
  redisFetch: typeof fetch = fetch,
  imageFetch: typeof fetch = fetch,
): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const keys = [...params.keys()];
  try {
    if (keys.length === 0) return png(await renderPng(homeCard(), imageFetch), 'public, max-age=86400, s-maxage=604800');
    const id = params.get('id') ?? '';
    if (keys.length !== 1 || keys[0] !== 'id' || !SHORT_ID.test(id)) return json({ error: { message: 'identifiant invalide' } }, 400);
    if (!env) return json({ error: { message: 'partage indisponible' } }, 503);
    const share = await loadShare(env, id, redisFetch);
    if (!share) return json({ error: { message: 'album introuvable' } }, 404, 'public, max-age=0, s-maxage=60');
    if (share.kind === 'defi') {
      const wanted = share.album.artist.picture;
      const picture = wanted ? await imageData(wanted, imageFetch) : null;
      return png(await renderPng(challengeCard(share, picture), imageFetch), picture || !wanted ? OK_CACHE : DEGRADED_CACHE);
    }
    const cover = await imageData(share.album.cover.url, imageFetch);
    return png(await renderPng(albumCard(share, cover), imageFetch), cover ? OK_CACHE : DEGRADED_CACHE);
  } catch (err) {
    return json({ error: { message: String(err) } }, 500);
  }
}
