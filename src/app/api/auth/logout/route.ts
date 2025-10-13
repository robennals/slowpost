import { createRouteHandler } from '@/server/api/routeHandler';
import { logoutHandler } from './handler';

export const runtime = 'nodejs';

export const POST = createRouteHandler(logoutHandler);
