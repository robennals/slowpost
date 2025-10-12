import { ApiError, success, type HandlerContext, type RequestLike } from '../types.js';
import { authCookie } from './utils.js';
import { getHandlerDeps } from '../context.js';

export async function loginHandler(
  _req: RequestLike,
  { body }: HandlerContext<{ email?: string; pin?: string }>
) {
  const { authService, db } = getHandlerDeps();
  const email = body?.email;
  const pin = body?.pin;

  if (!email || !pin) {
    throw new ApiError(400, 'Email and PIN are required');
  }

  const valid = await authService.verifyPin(email, pin);
  if (!valid) {
    throw new ApiError(401, 'Invalid or expired PIN');
  }

  const authData = await db.getDocument<any>('auth', email);
  if (authData && !authData.hasAccount) {
    await db.updateDocument('auth', email, { hasAccount: true });
  }

  const session = await authService.createSession(email);

  return success(
    {
      success: true,
      session: {
        username: session.username,
        fullName: session.fullName,
        expiresAt: session.expiresAt,
      },
    },
    {
      cookies: [authCookie(session.token)],
    }
  );
}
