// Petits utilitaires communs aux fonctions Vercel.

export const json = (body: unknown, status = 200, cache = 'no-store', extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': cache, ...extra },
  });

/**
 * Lit un identifiant numérique et refuse tout autre paramètre : `?artist=1&x=2` contournerait le cache CDN
 * (une URL différente = un nouveau calcul complet).
 */
export function soleIdParam(request: Request, name: string): number | null {
  const params = new URL(request.url).searchParams;
  const keys = [...params.keys()];
  const raw = params.get(name) ?? '';
  if (keys.length !== 1 || keys[0] !== name || !/^\d{1,13}$/.test(raw)) return null;
  return Number(raw);
}

/** IP du visiteur : Vercel remplace ces en-têtes, le client ne peut pas les falsifier. */
export function clientIp(request: Request): string {
  return (request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
}
