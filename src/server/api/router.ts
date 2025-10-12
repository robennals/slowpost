import { parse as parseUrl } from 'url';
import { routes, type RouteDefinition } from './routes';
import { createDbAdapter } from '../db/types';
import { AuthService } from '../auth/auth';
import { createPostmarkMailerFromEnv } from '../mailer/postmarkMailer';
import type { HandlerContext, HandlerDeps, HandlerResult, RequestLike } from './types';
import { setHandlerDeps, getHandlerDeps } from './context';
import { ApiError } from './types';
import { isSkipPinMode } from './handlers/utils';

export interface ApiRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[]>;
  body?: unknown;
  cookies?: Record<string, string>;
}

interface MatchedRoute {
  route: RouteDefinition;
  params: Record<string, string>;
}

function matchPath(routePath: string, actualPath: string): Record<string, string> | null {
  const routeSegments = routePath.split('/').filter(Boolean);
  const actualSegments = actualPath.split('/').filter(Boolean);
  if (routeSegments.length !== actualSegments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < routeSegments.length; i += 1) {
    const routeSegment = routeSegments[i];
    const actualSegment = actualSegments[i];
    if (routeSegment.startsWith(':')) {
      params[routeSegment.slice(1)] = decodeURIComponent(actualSegment);
    } else if (routeSegment !== actualSegment) {
      return null;
    }
  }
  return params;
}

function findRoute(method: string, pathname: string): MatchedRoute | null {
  for (const route of routes) {
    if (route.method !== method.toUpperCase()) continue;
    const match = matchPath(route.path, pathname);
    if (match) {
      return { route, params: match };
    }
  }
  return null;
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  header.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (!name) return;
    cookies[name] = rest.join('=');
  });
  return cookies;
}

function extractQuery(search: string | null): Record<string, string | string[]> {
  if (!search) return {};
  const params = new URLSearchParams(search);
  const query: Record<string, string | string[]> = {};
  params.forEach((value, key) => {
    if (query[key]) {
      const existing = query[key];
      query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      query[key] = value;
    }
  });
  return query;
}

let depsPromise: Promise<HandlerDeps> | null = null;

async function ensureDeps(): Promise<HandlerDeps> {
  try {
    return getHandlerDeps();
  } catch (error) {
    if (!depsPromise) {
      depsPromise = (async () => {
        const db = await createDbAdapter();
        const authService = new AuthService(db, isSkipPinMode());
        const mailer = createPostmarkMailerFromEnv();
        const deps = { db, authService, mailer } satisfies HandlerDeps;
        setHandlerDeps(deps);
        return deps;
      })();
    }
    return depsPromise;
  }
}

export async function initialiseDeps(overrides?: HandlerDeps): Promise<HandlerDeps> {
  if (overrides) {
    setHandlerDeps(overrides);
    return overrides;
  }
  return ensureDeps();
}

export async function handleApiRequest(req: ApiRequest, overrides?: HandlerDeps): Promise<HandlerResult> {
  const deps = await initialiseDeps(overrides);
  const method = req.method?.toUpperCase() ?? 'GET';
  const parsedUrl = parseUrl(req.url ?? '/', true);
  const pathname = parsedUrl.pathname ?? '/';
  const match = findRoute(method, pathname);

  if (!match) {
    throw new ApiError(404, 'Not found');
  }

  const cookieHeader = typeof req.headers?.cookie === 'string' ? req.headers.cookie : undefined;
  const cookies = req.cookies ?? parseCookies(cookieHeader);
  const token = cookies['auth_token'];
  const user = token ? await deps.authService.verifySession(token) : null;

  if (match.route.requireAuth && !user) {
    throw new ApiError(401, 'Not authenticated');
  }

  const requestLike: RequestLike = {
    method: req.method,
    url: req.url,
    headers: req.headers ?? {},
    body: req.body,
    cookies,
  };

  const result = await match.route.handler(requestLike, {
    body: (req.body ?? {}) as HandlerContext['body'],
    params: match.params as HandlerContext['params'],
    query: extractQuery(parsedUrl.search),
    cookies,
    user,
  } as HandlerContext);

  return result;
}
