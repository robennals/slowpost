import { success, type RequestLike, type HandlerContext } from '../types';
import { CLEAR_AUTH_COOKIE } from './utils';

export async function logoutHandler(_req: RequestLike, _ctx: HandlerContext) {
  return success(
    { success: true },
    {
      cookies: [CLEAR_AUTH_COOKIE],
    }
  );
}
