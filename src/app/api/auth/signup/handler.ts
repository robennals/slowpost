import { ApiError, success, type Handler } from '@/server/api/types';
import { authCookie } from '@/server/api/utils';
import { getHandlerDeps } from '@/server/api/context';

export const signupHandler: Handler<{
  email?: string;
  username?: string;
  fullName?: string;
  pin?: string;
}> = async (_req, { body }) => {
  const { authService } = getHandlerDeps();
  const { email, username, fullName, pin } = body ?? {};
  if (!email || !username || !fullName || !pin) {
    throw new ApiError(400, 'All fields are required');
  }

  const valid = await authService.verifyPin(email, pin);
  if (!valid) {
    throw new ApiError(401, 'Invalid or expired PIN');
  }

  try {
    await authService.createUser(email, username, fullName);
  } catch (error: any) {
    if (error.message === 'Username already taken') {
      throw new ApiError(409, 'This username is already taken. Please choose a different username.');
    }
    if (error.message === 'User already exists') {
      throw new ApiError(409, 'An account with this email already exists.');
    }
    throw error;
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
      cookies: authCookie(session.token),
    }
  );
};
