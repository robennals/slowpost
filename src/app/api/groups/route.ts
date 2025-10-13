import { createRouteHandler } from '@/server/api/routeHandler';
import { createGroupHandler } from './handler';

export const runtime = 'nodejs';

export const POST = createRouteHandler(createGroupHandler, { requireAuth: true });
