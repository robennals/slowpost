import { createRouteHandler } from '@/server/api/routeHandler';
import { signupHandler } from './handler';

export const runtime = 'nodejs';

export const POST = createRouteHandler(signupHandler);
