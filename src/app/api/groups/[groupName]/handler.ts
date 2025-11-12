import { ApiError, requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const getGroupHandler: Handler<unknown, { groupName: string }> = async (_req, { params }) => {
  const { db } = getHandlerDeps();
  const group = await db.getDocument<any>('groups', params.groupName);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  const membersWithProfiles = await db.getGroupMembersWithProfiles(params.groupName);
  const members = membersWithProfiles.map(({ membership, profile }) => ({
    ...membership,
    fullName: profile.fullName || membership.username,
  }));

  return success({ ...group, members });
};

export const updateGroupHandler: Handler<
  { isPublic?: boolean; displayName?: string; description?: string },
  { groupName: string }
> = async (_req, ctx) => {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { groupName } = ctx.params;

  const group = await db.getDocument<any>('groups', groupName);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  // Check if user is an admin
  const members = await db.getChildLinks<any>('members', groupName);
  const userMembership = members.find((m) => m.username === user.username);

  if (!userMembership || !userMembership.isAdmin) {
    throw new ApiError(403, 'Only group admins can update group settings');
  }

  const updates: Record<string, unknown> = {};
  if (ctx.body?.isPublic !== undefined) updates.isPublic = ctx.body.isPublic;
  if (ctx.body?.displayName !== undefined) updates.displayName = ctx.body.displayName;
  if (ctx.body?.description !== undefined) updates.description = ctx.body.description;

  await db.updateDocument('groups', groupName, updates);
  const updatedGroup = await db.getDocument('groups', groupName);

  return success(updatedGroup);
};
