import { createRouteHandler } from '@/server/api/routeHandler';
import { loginHandler } from './handler';

export const runtime = 'nodejs';

export const POST = createRouteHandler(loginHandler);
