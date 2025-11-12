import type { AuthService, AuthSession } from '../auth/auth';
import type { DbAdapter } from '../db/types';

export interface Mailer {
  sendPinEmail(to: string, pin: string): Promise<void>;
  sendNewSubscriberNotification(to: string, subscriberUsername: string, subscriberFullName: string): Promise<void>;
  sendGroupJoinRequestNotification(to: string, requesterUsername: string, requesterFullName: string, groupName: string, groupDisplayName: string): Promise<void>;
  sendAnnualLetterReminder(to: string, fullName: string, username: string, subscriberCount: number, expectedMonth: string): Promise<void>;
  sendAnnualLetterFollowUp(to: string, fullName: string, username: string, subscriberCount: number, expectedMonth: string): Promise<void>;
}

export interface RequestLike {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  cookies?: Record<string, string>;
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}

export type CookieAction =
  | { type: 'set'; name: string; value: string; options?: CookieOptions }
  | { type: 'clear'; name: string; options?: CookieOptions };

export interface HandlerResult<T = any> {
  status: number;
  body: T;
  headers?: Record<string, string>;
  cookies?: CookieAction[];
}

export interface HandlerDeps {
  db: DbAdapter;
  authService: AuthService;
  mailer?: Mailer;
}

export interface HandlerContext<
  TBody = unknown,
  TParams extends Record<string, string> = Record<string, string>,
  TQuery extends Record<string, unknown> = Record<string, string | string[] | undefined>
> {
  body: TBody;
  params: TParams;
  query: TQuery;
  cookies: Record<string, string>;
  user?: AuthSession | null;
}

export type Handler<
  TBody = any,
  TParams extends Record<string, string> = Record<string, string>,
  TQuery extends Record<string, unknown> = Record<string, string | string[] | undefined>
> = (
  req: RequestLike,
  ctx: HandlerContext<TBody, TParams, TQuery>
) => Promise<HandlerResult>;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function success<T>(body: T, init?: Partial<Omit<HandlerResult<T>, 'body' | 'status'>>): HandlerResult<T> {
  return {
    status: 200,
    body,
    headers: init?.headers,
    cookies: init?.cookies,
  };
}

export function noContent(init?: Partial<Omit<HandlerResult<{}>, 'body' | 'status'>>): HandlerResult {
  return {
    status: 204,
    body: {},
    headers: init?.headers,
    cookies: init?.cookies,
  };
}

export function ensure(condition: unknown, status: number, message: string): void {
  if (!condition) {
    throw new ApiError(status, message);
  }
}

export function requireUser(ctx: HandlerContext): AuthSession {
  if (!ctx.user) {
    throw new ApiError(401, 'Not authenticated');
  }
  return ctx.user;
}
