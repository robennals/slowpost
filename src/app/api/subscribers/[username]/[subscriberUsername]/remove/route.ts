import { createRouteHandler } from '@/server/api/routeHandler';
import { removeSubscriberHandler } from '../handlers';

export const runtime = 'nodejs';

export const POST = createRouteHandler(removeSubscriberHandler, { requireAuth: true });
