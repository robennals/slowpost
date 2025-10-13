import { createRouteHandler } from '@/server/api/routeHandler';
import { getSubscribersHandler, subscribeHandler } from './handlers';

export const runtime = 'nodejs';

export const GET = createRouteHandler(getSubscribersHandler);
export const POST = createRouteHandler(subscribeHandler, { requireAuth: true });
