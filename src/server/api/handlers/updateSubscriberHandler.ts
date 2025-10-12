import { ApiError, success, type HandlerContext, type RequestLike } from '../types';
import { requireUser } from '../types';
import { getHandlerDeps } from '../context';

export async function updateSubscriberHandler(
  _req: RequestLike,
  ctx: HandlerContext<{ isClose?: boolean }, { username: string; subscriberUsername: string }>
) {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username, subscriberUsername } = ctx.params;
  if (user.username !== username) {
    throw new ApiError(403, 'You can only update your own subscribers');
  }

  await db.updateLink('subscriptions', username, subscriberUsername, {
    isClose: ctx.body?.isClose,
  });

  return success({ success: true });
}
