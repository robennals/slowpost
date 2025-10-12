import { MockDbAdapter } from './mockDbAdapter.js';
import { AuthService } from '../../src/auth/auth.js';
import type { Handler, HandlerContext, HandlerDeps, Mailer, RequestLike } from '../../src/api/types.js';
import { setHandlerDeps } from '../../src/api/context.js';

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

  const ctx: HandlerContext<TBody, TParams> = {
    body: {} as TBody,
    params: {} as TParams,
    query: {},
    cookies: {},
    user: undefined,
    ...overrides,
    params: overrides.params ?? ({} as TParams),
    body: overrides.body ?? ({} as TBody),
    query: overrides.query ?? {},
    cookies: overrides.cookies ?? {},
  };

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
