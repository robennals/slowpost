import { createRouteHandler } from '@/server/api/routeHandler';
import { getUpdatesHandler } from './handler';

export const runtime = 'nodejs';

export const GET = createRouteHandler(getUpdatesHandler);
