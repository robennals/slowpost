import { ApiError, requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

type ConfirmParams = { username: string; subscriberUsername: string };

export const confirmSubscriptionHandler: Handler<unknown, ConfirmParams> = async (_req, ctx) => {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username, subscriberUsername } = ctx.params;
  if (user.username !== subscriberUsername) {
    throw new ApiError(403, 'You can only confirm your own subscription');
  }

  await db.updateLink('subscriptions', username, subscriberUsername, { confirmed: true });
  return success({ success: true });
};
