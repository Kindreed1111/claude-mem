// Accès minimal à Upstash Redis (API REST, sans dépendance), partagé par les classements et les limites.

export interface RedisEnv {
  url: string;
  token: string;
}

export function redisEnv(env: Record<string, string | undefined> = process.env): RedisEnv | null {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export async function pipeline(env: RedisEnv, commands: string[][], fetchImpl: typeof fetch = fetch): Promise<unknown[]> {
  const res = await fetchImpl(`${env.url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const out = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(`Upstash : ${failed.error}`);
  return out.map((r) => r.result);
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
