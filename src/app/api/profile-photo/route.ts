import { createRouteHandler } from '@/server/api/routeHandler';
import { uploadProfilePhotoHandler } from './handlers';

export const runtime = 'nodejs';

export const POST = createRouteHandler(uploadProfilePhotoHandler, { requireAuth: true });
