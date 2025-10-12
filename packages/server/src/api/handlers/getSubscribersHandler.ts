import { success, type HandlerContext, type RequestLike } from '../types.js';
import { getHandlerDeps } from '../context.js';

export async function getSubscribersHandler(
  _req: RequestLike,
  { params }: HandlerContext<unknown, { username: string }>
) {
  const { db } = getHandlerDeps();
  const subscribers = await db.getChildLinks('subscriptions', params.username);
  return success(subscribers);
}
