import { handleDiscography } from '../server/discography.js';

export function GET(request: Request): Promise<Response> {
  return handleDiscography(request);
}
