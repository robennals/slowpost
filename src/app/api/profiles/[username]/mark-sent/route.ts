import { createRouteHandler } from '@/server/api/routeHandler';
import { markLetterSentHandler } from '../handlers';

export const runtime = 'nodejs';

export const POST = createRouteHandler(markLetterSentHandler, { requireAuth: true });
