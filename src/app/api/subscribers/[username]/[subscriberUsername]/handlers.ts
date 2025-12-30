import { ApiError, requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

type SubscriberParams = { username: string; subscriberUsername: string };

export const updateSubscriberHandler: Handler<{ isClose?: boolean; pendingFullName?: string }, SubscriberParams> = async (_req, ctx) => {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username, subscriberUsername } = ctx.params;
  if (user.username !== username) {
    throw new ApiError(403, 'You can only update your own subscribers');
  }

  const updates: any = {};
  if (ctx.body?.isClose !== undefined) {
    updates.isClose = ctx.body.isClose;
  }
  if (ctx.body?.pendingFullName !== undefined) {
    updates.pendingFullName = ctx.body.pendingFullName;
  }

  await db.updateLink('subscriptions', username, subscriberUsername, updates);

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

export const removeSubscriberHandler: Handler<unknown, SubscriberParams> = async (_req, ctx) => {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username, subscriberUsername } = ctx.params;
  if (user.username !== username) {
    throw new ApiError(403, 'You can only remove your own subscribers');
  }

  await db.deleteLink('subscriptions', username, subscriberUsername);
  return success({ success: true });
};
