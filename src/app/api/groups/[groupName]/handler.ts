import { ApiError, success, type Handler } from '@/server/api/types';
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
