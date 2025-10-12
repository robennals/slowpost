import { success, type RequestLike, type HandlerContext } from '../types.js';
import { CLEAR_AUTH_COOKIE } from './utils.js';

export async function logoutHandler(_req: RequestLike, _ctx: HandlerContext) {
  return success(
    { success: true },
    {
      cookies: [CLEAR_AUTH_COOKIE],
    }
  );
}
