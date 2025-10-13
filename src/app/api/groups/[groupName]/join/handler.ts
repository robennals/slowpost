import { ApiError, requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const joinGroupHandler: Handler<{ groupBio?: string }, { groupName: string }> = async (_req, ctx) => {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { groupName } = ctx.params;
  const group = await db.getDocument<any>('groups', groupName);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  const members = await db.getChildLinks<any>('members', groupName);
  if (members.some((m) => m.username === user.username)) {
    throw new ApiError(400, 'Already a member of this group');
  }

  const member = {
    groupName,
    username: user.username,
    groupBio: ctx.body?.groupBio || '',
    status: 'pending',
    isAdmin: false,
    timestamp: new Date().toISOString(),
  };

  await db.addLink('members', groupName, user.username, member);

  const updateId = `${Date.now()}-${user.username}-request-${groupName}`;
  const update = {
    id: updateId,
    type: 'group_join_request',
    username: user.username,
    groupName,
    timestamp: new Date().toISOString(),
  };

  const allMembers = await db.getChildLinks<any>('members', groupName);
  const admins = allMembers.filter((m) => m.isAdmin && m.status === 'approved');
  for (const admin of admins) {
    await db.addLink('updates', admin.username, `${updateId}-${admin.username}`, update);
  }

  return success({ success: true });
};
