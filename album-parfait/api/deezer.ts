import { handleDeezer } from '../server/proxy';

export function GET(request: Request): Promise<Response> {
  return handleDeezer(request);
}
