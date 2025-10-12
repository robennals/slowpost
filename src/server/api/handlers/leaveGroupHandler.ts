import { ApiError, success, type HandlerContext, type RequestLike } from '../types';
import { requireUser } from '../types';
import { getHandlerDeps } from '../context';

export async function leaveGroupHandler(
  _req: RequestLike,
  ctx: HandlerContext<unknown, { groupName: string; username: string }>
) {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { groupName, username } = ctx.params;
  if (user.username !== username) {
    throw new ApiError(403, 'You can only remove yourself');
  }

  await db.deleteLink('members', groupName, username);
  return success({ success: true });
}
