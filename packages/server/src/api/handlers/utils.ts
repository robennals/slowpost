import type { CookieAction } from '../types.js';

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isSkipPinMode(): boolean {
  return process.env.SKIP_PIN === 'true';
}

export function authCookie(token: string): CookieAction {
  return {
    type: 'set',
    name: 'auth_token',
    value: token,
    options: {
      httpOnly: true,
      secure: isProduction(),
      sameSite: 'lax',
      maxAge: THIRTY_DAYS_MS,
      path: '/',
    },
  };
}

export const CLEAR_AUTH_COOKIE: CookieAction = {
  type: 'clear',
  name: 'auth_token',
  options: {
    path: '/',
  },
};
