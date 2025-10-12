import { ApiError, success, type HandlerContext, type RequestLike } from '../types';
import { requireUser } from '../types';
import { getHandlerDeps } from '../context';

export async function subscribeHandler(
  _req: RequestLike,
  ctx: HandlerContext<unknown, { username: string }>
) {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username } = ctx.params;
  if (username === user.username) {
    throw new ApiError(400, 'You cannot subscribe to yourself');
  }

  const existing = await db.getChildLinks('subscriptions', username);
  if (existing.some((s: any) => s.subscriberUsername === user.username)) {
    throw new ApiError(400, 'Already subscribed to this user');
  }

  const subscription = {
    subscriberUsername: user.username,
    subscribedToUsername: username,
    isClose: false,
    addedBy: user.username,
    confirmed: true,
    timestamp: new Date().toISOString(),
  };

  await db.addLink('subscriptions', username, user.username, subscription);

  const updateId = `${Date.now()}-${user.username}-subscribed`;
  const update = {
    id: updateId,
    type: 'new_subscriber',
    username: user.username,
    timestamp: new Date().toISOString(),
  };
  await db.addLink('updates', username, updateId, update);

  return success({ success: true, subscription });
}
