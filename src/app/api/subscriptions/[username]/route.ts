import { createRouteHandler } from '@/server/api/routeHandler';
import { getSubscriptionsHandler } from './handler';

export const runtime = 'nodejs';

export const GET = createRouteHandler(getSubscriptionsHandler);
