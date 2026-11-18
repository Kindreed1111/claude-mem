import { handleImage } from '../server/proxy';

export function GET(request: Request): Promise<Response> {
  return handleImage(request);
}
