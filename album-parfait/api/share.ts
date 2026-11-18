import { handleShare } from '../server/share.js';

export function GET(request: Request): Promise<Response> {
  return handleShare(request);
}

export function POST(request: Request): Promise<Response> {
  return handleShare(request);
}
