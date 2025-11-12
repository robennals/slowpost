import { createRouteHandler } from '@/server/api/routeHandler';
import { sendRemindersHandler } from './handler';

export const runtime = 'nodejs';

// This endpoint is called by Vercel Cron (configured in vercel.json)
// It is protected by the CRON_SECRET environment variable
// Vercel automatically sends the secret as: Authorization: Bearer [CRON_SECRET]
export const GET = createRouteHandler(sendRemindersHandler);
export const POST = createRouteHandler(sendRemindersHandler);
