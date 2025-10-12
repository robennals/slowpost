import { ApiError, success, type HandlerContext, type RequestLike } from '../types';
import { authCookie } from './utils';
import { getHandlerDeps } from '../context';

export async function signupHandler(
  _req: RequestLike,
  { body }: HandlerContext<{ email?: string; username?: string; fullName?: string; pin?: string }>
) {
  const { authService } = getHandlerDeps();
  const { email, username, fullName, pin } = body ?? {};
  if (!email || !username || !fullName || !pin) {
    throw new ApiError(400, 'All fields are required');
  }

  const valid = await authService.verifyPin(email, pin);
  if (!valid) {
    throw new ApiError(401, 'Invalid or expired PIN');
  }

  await authService.createUser(email, username, fullName);
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
