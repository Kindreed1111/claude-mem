import { handleDeezer } from '../server/proxy.js';

export function GET(request: Request): Promise<Response> {
  return handleDeezer(request);
}
