import { success, type HandlerContext, type RequestLike } from '../types';
import { requireUser } from '../types';

export async function currentUserHandler(_req: RequestLike, ctx: HandlerContext) {
  const user = requireUser(ctx);
  return success({ username: user.username, fullName: user.fullName });
}
