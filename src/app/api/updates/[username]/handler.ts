import { success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const getUpdatesHandler: Handler<unknown, { username: string }> = async (_req, { params }) => {
  const { db } = getHandlerDeps();
  const updates = await db.getChildLinks<any>('updates', params.username);
  const sorted = updates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return success(sorted);
};
