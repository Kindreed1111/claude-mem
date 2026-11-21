import { handleStats } from '../server/stats.js';

export function GET(request: Request): Promise<Response> {
  return handleStats(request);
}

export function POST(request: Request): Promise<Response> {
  return handleStats(request);
}
