import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { Readable } from 'node:stream';
import { handleDeezer, handleImage } from './server/proxy';

// En dev, sert /api/deezer et /api/image avec le même code que les fonctions Vercel.
function devApi(): Plugin {
  const routes: Record<string, (r: Request) => Promise<Response>> = {
    '/api/deezer': handleDeezer,
    '/api/image': handleImage,
  };
  return {
    name: 'album-parfait-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const handler = routes[url.pathname];
        if (!handler) return next();
        try {
          const response = await handler(new Request(url));
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
