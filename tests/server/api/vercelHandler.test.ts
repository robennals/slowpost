import { describe, it, expect, beforeEach } from 'vitest';
import { executeHandler } from '../../../src/server/api/runHandler';
import { requestPinHandler } from '../../../src/app/api/auth/request-pin/handler';
import { currentUserHandler } from '../../../src/app/api/auth/me/handler';
import { MockDbAdapter } from '../helpers/mockDbAdapter';
import { AuthService } from '../../../src/server/auth/auth';
import type { HandlerDeps } from '../../../src/server/api/types';
import { ApiError } from '../../../src/server/api/types';

process.env.SKIP_PIN = 'true';

function createDeps(): HandlerDeps {
  const db = new MockDbAdapter();
  const authService = new AuthService(db, true);
  return { db, authService };
}

describe('executeHandler', () => {
  let deps: HandlerDeps;

  beforeEach(() => {
    deps = createDeps();
  });

  it('routes anonymous request to request-pin handler', async () => {
    const result = await executeHandler(requestPinHandler, {
      method: 'POST',
      url: 'http://localhost/api/auth/request-pin',
      headers: {},
      body: { email: 'vercel@example.com' },
      overrides: deps,
    });

    expect(result.status).toBe(200);
    expect((result.body as any).success).toBe(true);
  });

  it('enforces authentication for protected handlers', async () => {
    const promise = executeHandler(currentUserHandler, {
      method: 'GET',
      url: 'http://localhost/api/auth/me',
      headers: {},
      requireAuth: true,
      overrides: deps,
    });

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 401 });
  });
});
