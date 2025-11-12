import { createRouteHandler } from '@/server/api/routeHandler';
import { getGroupHandler, updateGroupHandler } from './handler';

export const runtime = 'nodejs';

export const GET = createRouteHandler(getGroupHandler);
export const PUT = createRouteHandler(updateGroupHandler, { requireAuth: true });
