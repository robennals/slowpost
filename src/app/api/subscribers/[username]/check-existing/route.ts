import { createRouteHandler } from '@/server/api/routeHandler';
import { checkExistingSubscribersHandler } from './handler';

export const POST = createRouteHandler(checkExistingSubscribersHandler, {
  requireAuth: true,
});
