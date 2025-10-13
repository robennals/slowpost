import { NextRequest, NextResponse } from 'next/server';
import type { Handler } from './types';
import { ApiError, type CookieAction } from './types';
import { executeHandler } from './runHandler';

export const runtime = 'nodejs';

type RouteParams = Record<string, string | string[]>;

type RouteContext = { params: RouteParams };

type RouteOptions = {
  requireAuth?: boolean;
};

function normaliseParams(params: RouteParams): Record<string, string> {
  return Object.entries(params ?? {}).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = Array.isArray(value) ? value[0] ?? '' : value ?? '';
    return acc;
  }, {});
}

function buildQuery(searchParams: URLSearchParams): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  searchParams.forEach((value, key) => {
    if (query[key]) {
      const existing = query[key];
      query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      query[key] = value;
    }
  });
  return query;
}

async function parseBody(request: NextRequest): Promise<unknown> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return await request.json();
    } catch (error) {
      console.error('Failed to parse JSON body', error);
      throw new ApiError(400, 'Invalid JSON payload');
    }
  }

  return undefined;
}

function applyCookies(actions: CookieAction[] | undefined, response: NextResponse) {
  if (!actions) return;
  for (const action of actions) {
    if (action.type === 'set') {
      const options = action.options ?? {};
      response.cookies.set({
        name: action.name,
        value: action.value,
        httpOnly: options.httpOnly,
        secure: options.secure,
        sameSite: options.sameSite,
        maxAge: options.maxAge !== undefined ? Math.floor(options.maxAge / 1000) : undefined,
        path: options.path ?? '/',
      });
    } else {
      const options = action.options ?? {};
      response.cookies.set({
        name: action.name,
        value: '',
        maxAge: 0,
        path: options.path ?? '/',
      });
    }
  }
}

export function createRouteHandler<
  TBody = any,
  TParams extends Record<string, string> = Record<string, string>,
  TQuery extends Record<string, unknown> = Record<string, string | string[] | undefined>
>(
  handler: Handler<TBody, TParams, TQuery>,
  options: RouteOptions = {}
) {
  return async function route(request: NextRequest, context: RouteContext) {
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    try {
      const body = (await parseBody(request)) as TBody | undefined;
      const cookies = Object.fromEntries(request.cookies.getAll().map((cookie) => [cookie.name, cookie.value]));
      const params = normaliseParams(context.params ?? {}) as TParams;
      const query = buildQuery(request.nextUrl.searchParams) as TQuery;

      const result = await executeHandler<TBody, TParams, TQuery>(handler, {
        method: request.method,
        url: request.url,
        headers,
        body,
        cookies,
        params,
        query,
        requireAuth: options.requireAuth,
      });

      const response = NextResponse.json(result.body, {
        status: result.status,
      });

      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }

      applyCookies(result.cookies, response);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error('API handler error', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
