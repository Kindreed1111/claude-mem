// Upstash factice en mémoire, pour le serveur de dev et les tests : rien ne part vers la base de production.
// Commandes gérées : GET, SET [NX], INCR, EXPIRE.

import type { RedisEnv } from './redis.js';

export interface MemoryRedis {
  env: RedisEnv;
  fetch: typeof fetch;
  data: Map<string, string>;
}

export function memoryRedis(): MemoryRedis {
  const data = new Map<string, string>();
  const run = ([op, key, ...rest]: string[]): unknown => {
    switch (op.toUpperCase()) {
      case 'GET':
        return data.get(key) ?? null;
      case 'SET': {
        if (rest.slice(1).some((a) => a.toUpperCase() === 'NX') && data.has(key)) return null;
        data.set(key, rest[0]);
        return 'OK';
      }
      case 'INCR': {
        const n = Number(data.get(key) ?? 0) + 1;
        data.set(key, String(n));
        return n;
      }
      case 'EXPIRE':
        return 1;
      default:
        throw new Error(`commande non gérée : ${op}`);
    }
  };
  const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
    const commands = JSON.parse(String(init?.body)) as string[][];
    const out = commands.map((c) => {
      try {
        return { result: run(c) };
      } catch (e) {
        return { error: String(e) };
      }
    });
    return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { env: { url: 'memory://redis', token: 'dev' }, fetch: fetchImpl, data };
}
