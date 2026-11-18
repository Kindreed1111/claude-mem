import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { handleDeezer, handleImage } from './server/proxy';
import { handleAudio } from './server/audio';
import { handleCredits } from './server/credits';
import { handleDiscography } from './server/discography';
import { memoryRedis } from './server/memoryRedis';
import { handleOg } from './server/og';
import { handlePage } from './server/page';
import { redisEnv } from './server/redis';
import { handleShare } from './server/share';
import { handleStats } from './server/stats';

// En dev, sert les routes /api/* (et les liens courts /a/<id>) avec le même code que les fonctions Vercel.
// Les liens courts vivent en mémoire si aucune base n'est configurée : rien n'est écrit en production.
function devApi(): Plugin {
  const store = redisEnv() ? null : memoryRedis();
  const env = store?.env ?? redisEnv();
  const redisFetch = store?.fetch ?? fetch;
  const routes: Record<string, (r: Request) => Promise<Response>> = {
    '/api/deezer': handleDeezer,
    '/api/image': handleImage,
    '/api/credits': (r) => handleCredits(r),
    '/api/discography': (r) => handleDiscography(r),
    '/api/audio': (r) => handleAudio(r),
    '/api/stats': (r) => handleStats(r),
    '/api/share': (r) => handleShare(r, env, redisFetch),
    '/api/og': (r) => handleOg(r, env, redisFetch),
  };
  return {
    name: 'album-parfait-dev-api',
    configureServer(server) {
      const page = (r: Request) =>
        handlePage(r, async () => server.transformIndexHtml(new URL(r.url).pathname, await readFile('index.html', 'utf8')), env, redisFetch);
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        const handler = url.pathname.startsWith('/a/') ? page : routes[url.pathname];
        if (!handler) return next();
        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          const response = await handler(new Request(url, { method: req.method, headers, body }));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          if (response.body) Readable.fromWeb(response.body as never).pipe(res);
          else res.end();
        } catch (err) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: { message: String(err) } }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
  test: { environment: 'node' },
});
