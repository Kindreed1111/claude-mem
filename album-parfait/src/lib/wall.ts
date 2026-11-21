import type { WallItem } from './types';

declare global {
  interface Window {
    /** Requête /api/wall lancée par index.html dès l'arrivée sur l'accueil (sans #album / #defi). */
    __apWall?: Promise<Response>;
  }
}

/** Pochettes du mur de l'accueil ; en cas d'échec, liste vide (l'accueil reste épuré). */
export async function fetchWall(fetchImpl: typeof fetch = fetch): Promise<WallItem[]> {
  const early = typeof window !== 'undefined' ? window.__apWall : undefined;
  if (early) window.__apWall = undefined;
  try {
    const res = await (early ?? fetchImpl('/api/wall'));
    if (!res.ok) return [];
    const body = (await res.json()) as { items?: unknown };
    return Array.isArray(body.items) ? (body.items as WallItem[]) : [];
  } catch {
    return [];
  }
}
