import { handleAudio } from '../server/audio.js';

export function GET(request: Request): Promise<Response> {
  return handleAudio(request);
}
