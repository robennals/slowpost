import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

type LoginState = {
  username: string;
  email: string;
} | null;

let loginState: LoginState = null;
const knownLoginEmails = new Set(['ada@example.com', 'grace@example.com']);

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method?.toUpperCase() ?? 'GET';

  if (url.endsWith('/api/login/request') && method === 'POST') {
    return new Response(JSON.stringify({ ok: true, message: 'PIN generated for testing.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.endsWith('/api/login/verify') && method === 'POST') {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    const email: string = body.email ?? 'user@example.com';
    const username: string = body.username ?? email.split('@')[0] ?? 'user';
    loginState = { email, username };
    return new Response(JSON.stringify({ username }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.endsWith('/api/login/dev-skip') && method === 'POST') {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    const email: string = body.email ?? 'dev@example.com';
    const requestedIntent = (body.intent as 'login' | 'signup' | undefined) ?? 'login';
    const normalizedEmail = email.toLowerCase();
    const username: string = email.split('@')[0] ?? 'dev';
    const intent: 'login' | 'signup' =
      requestedIntent === 'signup'
        ? 'signup'
        : knownLoginEmails.has(normalizedEmail)
        ? 'login'
        : 'signup';
    loginState = { email, username };
    return new Response(JSON.stringify({ username, intent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.endsWith('/api/signup/complete') && method === 'POST') {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    const email: string = body.email ?? 'user@example.com';
    const username: string = body.username ?? email.split('@')[0] ?? 'user';
    loginState = { email, username };
    knownLoginEmails.add(email.toLowerCase());
    return new Response(JSON.stringify({ username }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.endsWith('/api/login/session')) {
    return new Response(
      JSON.stringify(
        loginState
          ? { isLoggedIn: true, username: loginState.username }
          : { isLoggedIn: false }
      ),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response('Not Found', { status: 404 });
});

vi.stubGlobal('fetch', fetchMock);

afterEach(() => {
  cleanup();
  fetchMock.mockClear();
  loginState = null;
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
