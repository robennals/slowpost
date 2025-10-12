import { ApiError, success, type HandlerContext, type RequestLike } from '../types';
import { isSkipPinMode } from './utils';
import { getHandlerDeps } from '../context';

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

export async function requestPinHandler(
  req: RequestLike,
  { body }: HandlerContext<{ email?: string }>
) {
  const email = body?.email;
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const { authService, mailer } = getHandlerDeps();
  const { pin, requiresSignup } = await authService.requestPin(email);

  const hostHeader = headerValue(req.headers, 'host') ?? headerValue(req.headers, 'x-forwarded-host');
  const forwardedFor = headerValue(req.headers, 'x-forwarded-for');
  const isLocalRequest = isLocalHost(hostHeader) || isLocalForwarded(forwardedFor);
  const shouldExposePin = isSkipPinMode() || isLocalRequest || !mailer;

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
    return success({ success: true, requiresSignup, pin });
  }

  try {
    await mailer.sendPinEmail(email, pin);
  } catch (error: any) {
    console.error('Failed to send PIN email', error);
    throw new ApiError(500, 'Failed to deliver PIN email');
  }

  return success({ success: true, requiresSignup });
}
