import { describe, it, expect, beforeEach } from 'vitest';
import { handleApiRequest } from '../../../src/server/api/router';
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

describe('handleApiRequest', () => {
  let deps: HandlerDeps;

  beforeEach(() => {
    deps = createDeps();
  });

  it('routes anonymous request to request-pin handler', async () => {
    const result = await handleApiRequest(
      {
        method: 'POST',
        url: '/api/auth/request-pin',
        headers: {},
        body: { email: 'vercel@example.com' },
      },
      deps,
    );

    expect(result.status).toBe(200);
    expect((result.body as any).success).toBe(true);
  });

  it('enforces authentication for protected routes', async () => {
    const promise = handleApiRequest(
      {
        method: 'GET',
        url: '/api/auth/me',
        headers: {},
      },
      deps,
    );

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 401 });
  });
});
