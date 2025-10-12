import { describe, it, expect, beforeEach } from 'vitest';
import { handleVercelRequest } from '../../src/api/vercel.js';
import { MockDbAdapter } from '../helpers/mockDbAdapter.js';
import { AuthService } from '../../src/auth/auth.js';
import type { HandlerDeps } from '../../src/api/types.js';

process.env.SKIP_PIN = 'true';

function createDeps(): HandlerDeps {
  const db = new MockDbAdapter();
  const authService = new AuthService(db, true);
  return { db, authService };
}

function createResponseCollector() {
  const headers: Record<string, string | string[]> = {};
  let statusCode = 200;
  let body: any = null;
  return {
    res: {
      status(code: number) {
        statusCode = code;
        return this;
      },
      setHeader(name: string, value: string | string[]) {
        headers[name.toLowerCase()] = value;
        return this;
      },
      json(payload: any) {
        body = payload;
      },
    },
    get status() {
      return statusCode;
    },
    get body() {
      return body;
    },
    get headers() {
      return headers;
    },
  };
}

describe('handleVercelRequest', () => {
  let deps: HandlerDeps;

  beforeEach(() => {
    deps = createDeps();
  });

  it('routes anonymous request to request-pin handler', async () => {
    const collector = createResponseCollector();

    await handleVercelRequest(
      {
        method: 'POST',
        url: '/api/auth/request-pin',
        headers: {},
        body: { email: 'vercel@example.com' },
      },
      collector.res,
      deps
    );

    expect(collector.status).toBe(200);
    expect(collector.body.success).toBe(true);
  });

  it('enforces authentication for protected routes', async () => {
    const collector = createResponseCollector();

    await handleVercelRequest(
      {
        method: 'GET',
        url: '/api/auth/me',
        headers: {},
      },
      collector.res,
      deps
    );

    expect(collector.status).toBe(401);
  });
});
