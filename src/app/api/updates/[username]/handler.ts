import { success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const getUpdatesHandler: Handler<unknown, { username: string }> = async (_req, { params }) => {
  const { db } = getHandlerDeps();
  const updatesWithData = await db.getUpdatesWithProfilesAndGroups(params.username);
  const enriched = updatesWithData.map(({ update, profile, group }) => {
    const enrichedUpdate: any = {
      ...update,
      fullName: profile.fullName || update.username,
    };
    if (group) {
      enrichedUpdate.groupDisplayName = group.displayName || update.groupName;
    }
    return enrichedUpdate;
  });
  const sorted = enriched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return success(sorted);
};
