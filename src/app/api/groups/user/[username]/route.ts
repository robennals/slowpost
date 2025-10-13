import { createRouteHandler } from '@/server/api/routeHandler';
import { getUserGroupsHandler } from './handler';

export const runtime = 'nodejs';

export const GET = createRouteHandler(getUserGroupsHandler);
