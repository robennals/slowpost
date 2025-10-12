import { ApiError, success, type HandlerContext, type RequestLike } from '../types.js';
import { requireUser } from '../types.js';
import { getHandlerDeps } from '../context.js';

export async function unsubscribeHandler(
  _req: RequestLike,
  ctx: HandlerContext<unknown, { username: string; subscriberUsername: string }>
) {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username, subscriberUsername } = ctx.params;
  if (user.username !== subscriberUsername) {
    throw new ApiError(403, 'You can only unsubscribe yourself');
  }

  await db.deleteLink('subscriptions', username, subscriberUsername);
  return success({ success: true });
}
