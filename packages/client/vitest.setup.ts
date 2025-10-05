import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

afterEach(() => {
  cleanup();
});

vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
      ({ href, children, ...rest }, ref) =>
        React.createElement('a', { ref, href, ...rest }, children)
    )
  };
});

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init
  });

vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url.includes('/api/login/request')) {
    return jsonResponse({ message: 'PIN generated. Check the API server logs for the code.' });
  }

  if (url.includes('/api/login/verify')) {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    return jsonResponse({ username: body?.email ? body.email.split('@')[0] ?? 'user' : 'user' });
  }

  if (url.includes('/api/login/dev-skip')) {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    return jsonResponse({ username: body?.email ? body.email.split('@')[0] ?? 'user' : 'user' });
  }

  if (url.includes('/api/profile/') && url.endsWith('/photo')) {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    return jsonResponse({ photoUrl: body?.photoData ?? '' });
  }

  return jsonResponse({}, { status: 404 });
}));
