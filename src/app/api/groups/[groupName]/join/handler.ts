import { ApiError, requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const joinGroupHandler: Handler<{ groupBio?: string }, { groupName: string }> = async (_req, ctx) => {
  const { db, mailer } = getHandlerDeps();
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

  // Send email notifications to group admins
  if (mailer) {
    try {
      const requesterProfile = await db.getDocument<any>('profiles', user.username);
      const requesterFullName = requesterProfile?.fullName || user.username;

      for (const admin of admins) {
        try {
          const adminProfile = await db.getDocument<any>('profiles', admin.username);
          if (adminProfile?.email) {
            await mailer.sendGroupJoinRequestNotification(
              adminProfile.email,
              user.username,
              requesterFullName,
              groupName,
              group.displayName || groupName
            );
          }
        } catch (error) {
          console.error(`Failed to send group join notification to admin ${admin.username}:`, error);
          // Don't fail the join request if email fails for one admin
        }
      }
    } catch (error) {
      console.error('Failed to send group join notification emails:', error);
      // Don't fail the join request if email fails
    }
  }

  return success({ success: true });
};
