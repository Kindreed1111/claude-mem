// /api/audio?track=ID : redirige vers un extrait de 30 s à jour.
// Les liens d'extraits Deezer expirent 15 min après avoir été générés : ceux des tracklists en cache
// sont donc vite périmés. Ici, le lien est relu chez Deezer et gardé au plus 5 min par le CDN.

import { DEEZER_DIRECT, dz } from '../src/lib/deezer.js';
import { json, soleIdParam } from './http.js';

const PREVIEW = /^https:\/\/[a-z0-9-]+\.dzcdn\.net\//;

export async function handleAudio(request: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const id = soleIdParam(request, 'track');
  if (id === null) return json({ error: { message: 'piste invalide' } }, 400);
  try {
    const t = await dz<{ preview?: string }>(`track/${id}`, {}, fetchImpl, DEEZER_DIRECT);
    const preview = t.preview ?? '';
    if (!PREVIEW.test(preview)) return json({ error: { message: 'pas d’extrait pour ce titre' } }, 404, 'public, s-maxage=3600');
    return new Response(null, { status: 302, headers: { location: preview, 'cache-control': 'public, max-age=0, s-maxage=300' } });
  } catch (err) {
    return json({ error: { message: err instanceof Error ? err.message : String(err) } }, 502);
  }
}
