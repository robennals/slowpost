import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createMemoryStore } from '@slowpost/data';

type TestServer = {
  baseUrl: string;
  close(): Promise<void>;
};

async function startServer(nodeEnv: string): Promise<TestServer> {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  vi.resetModules();
  const { createServer } = await import('../src/server.js');
  const app = createServer(createMemoryStore());

  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      process.env.NODE_ENV = originalNodeEnv;
      vi.resetModules();
    }
  };
}

describe('POST /api/login/dev-skip', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('allows skipping the PIN locally even when NODE_ENV=production', async () => {
    const server = await startServer('production');
    try {
      const response = await fetch(`${server.baseUrl}/api/login/dev-skip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000'
        },
        body: JSON.stringify({ email: 'new-dev@slowpost.org' })
      });

      expect(response.status).toBe(200);
      const payload = (await response.json()) as { username?: string };
      expect(payload.username).toBe('new-dev');
    } finally {
      await server.close();
    }
  });

  test('reuses existing login sessions when skipping the PIN', async () => {
    const server = await startServer('production');
    try {
      const email = 'grace@example.com';
      const firstResponse = await fetch(`${server.baseUrl}/api/login/dev-skip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000'
        },
        body: JSON.stringify({ email })
      });

      expect(firstResponse.status).toBe(200);
      const firstPayload = (await firstResponse.json()) as { username?: string };
      expect(firstPayload.username).toBe('grace');

      const secondResponse = await fetch(`${server.baseUrl}/api/login/dev-skip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000'
        },
        body: JSON.stringify({ email })
      });

      expect(secondResponse.status).toBe(200);
      const secondPayload = (await secondResponse.json()) as { username?: string };
      expect(secondPayload.username).toBe('grace');
    } finally {
      await server.close();
    }
  });
});
