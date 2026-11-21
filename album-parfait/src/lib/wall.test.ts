import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WallItem } from './types';
import { fetchWall } from './wall';

const item = { albumId: 1, title: 't', cover: 'c', coverBig: 'C', artist: { id: 2, name: 'a', picture: '' } } satisfies WallItem;
const ok = () => new Response(JSON.stringify({ items: [item] }));
const win = globalThis as unknown as { window?: { __apWall?: Promise<Response> } };

describe('fetchWall', () => {
  afterEach(() => {
    delete win.window;
  });

  it('reprend une seule fois la requête lancée par index.html', async () => {
    win.window = { __apWall: Promise.resolve(ok()) };
    const fetchImpl = vi.fn(async () => ok());
    expect(await fetchWall(fetchImpl)).toEqual([item]);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(await fetchWall(fetchImpl)).toEqual([item]);
    expect(fetchImpl).toHaveBeenCalledWith('/api/wall');
  });

  it('renvoie une liste vide en cas d’échec', async () => {
    win.window = { __apWall: Promise.reject(new Error('réseau')) };
    expect(await fetchWall(vi.fn(async () => ok()))).toEqual([]);
    expect(await fetchWall(vi.fn(async () => new Response('', { status: 502 })))).toEqual([]);
  });
});
