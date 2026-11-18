import { describe, expect, it, vi } from 'vitest';
import { handleAudio } from './audio';
import { computeDiscography, handleDiscography } from './discography';
import { clientIp, soleIdParam } from './http';
import { checkLimit, LIMITS } from './ratelimit';

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
const env = { url: 'https://r', token: 't' };

describe('paramètres', () => {
  it('n’accepte qu’un identifiant, seul', () => {
    expect(soleIdParam(new Request('https://s/api/x?artist=525046'), 'artist')).toBe(525046);
    expect(soleIdParam(new Request('https://s/api/x?artist=525046&v=2'), 'artist')).toBeNull();
    expect(soleIdParam(new Request('https://s/api/x?artist=abc'), 'artist')).toBeNull();
    expect(soleIdParam(new Request('https://s/api/x'), 'artist')).toBeNull();
  });

  it('lit l’IP fournie par Vercel', () => {
    expect(clientIp(new Request('https://s', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } }))).toBe('1.2.3.4');
    expect(clientIp(new Request('https://s', { headers: { 'x-real-ip': '5.6.7.8', 'x-forwarded-for': '1.2.3.4' } }))).toBe('5.6.7.8');
  });
});

describe('limites par IP', () => {
  const req = () => new Request('https://s/api/discography?artist=1', { headers: { 'x-real-ip': '1.2.3.4' } });

  it('compte par fenêtre et refuse au-delà du maximum', async () => {
    const under = vi.fn().mockResolvedValue(json([{ result: 30 }, { result: 1 }]));
    expect((await checkLimit(req(), LIMITS.discography, env, under, 3_600_000 * 10 + 5_000)).ok).toBe(true);
    const cmds = JSON.parse(under.mock.calls[0][1].body);
    expect(cmds[0][0]).toBe('INCR');
    expect(cmds[0][1]).toMatch(/^ap:rl:disco:[0-9a-f]{32}:10$/);
    expect(cmds[0][1]).not.toContain('1.2.3.4');
    expect(cmds[1]).toEqual(['EXPIRE', cmds[0][1], '3600']);
    const over = vi.fn().mockResolvedValue(json([{ result: 31 }, { result: 1 }]));
    const v = await checkLimit(req(), LIMITS.discography, env, over, 3_600_000 * 10 + 5_000);
    expect(v).toEqual({ ok: false, retryAfter: 3595 });
  });

  it('laisse passer sans base ou si la base est en panne', async () => {
    expect((await checkLimit(req(), LIMITS.discography, null)).ok).toBe(true);
    const down = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    expect((await checkLimit(req(), LIMITS.discography, env, down)).ok).toBe(true);
  });
});

describe('discographie', () => {
  const routes: Record<string, unknown> = {
    'https://api.deezer.com/artist/1/albums?limit=100&index=0': {
      data: [
        { id: 50, title: 'LP', cover_xl: 'c', md5_image: 'm', release_date: '2020-01-01', record_type: 'album' },
        { id: 51, title: 'Vide', cover_xl: 'c', md5_image: 'n', release_date: '2021-01-01', record_type: 'single' },
      ],
    },
    'https://api.deezer.com/album/50/tracks?limit=100&index=0': {
      data: [{ id: 501, title: 'Solo', track_position: 1, disk_number: 1, preview: 'https://cdnt-preview.dzcdn.net/x.mp3', artist: { id: 1, name: 'Me' } }],
    },
    'https://api.deezer.com/album/51/tracks?limit=100&index=0': { data: [] },
  };
  const fetchImpl = vi.fn(async (url: string) => json(routes[url] ?? { error: { code: 800, message: `inconnu ${url}` } }));

  it('renvoie projets et tracklists en une fois, sans lien d’extrait périssable', async () => {
    const d = await computeDiscography(1, fetchImpl as unknown as typeof fetch);
    expect(d.complete).toBe(true);
    expect(d.projects.map((p) => p.id)).toEqual([50]);
    expect(d.projects[0].tracks[0]).toMatchObject({ id: 501, hasPreview: true, projectId: 50 });
    expect(JSON.stringify(d)).not.toContain('cdnt-preview');
  });

  it('cache long, refuse les paramètres en trop et les IP trop gourmandes', async () => {
    const ok = await handleDiscography(new Request('https://s/api/discography?artist=1'), fetchImpl as unknown as typeof fetch, null);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('cache-control')).toContain('s-maxage=86400');
    expect((await handleDiscography(new Request('https://s/api/discography?artist=1&x=1'), fetchImpl as unknown as typeof fetch, null)).status).toBe(400);
    const over = vi.fn().mockResolvedValue(json([{ result: 99 }, { result: 1 }]));
    const limited = await handleDiscography(new Request('https://s/api/discography?artist=1'), over as unknown as typeof fetch, env);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toMatch(/^\d+$/);
    expect(over).toHaveBeenCalledTimes(1);
  });
});

describe('extraits audio', () => {
  it('redirige vers un lien frais, gardé 5 min au plus', async () => {
    const fetchImpl = vi.fn(async (_url: string) => json({ preview: 'https://cdnt-preview.dzcdn.net/api/1/1/a.mp3?hdnea=exp=1' }));
    const res = await handleAudio(new Request('https://s/api/audio?track=3106586641'), fetchImpl as unknown as typeof fetch);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://cdnt-preview.dzcdn.net/api/1/1/a.mp3?hdnea=exp=1');
    expect(res.headers.get('cache-control')).toContain('s-maxage=300');
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.deezer.com/track/3106586641');
  });

  it('404 sans extrait, 400 si la piste est invalide', async () => {
    const none = vi.fn(async () => json({ preview: '' }));
    expect((await handleAudio(new Request('https://s/api/audio?track=1'), none as unknown as typeof fetch)).status).toBe(404);
    const evil = vi.fn(async () => json({ preview: 'https://evil.com/a.mp3' }));
    expect((await handleAudio(new Request('https://s/api/audio?track=1'), evil as unknown as typeof fetch)).status).toBe(404);
    expect((await handleAudio(new Request('https://s/api/audio?track=x'))).status).toBe(400);
  });
});
