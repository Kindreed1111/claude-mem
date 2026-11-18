import { describe, expect, it, vi } from 'vitest';
import { computeCredits, handleCredits } from './credits';
import { handleStats, parseSubmission, redisEnv, submissionCommands } from './stats';

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

describe('stats', () => {
  const sub = { artistId: 525046, coverId: 9, slots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };

  it('valide la soumission', () => {
    expect(parseSubmission(sub)).toEqual(sub);
    expect(parseSubmission({ ...sub, slots: sub.slots.slice(0, 9) })).toBeNull();
    expect(parseSubmission({ ...sub, slots: [1, 1, 3, 4, 5, 6, 7, 8, 9, 10] })).toBeNull();
    expect(parseSubmission({ ...sub, slots: ['1', 2, 3, 4, 5, 6, 7, 8, 9, 10] })).toBeNull();
    expect(parseSubmission({ ...sub, artistId: 'x' })).toBeNull();
    expect(parseSubmission(null)).toBeNull();
  });

  it('range chaque piste dans son classement', () => {
    const cmds = submissionCommands(sub);
    expect(cmds[0]).toEqual(['ZINCRBY', 'ap:525046:intro', '1', '1']);
    expect(cmds[1]).toEqual(['ZINCRBY', 'ap:525046:feat', '1', '2']);
    expect(cmds[2]).toEqual(['ZINCRBY', 'ap:525046:free', '1', '3']);
    expect(cmds[6]).toEqual(['ZINCRBY', 'ap:525046:interlude', '1', '7']);
    expect(cmds[9]).toEqual(['ZINCRBY', 'ap:525046:outro', '1', '10']);
    expect(cmds[10]).toEqual(['ZINCRBY', 'ap:525046:cover', '1', '9']);
    expect(cmds[11]).toEqual(['INCR', 'ap:525046:albums']);
    expect(cmds[12]).toEqual(['LPUSH', 'ap:recent', '525046:9']);
    expect(cmds[13]).toEqual(['LTRIM', 'ap:recent', '0', '99']);
  });

  it('lit les variables Vercel KV ou Upstash', () => {
    expect(redisEnv({ KV_REST_API_URL: 'https://x.upstash.io/', KV_REST_API_TOKEN: 't' })).toEqual({ url: 'https://x.upstash.io', token: 't' });
    expect(redisEnv({ UPSTASH_REDIS_REST_URL: 'https://y', UPSTASH_REDIS_REST_TOKEN: 'u' })).toEqual({ url: 'https://y', token: 'u' });
    expect(redisEnv({})).toBeNull();
  });

  it('désactivé sans base', async () => {
    const res = await handleStats(new Request('https://s/api/stats?artist=1'), null);
    expect(await res.json()).toEqual({ enabled: false });
  });

  it('GET renvoie le top par catégorie', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json([{ result: ['11', '5', '12', '2'] }, { result: [] }, { result: [] }, { result: [] }, { result: [] }, { result: ['9', '3'] }, { result: '7' }]),
    );
    const res = await handleStats(new Request('https://s/api/stats?artist=525046'), { url: 'https://r', token: 't' }, fetchImpl);
    const body = await res.json();
    expect(body.albums).toBe(7);
    expect(body.top.intro).toEqual([
      { id: 11, count: 5 },
      { id: 12, count: 2 },
    ]);
    expect(body.top.cover).toEqual([{ id: 9, count: 3 }]);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://r/pipeline');
    expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer t');
  });

  it('POST compte une fois puis ignore le doublon', async () => {
    const env = { url: 'https://r', token: 't' };
    const post = () =>
      new Request('https://s/api/stats', { method: 'POST', body: JSON.stringify(sub), headers: { 'x-forwarded-for': '1.2.3.4' } });
    const limitOk = () => json([{ result: 1 }, { result: 1 }]);
    const first = vi
      .fn()
      .mockResolvedValueOnce(limitOk())
      .mockResolvedValueOnce(json([{ result: 'OK' }]))
      .mockResolvedValueOnce(json(Array(12).fill({ result: 1 })));
    expect(await (await handleStats(post(), env, first)).json()).toEqual({ enabled: true, recorded: true });
    expect(JSON.parse(first.mock.calls[2][1].body)).toHaveLength(14);
    const dup = vi.fn().mockResolvedValueOnce(limitOk()).mockResolvedValueOnce(json([{ result: null }]));
    expect((await (await handleStats(post(), env, dup)).json()).recorded).toBe(false);
    expect(dup).toHaveBeenCalledTimes(2);
  });

  it('POST refuse au-delà de 30 albums par jour et par IP', async () => {
    const env = { url: 'https://r', token: 't' };
    const over = vi.fn().mockResolvedValueOnce(json([{ result: 31 }, { result: 1 }]));
    const res = await handleStats(new Request('https://s/api/stats', { method: 'POST', body: JSON.stringify(sub) }), env, over);
    expect(res.status).toBe(429);
    expect(over).toHaveBeenCalledTimes(1);
  });

  it('POST refuse un album invalide', async () => {
    const res = await handleStats(new Request('https://s/api/stats', { method: 'POST', body: '{"artistId":1}' }), { url: 'https://r', token: 't' });
    expect(res.status).toBe(400);
  });
});

describe('credits', () => {
  const routes: Record<string, unknown> = {
    'https://api.deezer.com/artist/1/albums?limit=100&index=0': {
      data: [{ id: 50, title: 'LP', cover_xl: 'c', md5_image: 'm', release_date: '2020-01-01', record_type: 'album' }],
    },
    'https://api.deezer.com/album/50/tracks?limit=100&index=0': {
      data: [
        { id: 501, title: 'Solo', track_position: 1, disk_number: 1, preview: '', artist: { id: 1, name: 'Me' } },
        { id: 502, title: 'Duo', track_position: 2, disk_number: 1, preview: '', artist: { id: 1, name: 'Me' } },
        { id: 503, title: 'Guest', track_position: 3, disk_number: 1, preview: '', artist: { id: 2, name: 'Other' } },
      ],
    },
    'https://api.deezer.com/track/501': { contributors: [{ id: 1 }] },
    'https://api.deezer.com/track/502': { contributors: [{ id: 1 }, { id: 3 }] },
  };
  const fetchImpl = vi.fn(async (url: string) => json(routes[url] ?? { error: { code: 800, message: `inconnu ${url}` } }));

  it('analyse uniquement les pistes propres', async () => {
    const r = await computeCredits(1, fetchImpl as unknown as typeof fetch);
    expect(r).toEqual({ artistId: 1, complete: true, contributors: { 501: [1], 502: [1, 3] } });
    expect(fetchImpl.mock.calls.some(([u]) => u === 'https://api.deezer.com/track/503')).toBe(false);
  });

  it('met en cache longtemps une réponse complète, refuse un id invalide', async () => {
    const ok = await handleCredits(new Request('https://s/api/credits?artist=1'), fetchImpl as unknown as typeof fetch);
    expect(ok.headers.get('cache-control')).toContain('s-maxage=86400');
    expect(ok.headers.get('cache-control')).toContain('stale-while-revalidate=604800');
    const bad = await handleCredits(new Request('https://s/api/credits?artist=abc'));
    expect(bad.status).toBe(400);
  });
});
