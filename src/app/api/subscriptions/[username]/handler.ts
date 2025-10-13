import { success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const getSubscriptionsHandler: Handler<unknown, { username: string }> = async (_req, { params }) => {
  const { db } = getHandlerDeps();
  const subscriptions = await db.getParentLinks('subscriptions', params.username);
  return success(subscriptions);
};
