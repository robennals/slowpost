import { ApiError, success, type HandlerContext, type RequestLike } from '../types.js';
import { isSkipPinMode } from './utils.js';
import { getHandlerDeps } from '../context.js';

export async function requestPinHandler(
  _req: RequestLike,
  { body }: HandlerContext<{ email?: string }>
) {
  const email = body?.email;
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const { authService, mailer } = getHandlerDeps();
  const { pin, requiresSignup } = await authService.requestPin(email);

  if (isSkipPinMode()) {
    console.log(`PIN for ${email}: ${pin}`);
    return success({ success: true, requiresSignup, pin });
  }

  if (!mailer) {
    console.warn(
      'PIN email requested but no mailer configured. Set POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL to enable email delivery.'
    );
  } else {
    try {
      await mailer.sendPinEmail(email, pin);
    } catch (error: any) {
      console.error('Failed to send PIN email', error);
      throw new ApiError(500, 'Failed to deliver PIN email');
    }
  }

  return success({ success: true, requiresSignup });
}
