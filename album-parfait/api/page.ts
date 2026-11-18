import { handlePage, remoteIndex } from '../server/page.js';

// Servie par la réécriture /a/:id (vercel.json).
const loadIndex = remoteIndex();

export function GET(request: Request): Promise<Response> {
  return handlePage(request, () => loadIndex(request));
}

export const HEAD = GET;
