import { describe, expect, it, vi } from 'vitest';
import type { WallItem } from '../src/lib/types';
import { handleWall, mergeWall, parseRecent } from './wall';

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
const env = { url: 'https://r', token: 't' };

const item = (albumId: number, artistId = 1): WallItem => ({
  albumId,
  title: `album ${albumId}`,
  cover: `c${albumId}-250`,
  coverBig: `c${albumId}-500`,
  artist: { id: artistId, name: `artiste ${artistId}`, picture: `p${artistId}` },
});

const rawAlbum = (id: number, artistId: number) => ({
  id,
  title: `album ${id}`,
  cover_medium: `c${id}-250`,
  cover_big: `c${id}-500`,
  artist: { id: artistId, name: `artiste ${artistId}`, picture_medium: `p${artistId}` },
});

/** Faux Deezer + faux Upstash, routés par URL. */
function fake(opts: { recent?: string[] | null; chart?: unknown[] | 'error'; albums?: Record<number, unknown> }) {
  return vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('https://r/pipeline')) return json([{ result: opts.recent ?? [] }]);
    if (url.includes('chart/116/albums')) {
      return opts.chart === 'error' ? json({ error: { code: 800, message: 'no data' } }) : json({ data: opts.chart ?? [] });
    }
    const m = url.match(/album\/(\d+)/);
    const a = m && opts.albums?.[Number(m[1])];
    return json(a ?? { error: { code: 800, message: 'no data' } });
  });
}

describe('mur de pochettes', () => {
  it('lit la liste des albums pressés', () => {
    expect(parseRecent(['1:2', 'x', '1:2', '3:4', '5:', 7])).toEqual([
      { artistId: 1, albumId: 2 },
      { artistId: 3, albumId: 4 },
    ]);
    expect(parseRecent(null)).toEqual([]);
  });

  it('met les albums pressés en premier, sans doublon, 30 au plus', () => {
    const chart = Array.from({ length: 40 }, (_, i) => item(100 + i));
    const out = mergeWall([item(7), item(101)], chart);
    expect(out).toHaveLength(30);
    expect(out.slice(0, 3).map((i) => i.albumId)).toEqual([7, 101, 100]);
    expect(out.filter((i) => i.albumId === 101)).toHaveLength(1);
  });

  it('refuse tout paramètre (clé de cache fixe)', async () => {
    const res = await handleWall(new Request('https://s/api/wall?x=1'), fake({}), env);
    expect(res.status).toBe(400);
  });

  it('fusionne albums pressés et classement, avec un long cache', async () => {
    const f = fake({
      recent: ['10:500', '11:501', '12:502', '13:503'],
      // 501 supprimé de Deezer ; 502 : l'artiste Deezer n'est pas celui de l'album pressé (compilation)
      albums: { 500: rawAlbum(500, 10), 502: rawAlbum(502, 99), 503: rawAlbum(503, 13) },
      chart: [rawAlbum(503, 13), rawAlbum(600, 20)],
    });
    const res = await handleWall(new Request('https://s/api/wall'), f, env);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    const { items } = (await res.json()) as { items: WallItem[] };
    expect(items.map((i) => i.albumId)).toEqual([500, 503, 600]);
    expect(items[0]).toEqual({
      albumId: 500,
      title: 'album 500',
      cover: 'c500-250',
      coverBig: 'c500-500',
      artist: { id: 10, name: 'artiste 10', picture: 'p10' },
    });
    const redisCall = f.mock.calls.find(([u]) => String(u).startsWith('https://r/'));
    expect(JSON.parse(String(redisCall?.[1]?.body))).toEqual([['LRANGE', 'ap:recent', '0', '99']]);
  });

  it('sans base : classement seul', async () => {
    const res = await handleWall(new Request('https://s/api/wall'), fake({ chart: [rawAlbum(600, 20)] }), null);
    expect(((await res.json()) as { items: WallItem[] }).items.map((i) => i.albumId)).toEqual([600]);
  });

  it('classement en panne : albums pressés seuls', async () => {
    const f = fake({ recent: ['10:500'], albums: { 500: rawAlbum(500, 10) }, chart: 'error' });
    const res = await handleWall(new Request('https://s/api/wall'), f, env);
    expect(((await res.json()) as { items: WallItem[] }).items.map((i) => i.albumId)).toEqual([500]);
  });

  it('rien du tout : liste vide, cache court', async () => {
    const res = await handleWall(new Request('https://s/api/wall'), fake({ chart: 'error' }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=60');
    expect(await res.json()).toEqual({ items: [] });
  });
});
