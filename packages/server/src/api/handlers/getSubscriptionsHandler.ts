import { success, type HandlerContext, type RequestLike } from '../types.js';
import { getHandlerDeps } from '../context.js';

export async function getSubscriptionsHandler(
  _req: RequestLike,
  { params }: HandlerContext<unknown, { username: string }>
) {
  const { db } = getHandlerDeps();
  const subscriptions = await db.getParentLinks('subscriptions', params.username);
  return success(subscriptions);
}
