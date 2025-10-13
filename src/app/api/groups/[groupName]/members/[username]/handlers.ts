import { ApiError, requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

type MemberParams = { groupName: string; username: string };

export const updateGroupMemberHandler: Handler<
  { groupBio?: string; status?: 'pending' | 'approved'; isAdmin?: boolean },
  MemberParams
> = async (_req, ctx) => {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { groupName, username } = ctx.params;
  const members = await db.getChildLinks<any>('members', groupName);
  const requesterMembership = members.find((m) => m.username === user.username);
  const isRequesterAdmin = requesterMembership?.isAdmin && requesterMembership?.status === 'approved';

  if (ctx.body?.groupBio !== undefined && user.username !== username && !isRequesterAdmin) {
    throw new ApiError(403, 'You can only update your own bio');
  }

  if ((ctx.body?.status !== undefined || ctx.body?.isAdmin !== undefined) && !isRequesterAdmin) {
    throw new ApiError(403, 'Only admins can approve members or toggle admin status');
  }

  const updates: Record<string, unknown> = {};
  if (ctx.body?.groupBio !== undefined) updates.groupBio = ctx.body.groupBio;
  if (ctx.body?.status !== undefined) updates.status = ctx.body.status;
  if (ctx.body?.isAdmin !== undefined) updates.isAdmin = ctx.body.isAdmin;

  await db.updateLink('members', groupName, username, updates);

  if (ctx.body?.status === 'approved') {
    const updateId = `${Date.now()}-${username}-approved-${groupName}`;
    const update = {
      id: updateId,
      type: 'group_join_approved',
      groupName,
      timestamp: new Date().toISOString(),
    };
    await db.addLink('updates', username, updateId, update);
  }

  return success({ success: true });
};

export const leaveGroupHandler: Handler<unknown, MemberParams> = async (_req, ctx) => {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { groupName, username } = ctx.params;
  if (user.username !== username) {
    throw new ApiError(403, 'You can only remove yourself');
  }

  await db.deleteLink('members', groupName, username);
  return success({ success: true });
};
