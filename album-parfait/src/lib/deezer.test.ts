import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLimiter, dz, DeezerQuotaError, fetchContributorIds, fetchProjects } from './deezer';

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

afterEach(() => vi.useRealTimers());

describe('dz', () => {
  it('réessaie après une erreur de quota puis résout', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ error: { code: 4, message: 'Quota limit exceeded' } }))
      .mockResolvedValueOnce(json({ id: 1 }));
    const promise = dz<{ id: number }>('track/1', {}, fetchImpl as unknown as typeof fetch);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toEqual({ id: 1 });
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/deezer?path=track%2F1');
  });

  it('abandonne après 3 nouvelles tentatives', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockImplementation(async () => json({ error: { code: 4 } }));
    const promise = dz('track/1', {}, fetchImpl as unknown as typeof fetch);
    const assertion = expect(promise).rejects.toBeInstanceOf(DeezerQuotaError);
    await vi.advanceTimersByTimeAsync(7000);
    await assertion;
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('rejette sur une autre erreur Deezer', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ error: { code: 800, message: 'no data' } }));
    await expect(dz('track/1', {}, fetchImpl as unknown as typeof fetch)).rejects.toThrow('no data');
  });
});

describe('createLimiter', () => {
  it('ne dépasse jamais la concurrence demandée', async () => {
    const limit = createLimiter({ concurrency: 6, minIntervalMs: 0 });
    let running = 0;
    let peak = 0;
    const task = () =>
      limit(async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 5));
        running--;
      });
    await Promise.all(Array.from({ length: 30 }, task));
    expect(peak).toBe(6);
  });
});

describe('annulation', () => {
  it('ne lance pas une requête en file si le signal est annulé', async () => {
    const fetchImpl = vi.fn();
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(fetchContributorIds(1, { fetchImpl: fetchImpl as unknown as typeof fetch, signal: ctrl.signal })).rejects.toThrow(
      'Requête annulée',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('fetchProjects', () => {
  it('suit la pagination next', async () => {
    const page = (ids: number[], next?: string) =>
      json({
        data: ids.map((id) => ({
          id,
          title: `P${id}`,
          cover_xl: `c${id}`,
          md5_image: `m${id}`,
          release_date: '2020-01-01',
          record_type: 'album',
        })),
        total: 3,
        ...(next ? { next } : {}),
      });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(page([1, 2], 'https://api.deezer.com/artist/9/albums?limit=100&index=100'))
      .mockResolvedValueOnce(page([3]));
    const projects = await fetchProjects(9, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(projects.map((p) => p.id)).toEqual([1, 2, 3]);
    expect(projects[0]).toEqual({ id: 1, title: 'P1', cover: 'c1', md5: 'm1', releaseDate: '2020-01-01', recordType: 'album' });
    expect(fetchImpl.mock.calls[1][0]).toContain('index=100');
  });
});
