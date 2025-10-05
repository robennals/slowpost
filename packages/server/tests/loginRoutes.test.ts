import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { request as httpRequest } from 'node:http';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createMemoryStore } from '@slowpost/data';

type StartServerOptions = {
  trustProxy?: boolean;
};

type TestServer = {
  baseUrl: string;
  close(): Promise<void>;
};

async function startServer(nodeEnv: string, options: StartServerOptions = {}): Promise<TestServer> {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  vi.resetModules();
  const { createServer } = await import('../src/server.js');
  const app = createServer(createMemoryStore());

  if (options.trustProxy) {
    app.set('trust proxy', true);
  }

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

  test('allows skipping the PIN when proxied from an IPv6 localhost origin', async () => {
    const server = await startServer('production', { trustProxy: true });
    try {
      const url = new URL('/api/login/dev-skip', server.baseUrl);
      const payload = JSON.stringify({ email: 'ada@example.com' });

      const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const request = httpRequest(
          {
            hostname: url.hostname,
            port: url.port,
            method: 'POST',
            path: url.pathname,
            headers: {
              Host: 'api.slowpost.dev',
              Origin: 'http://[::1]:3000',
              'X-Forwarded-For': '203.0.113.5',
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload)
            }
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
              const body = Buffer.concat(chunks).toString('utf8');
              resolve({ status: res.statusCode ?? 0, body });
            });
          }
        );
        request.on('error', reject);
        request.write(payload);
        request.end();
      });

      expect(response.status).toBe(200);
      const payloadJson = JSON.parse(response.body) as { username?: string };
      expect(payloadJson.username).toBe('ada');
    } finally {
      await server.close();
    }
  });
});
