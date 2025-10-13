import { createRouteHandler } from '@/server/api/routeHandler';
import { getProfileHandler, updateProfileHandler } from './handlers';

export const runtime = 'nodejs';

export const GET = createRouteHandler(getProfileHandler);
export const PUT = createRouteHandler(updateProfileHandler, { requireAuth: true });
