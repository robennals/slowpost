import { ApiError, success, type Handler, type RequestLike } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';
import { isSkipPinMode } from '@/server/api/utils';

function headerValue(headers: RequestLike['headers'], name: string): string | undefined {
  if (!headers) return undefined;
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  if (!entry) return undefined;
  const value = entry[1];
  return Array.isArray(value) ? value[0] : value;
}

function isLocalHost(host: string | undefined): boolean {
  if (!host) return false;
  const cleaned = host.replace(/^\[/, '').replace(/\]$/, '');
  const hostname = cleaned.split(':')[0]?.toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isLocalForwarded(forwarded: string | undefined): boolean {
  if (!forwarded) return false;
  return forwarded
    .split(',')
    .map((part) => part.trim())
    .some((part) => part === '127.0.0.1' || part === '::1' || part === 'localhost');
}

export const requestPinHandler: Handler<{ email?: string }> = async (req, { body }) => {
  const email = body?.email;
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  console.log(`[requestPinHandler] PIN requested for ${email}`);
  const { authService, mailer } = getHandlerDeps();
  const { pin, requiresSignup } = await authService.requestPin(email);

  const hostHeader = headerValue(req.headers, 'host') ?? headerValue(req.headers, 'x-forwarded-host');
  const forwardedFor = headerValue(req.headers, 'x-forwarded-for');
  const isLocalRequest = isLocalHost(hostHeader) || isLocalForwarded(forwardedFor);
  const shouldExposePin = isSkipPinMode() || isLocalRequest || !mailer;

  console.log(`[requestPinHandler] Environment check:`, {
    hasMailer: !!mailer,
    isSkipPinMode: isSkipPinMode(),
    isLocalRequest,
    shouldExposePin,
  });

  if (shouldExposePin) {
    console.log(`PIN for ${email}: ${pin}`);
  }

  if (!mailer) {
    console.warn(
      'PIN email requested but no mailer configured. Set POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL to enable email delivery.'
    );
    return success({ success: true, requiresSignup, pin });
  }

  if (isSkipPinMode() || isLocalRequest) {
    console.log(`[requestPinHandler] Skipping email send (dev mode or local request)`);
    return success({ success: true, requiresSignup, pin });
  }

  console.log(`[requestPinHandler] Attempting to send PIN email via mailer to ${email}`);
  try {
    await mailer.sendPinEmail(email, pin);
    console.log(`[requestPinHandler] PIN email send completed successfully for ${email}`);
  } catch (error: any) {
    console.error('[requestPinHandler] Failed to send PIN email', {
      email,
      error: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
    });
    throw new ApiError(500, 'Failed to deliver PIN email');
  }

  return success({ success: true, requiresSignup });
};
