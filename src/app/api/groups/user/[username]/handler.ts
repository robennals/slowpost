import { success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const getUserGroupsHandler: Handler<unknown, { username: string }> = async (_req, ctx) => {
  const { db, authService } = getHandlerDeps();

  // Get viewer username for visibility checks
  let viewerUsername: string | null = null;
  const token = ctx.cookies?.auth_token;
  if (token) {
    const session = await authService.verifySession(token);
    if (session) {
      viewerUsername = session.username;
    }
  }

  const groupsData = await db.getUserGroupsWithMembership(ctx.params.username, viewerUsername);

  const visibleGroups = groupsData
    .filter(({ group, membership, viewerMembership }) => {
      // Pending memberships: only visible to user themselves or group admins
      if (membership.status === 'pending') {
        if (viewerUsername === ctx.params.username) {
          return true;
        }
        if (viewerMembership?.isAdmin && viewerMembership?.status === 'approved') {
          return true;
        }
        return false;
      }

      // Public groups: visible to everyone
      if (group.isPublic) {
        return true;
      }

      // Private groups: only visible to approved members
      if (!viewerUsername) {
        return false;
      }
      return viewerMembership && viewerMembership.status === 'approved';
    })
    .map(({ group, membership }) => ({
      ...group,
      memberBio: membership.groupBio,
      memberStatus: membership.status,
    }));

  return success(visibleGroups);
};
