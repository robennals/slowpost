import { success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const getSubscriptionsHandler: Handler<unknown, { username: string }> = async (_req, { params }) => {
  const { db } = getHandlerDeps();
  const subscriptionsWithProfiles = await db.getSubscriptionsWithProfiles(params.username);
  const subscriptions = subscriptionsWithProfiles.map(({ subscription, profile }) => ({
    ...subscription,
    fullName: profile.fullName || subscription.subscribedToUsername,
  }));
  return success(subscriptions);
};
