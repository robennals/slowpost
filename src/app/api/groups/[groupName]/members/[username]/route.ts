import { createRouteHandler } from '@/server/api/routeHandler';
import { leaveGroupHandler, updateGroupMemberHandler } from './handlers';

export const runtime = 'nodejs';

export const PUT = createRouteHandler(updateGroupMemberHandler, { requireAuth: true });
export const DELETE = createRouteHandler(leaveGroupHandler, { requireAuth: true });
