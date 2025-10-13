import { createRouteHandler } from '@/server/api/routeHandler';
import { confirmSubscriptionHandler } from './handler';

export const runtime = 'nodejs';

export const POST = createRouteHandler(confirmSubscriptionHandler, { requireAuth: true });
