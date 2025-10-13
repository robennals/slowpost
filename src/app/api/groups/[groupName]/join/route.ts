import { createRouteHandler } from '@/server/api/routeHandler';
import { joinGroupHandler } from './handler';

export const runtime = 'nodejs';

export const POST = createRouteHandler(joinGroupHandler, { requireAuth: true });
