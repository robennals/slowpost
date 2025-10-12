import { NextRequest, NextResponse } from 'next/server';
import { handleApiRequest } from '@/server/api/router';
import { ApiError } from '@/server/api/types';
import type { CookieAction } from '@/server/api/types';

export const runtime = 'nodejs';

type RouteContext = { params: { slug?: string[] } };

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

function buildPath(slug?: string[]): string {
  const segments = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const joined = segments.filter(Boolean).join('/');
  return `/api${joined ? `/${joined}` : ''}`;
}

function normaliseCookies(actions: CookieAction[] | undefined, response: NextResponse) {
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

async function parseBody(request: NextRequest) {
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

async function handle(request: NextRequest, context: RouteContext) {
  const method = request.method.toUpperCase() as HttpMethod;
  const path = buildPath(context.params.slug);
  const url = `${path}${request.nextUrl.search}`;
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const cookies = Object.fromEntries(request.cookies.getAll().map((cookie) => [cookie.name, cookie.value]));
  const body = await parseBody(request);

  try {
    const result = await handleApiRequest(
      {
        method,
        url,
        headers,
        body,
        cookies,
      },
    );

    const response = NextResponse.json(result.body, {
      status: result.status,
      headers: result.headers,
    });
    normaliseCookies(result.cookies, response);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API handler error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = (request: NextRequest, context: RouteContext) => handle(request, context);
export const POST = (request: NextRequest, context: RouteContext) => handle(request, context);
export const PUT = (request: NextRequest, context: RouteContext) => handle(request, context);
export const DELETE = (request: NextRequest, context: RouteContext) => handle(request, context);
