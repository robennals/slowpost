import { ApiError, requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

type SubscriberParams = { username: string; subscriberUsername: string };

export const updateSubscriberHandler: Handler<{ isClose?: boolean }, SubscriberParams> = async (_req, ctx) => {
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
};

export const unsubscribeHandler: Handler<unknown, SubscriberParams> = async (_req, ctx) => {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username, subscriberUsername } = ctx.params;
  if (user.username !== subscriberUsername) {
    throw new ApiError(403, 'You can only unsubscribe yourself');
  }

  await db.deleteLink('subscriptions', username, subscriberUsername);
  return success({ success: true });
};
