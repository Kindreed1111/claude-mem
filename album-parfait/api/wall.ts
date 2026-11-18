import { handleWall } from '../server/wall.js';

export function GET(request: Request): Promise<Response> {
  return handleWall(request);
}
