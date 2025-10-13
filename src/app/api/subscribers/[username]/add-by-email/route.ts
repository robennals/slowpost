import { createRouteHandler } from '@/server/api/routeHandler';
import { addSubscriberByEmailHandler } from './handler';

export const runtime = 'nodejs';

export const POST = createRouteHandler(addSubscriberByEmailHandler, { requireAuth: true });
