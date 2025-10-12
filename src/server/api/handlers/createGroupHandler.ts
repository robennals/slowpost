import { ApiError, success, type HandlerContext, type RequestLike } from '../types';
import { requireUser } from '../types';
import { getHandlerDeps } from '../context';

export async function createGroupHandler(
  _req: RequestLike,
  ctx: HandlerContext<{ groupName?: string; displayName?: string; description?: string; isPublic?: boolean }>
) {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { groupName, displayName, description, isPublic } = ctx.body ?? {};

  if (!groupName || !displayName) {
    throw new ApiError(400, 'Group name and display name are required');
  }

  const existing = await db.getDocument('groups', groupName);
  if (existing) {
    throw new ApiError(400, 'Group already exists');
  }

  const group = {
    groupName,
    displayName,
    description: description || '',
    adminUsername: user.username,
    isPublic: isPublic !== false,
  };

  await db.addDocument('groups', groupName, group);

  const member = {
    groupName,
    username: user.username,
    groupBio: 'Creator',
    status: 'approved',
    isAdmin: true,
    timestamp: new Date().toISOString(),
  };

  await db.addLink('members', groupName, user.username, member);

  return success({ success: true, group });
}
