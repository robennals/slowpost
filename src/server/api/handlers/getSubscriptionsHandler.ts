import { success, type HandlerContext, type RequestLike } from '../types';
import { getHandlerDeps } from '../context';

export async function getSubscriptionsHandler(
  _req: RequestLike,
  { params }: HandlerContext<unknown, { username: string }>
) {
  const { db } = getHandlerDeps();
  const subscriptions = await db.getParentLinks('subscriptions', params.username);
  return success(subscriptions);
}
