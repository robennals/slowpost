import { MockDbAdapter } from './mockDbAdapter';
import { AuthService } from '../../../src/server/auth/auth';
import type { Handler, HandlerContext, HandlerDeps, Mailer, RequestLike } from '../../../src/server/api/types';
import { setHandlerDeps } from '../../../src/server/api/context';

export interface TestDeps extends HandlerDeps {
  db: MockDbAdapter;
  authService: AuthService;
}

export function createTestDeps(options: { skipPin?: boolean; mailer?: Mailer } = {}): TestDeps {
  const db = new MockDbAdapter();
  const authService = new AuthService(db, options.skipPin ?? true);
  const deps: TestDeps = { db, authService, mailer: options.mailer };
  setHandlerDeps(deps);
  return deps;
}

export async function executeHandler<TBody, TParams extends Record<string, string>>(
  handler: Handler<TBody, TParams>,
  overrides: Partial<HandlerContext<TBody, TParams>> & { request?: RequestLike } = {}
) {
  const request: RequestLike = overrides.request ?? {
    method: 'TEST',
    headers: {},
  };

  const baseCtx: HandlerContext<TBody, TParams> = {
    body: {} as TBody,
    params: {} as TParams,
    query: {},
    cookies: {},
    user: undefined,
  };

  const ctx = {
    ...baseCtx,
    ...overrides,
  } as HandlerContext<TBody, TParams>;

  ctx.params = overrides.params ?? baseCtx.params;
  ctx.body = overrides.body ?? baseCtx.body;
  ctx.query = overrides.query ?? baseCtx.query;
  ctx.cookies = overrides.cookies ?? baseCtx.cookies;

  request.cookies = ctx.cookies;

  return handler(request, ctx);
}

export function fakeSession(username: string, fullName = username): {
  username: string;
  fullName: string;
  token: string;
  expiresAt: string;
} {
  return {
    username,
    fullName,
    token: `token-${username}`,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function createUserWithProfile(
  deps: TestDeps,
  email: string,
  username: string,
  fullName: string
) {
  await deps.authService.createUser(email, username, fullName);
}
