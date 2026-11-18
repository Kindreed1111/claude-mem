import { handleOg } from '../server/og.js';

export function GET(request: Request): Promise<Response> {
  return handleOg(request);
}

export const HEAD = GET;
