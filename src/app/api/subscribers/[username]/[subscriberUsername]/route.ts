import { createRouteHandler } from '@/server/api/routeHandler';
import { updateSubscriberHandler, unsubscribeHandler } from './handlers';

export const runtime = 'nodejs';

export const PUT = createRouteHandler(updateSubscriberHandler, { requireAuth: true });
export const DELETE = createRouteHandler(unsubscribeHandler, { requireAuth: true });
