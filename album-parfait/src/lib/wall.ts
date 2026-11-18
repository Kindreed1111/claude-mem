import type { WallItem } from './types';

/** Pochettes du mur de l'accueil ; en cas d'échec, liste vide (l'accueil reste épuré). */
export async function fetchWall(fetchImpl: typeof fetch = fetch): Promise<WallItem[]> {
  try {
    const res = await fetchImpl('/api/wall');
    if (!res.ok) return [];
    const body = (await res.json()) as { items?: unknown };
    return Array.isArray(body.items) ? (body.items as WallItem[]) : [];
  } catch {
    return [];
  }
}
