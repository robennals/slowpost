import { createRouteHandler } from '@/server/api/routeHandler';
import { requestPinHandler } from './handler';

export const runtime = 'nodejs';

export const POST = createRouteHandler(requestPinHandler);
