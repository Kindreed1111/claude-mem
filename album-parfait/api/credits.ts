import { handleCredits } from '../server/credits.js';

export function GET(request: Request): Promise<Response> {
  return handleCredits(request);
}
