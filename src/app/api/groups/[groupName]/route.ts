import { createRouteHandler } from '@/server/api/routeHandler';
import { getGroupHandler } from './handler';

export const runtime = 'nodejs';

export const GET = createRouteHandler(getGroupHandler);
