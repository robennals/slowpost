import { ApiError, success, type HandlerContext, type RequestLike } from '../types';
import { getHandlerDeps } from '../context';

export async function getGroupHandler(
  _req: RequestLike,
  { params }: HandlerContext<unknown, { groupName: string }>
) {
  const { db } = getHandlerDeps();
  const group = await db.getDocument<any>('groups', params.groupName);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  const members = await db.getChildLinks('members', params.groupName);
  return success({ ...group, members });
}
