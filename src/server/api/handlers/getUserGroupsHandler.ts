import { success, type HandlerContext, type RequestLike } from '../types';
import { getHandlerDeps } from '../context';

export async function getUserGroupsHandler(
  _req: RequestLike,
  ctx: HandlerContext<unknown, { username: string }>
) {
  const { db, authService } = getHandlerDeps();
  const memberships = await db.getParentLinks<any>('members', ctx.params.username);

  let viewerUsername: string | null = null;
  const token = ctx.cookies?.auth_token;
  if (token) {
    const session = await authService.verifySession(token);
    if (session) {
      viewerUsername = session.username;
    }
  }

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
}
