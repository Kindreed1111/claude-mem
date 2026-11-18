// Page d'un lien court /a/<id> : index.html avec les balises Open Graph et Twitter de l'album,
// plus l'album lui-même (le client n'a pas à le redemander). Les robots des messageries ne lisent que ce HTML.

import { readShortPath, shareHash, SHORT_ID, type ShortShare } from '../src/lib/share.js';
import { redisEnv, type RedisEnv } from './redis.js';
import { loadShare } from './share.js';

/** L'id fixe le contenu ; la page ne vit qu'avec ses assets, donc pas plus d'un jour au CDN. */
const PAGE_CACHE = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400';
const MAX_DESCRIPTION = 300;

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
}

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ENTITIES[c]);

/** JSON sans risque dans un <script> : ni </script>, ni <!--, ni séparateurs de ligne. */
export const scriptJson = (x: unknown) =>
  JSON.stringify(x)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

/** Origine publique : Vercel renseigne x-forwarded-host / x-forwarded-proto. */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = (request.headers.get('x-forwarded-host') ?? url.host).split(',')[0].trim();
  const proto = (request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')).split(',')[0].trim();
  return `${proto}://${host}`;
}

const pad = (n: number) => String(n).padStart(2, '0');
const clamp = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);

export function metaFor(share: ShortShare, origin: string): PageMeta {
  const { id, kind, album } = share;
  const name = album.artist.name;
  const url = `${origin}/a/${id}`;
  const image = `${origin}/api/og?id=${id}`;
  // Le défi ne dévoile ni les pistes ni la cover : l'ami doit composer le sien avant de comparer.
  if (kind === 'defi') {
    return {
      title: `Défi : l’album parfait de ${name}`,
      description: `Compose ton album parfait de ${name} en 10 pistes, puis compare-le avec celui de ton ami.`,
      url,
      image,
      imageAlt: `Défi album parfait : ${name}`,
    };
  }
  const firsts = album.tracks
    .slice(0, 3)
    .map((t, i) => `${pad(i + 1)} ${t?.title ?? '—'}`)
    .join(' · ');
  return {
    title: `L’album parfait de ${name}`,
    description: clamp(`${firsts}… Cover : ${album.cover.title}. Compose le tien sur album parfait.`, MAX_DESCRIPTION),
    url,
    image,
    imageAlt: `L’album parfait de ${name} : ${firsts}`,
  };
}

export function metaTags(m: PageMeta): string {
  const e = escapeHtml;
  return [
    `<title>${e(m.title)}</title>`,
    `<meta name="description" content="${e(m.description)}" />`,
    `<link rel="canonical" href="${e(m.url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="album parfait." />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:title" content="${e(m.title)}" />`,
    `<meta property="og:description" content="${e(m.description)}" />`,
    `<meta property="og:url" content="${e(m.url)}" />`,
    `<meta property="og:image" content="${e(m.image)}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${e(m.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${e(m.title)}" />`,
    `<meta name="twitter:description" content="${e(m.description)}" />`,
    `<meta name="twitter:image" content="${e(m.image)}" />`,
    `<meta name="twitter:image:alt" content="${e(m.imageAlt)}" />`,
  ].join('\n    ');
}

/** Balises par défaut de index.html, remplacées par celles de l'album. */
const DEFAULT_TAGS = [
  /<title>[\s\S]*?<\/title>\s*/gi,
  /<meta\s+name="description"[^>]*>\s*/gi,
  /<link\s+rel="canonical"[^>]*>\s*/gi,
  /<meta\s+property="og:[^"]*"[^>]*>\s*/gi,
  /<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi,
];

export function injectPage(html: string, share: ShortShare, origin: string): string {
  let out = html;
  for (const re of DEFAULT_TAGS) out = out.replace(re, '');
  const head = `    ${metaTags(metaFor(share, origin))}\n    <script id="ap-share" type="application/json">${scriptJson(share)}</script>\n  `;
  return out.replace(/<\/head>/i, `${head}</head>`);
}

/** Sans index.html : les balises pour les robots, puis l'ancien lien long pour les humains. */
function fallbackPage(share: ShortShare, origin: string): string {
  const target = escapeHtml(`/${shareHash(share.kind, share.album)}`);
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    ${metaTags(metaFor(share, origin))}
    <meta http-equiv="refresh" content="0; url=${target}" />
  </head>
  <body><a href="${target}">ouvrir l’album</a></body>
</html>
`;
}

const html = (body: string, status: number, cache: string) =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache } });

export async function handlePage(
  request: Request,
  loadIndex: () => Promise<string>,
  env: RedisEnv | null = redisEnv(),
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  // Selon la réécriture, l'id arrive en paramètre (?id=) ou reste dans le chemin (/a/<id>).
  const id = url.searchParams.get('id') ?? readShortPath(url.pathname);
  let share: ShortShare | null = null;
  let failed = false;
  if (id && SHORT_ID.test(id) && env) {
    try {
      share = await loadShare(env, id, fetchImpl);
    } catch {
      failed = true;
    }
  }
  const origin = requestOrigin(request);
  let index: string;
  try {
    index = await loadIndex();
  } catch {
    return share ? html(fallbackPage(share, origin), 200, 'no-store') : html('album introuvable', 404, 'no-store');
  }
  // Lien inconnu ou base injoignable : l'accueil, avec ses balises par défaut.
  if (!share) return html(index, failed ? 503 : 404, failed ? 'no-store' : 'public, max-age=0, s-maxage=60');
  return html(injectPage(index, share, origin), 200, PAGE_CACHE);
}

/** index.html du déploiement, relu une fois par instance. */
export function remoteIndex(fetchImpl: typeof fetch = fetch): (request: Request) => Promise<string> {
  let cached: Promise<string> | null = null;
  return (request) => {
    if (cached) return cached;
    const p = fetchImpl(new URL('/index.html', requestOrigin(request)), { headers: { accept: 'text/html' } }).then(async (r) => {
      if (!r.ok) throw new Error(`index.html ${r.status}`);
      const text = await r.text();
      if (!text.includes('<div id="root">')) throw new Error('index.html inattendu');
      return text;
    });
    cached = p;
    p.catch(() => {
      if (cached === p) cached = null;
    });
    return p;
  };
}
