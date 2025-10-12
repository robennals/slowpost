import { ApiError, success, type HandlerContext, type RequestLike } from '../types';
import { requireUser } from '../types';
import { getHandlerDeps } from '../context';

export async function confirmSubscriptionHandler(
  _req: RequestLike,
  ctx: HandlerContext<unknown, { username: string; subscriberUsername: string }>
) {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username, subscriberUsername } = ctx.params;
  if (user.username !== subscriberUsername) {
    throw new ApiError(403, 'You can only confirm your own subscription');
  }

  await db.updateLink('subscriptions', username, subscriberUsername, { confirmed: true });
  return success({ success: true });
}
