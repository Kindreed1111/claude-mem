// Proxy en liste blanche vers l'API publique Deezer (qui n'envoie pas d'en-tête CORS).
// Partagé par les fonctions Vercel (api/*.ts) et le middleware de dev (vite.config.ts).

const DEEZER = 'https://api.deezer.com/';
const ALLOWED_PATHS = [/^search\/artist$/, /^artist\/\d+\/albums$/, /^album\/\d+\/tracks$/, /^track\/\d+$/];
const ALLOWED_PARAMS = ['q', 'limit', 'index'] as const;
const CACHE = 'public, max-age=3600, s-maxage=86400';

export function resolveDeezerTarget(params: URLSearchParams): string | null {
  const path = params.get('path');
  if (!path || !ALLOWED_PATHS.some((re) => re.test(path))) return null;
  const query = new URLSearchParams();
  for (const key of ALLOWED_PARAMS) {
    const value = params.get(key);
    if (value !== null) query.set(key, value);
  }
  const qs = query.toString();
  return DEEZER + path + (qs ? `?${qs}` : '');
}

export function resolveImageTarget(raw: string | null): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.hostname !== 'dzcdn.net' && !url.hostname.endsWith('.dzcdn.net')) return null;
  return url.toString();
}

function badRequest(): Response {
  return new Response(JSON.stringify({ error: { message: 'chemin non autorisé' } }), {
    status: 400,
    headers: { 'content-type': 'application/json' },
  });
}

async function relay(target: string): Promise<Response> {
  const upstream = await fetch(target, { headers: { accept: '*/*' } });
  const headers = new Headers();
  headers.set('content-type', upstream.headers.get('content-type') ?? 'application/octet-stream');
  if (upstream.ok) headers.set('cache-control', CACHE);
  return new Response(upstream.body, { status: upstream.status, headers });
}

export async function handleDeezer(request: Request): Promise<Response> {
  const target = resolveDeezerTarget(new URL(request.url).searchParams);
  return target ? relay(target) : badRequest();
}

export async function handleImage(request: Request): Promise<Response> {
  const target = resolveImageTarget(new URL(request.url).searchParams.get('url'));
  return target ? relay(target) : badRequest();
}
