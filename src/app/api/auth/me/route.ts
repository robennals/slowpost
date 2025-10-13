import { createRouteHandler } from '@/server/api/routeHandler';
import { currentUserHandler } from './handler';

export const runtime = 'nodejs';

export const GET = createRouteHandler(currentUserHandler, { requireAuth: true });
