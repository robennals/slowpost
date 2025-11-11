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

  // Use optimized single-query method if available, otherwise fall back
  if (db.getUserGroupsWithMembership) {
    const groupsData = await db.getUserGroupsWithMembership(ctx.params.username, viewerUsername);

    const visibleGroups = groupsData
      .filter(({ group, membership, viewerMembership }) => {
        const groupWithMembership = {
          ...group,
          memberBio: membership.groupBio,
          memberStatus: membership.status,
        };

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
  }

  // Fallback to old implementation if optimized method not available
  const memberships = await db.getParentLinks<any>('members', ctx.params.username);
  const visibleGroups: any[] = [];

  for (const membership of memberships) {
    const group = await db.getDocument<any>('groups', membership.groupName);
    if (!group) continue;

    const groupMembers = await db.getChildLinks<any>('members', membership.groupName);
    const groupWithMembership = {
      ...group,
      memberBio: membership.groupBio,
      memberStatus: membership.status,
    };

    if (groupWithMembership.memberStatus === 'pending') {
      if (viewerUsername === ctx.params.username) {
        visibleGroups.push(groupWithMembership);
        continue;
      }

      if (viewerUsername) {
        const viewerMembership = groupMembers.find((m: any) => m.username === viewerUsername);
        if (viewerMembership?.isAdmin && viewerMembership?.status === 'approved') {
          visibleGroups.push(groupWithMembership);
        }
      }
      continue;
    }

    if (groupWithMembership.isPublic) {
      visibleGroups.push(groupWithMembership);
      continue;
    }

    if (!viewerUsername) {
      continue;
    }

    const viewerMembership = groupMembers.find((m: any) => m.username === viewerUsername);
    if (viewerMembership && viewerMembership.status === 'approved') {
      visibleGroups.push(groupWithMembership);
    }
  }

  return success(visibleGroups);
};
