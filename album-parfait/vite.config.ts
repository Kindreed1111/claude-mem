import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { Readable } from 'node:stream';
import { handleDeezer, handleImage } from './server/proxy';
import { handleAudio } from './server/audio';
import { handleCredits } from './server/credits';
import { handleDiscography } from './server/discography';
import { handleStats } from './server/stats';
import { handleWall } from './server/wall';

// En dev, sert les routes /api/* avec le même code que les fonctions Vercel.
function devApi(): Plugin {
  const routes: Record<string, (r: Request) => Promise<Response>> = {
    '/api/deezer': handleDeezer,
    '/api/image': handleImage,
    '/api/credits': (r) => handleCredits(r),
    '/api/discography': (r) => handleDiscography(r),
    '/api/audio': (r) => handleAudio(r),
    '/api/stats': (r) => handleStats(r),
    '/api/wall': (r) => handleWall(r),
  };
  return {
    name: 'album-parfait-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const handler = routes[url.pathname];
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
