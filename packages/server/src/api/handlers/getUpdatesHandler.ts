import { success, type HandlerContext, type RequestLike } from '../types.js';
import { getHandlerDeps } from '../context.js';

export async function getUpdatesHandler(
  _req: RequestLike,
  { params }: HandlerContext<unknown, { username: string }>
) {
  const { db } = getHandlerDeps();
  const updates = await db.getChildLinks<any>('updates', params.username);
  const sorted = updates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return success(sorted);
}
