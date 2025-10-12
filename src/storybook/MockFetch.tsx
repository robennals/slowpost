import React, { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export type FetchHandler = (input: RequestInfo, init?: RequestInit) => Promise<Response> | Response;

export function createJsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function getPathname(input: RequestInfo) {
  const url = typeof input === 'string' ? input : input.url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return new URL(url).pathname;
  }
  return url;
}

export function MockFetch({ handler, children }: { handler: FetchHandler; children: ReactNode }) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const originalFetchRef = useRef<typeof globalThis.fetch>();

  if (!originalFetchRef.current) {
    originalFetchRef.current = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo, init?: RequestInit) => handlerRef.current(input, init)) as typeof globalThis.fetch;
  }

  useEffect(() => {
    return () => {
      if (originalFetchRef.current) {
        globalThis.fetch = originalFetchRef.current;
        originalFetchRef.current = undefined;
      }
    };
  }, []);

  return <>{children}</>;
}
