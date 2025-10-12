import { parse as parseUrl } from 'url';
import { routes, type RouteDefinition } from './routes.js';
import { createDbAdapter } from '../db/types.js';
import { AuthService } from '../auth/auth.js';
import { createPostmarkMailerFromEnv } from '../mailer/postmarkMailer.js';
import type { HandlerContext, HandlerDeps, RequestLike } from './types.js';
import { setHandlerDeps, getHandlerDeps } from './context.js';

interface VercelLikeRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[]>;
  body?: any;
}

interface VercelLikeResponse {
  status(code: number): this;
  setHeader(name: string, value: string | string[]): this;
  json(payload: any): void;
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

function findRoute(method: string, pathname: string): { route: RouteDefinition; params: Record<string, string> } | null {
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

export async function createVercelDeps(): Promise<HandlerDeps> {
  const db = await createDbAdapter();
  const authService = new AuthService(db, process.env.SKIP_PIN === 'true');
  const mailer = createPostmarkMailerFromEnv();
  const deps = { db, authService, mailer };
  setHandlerDeps(deps);
  return deps;
}

export async function handleVercelRequest(req: VercelLikeRequest, res: VercelLikeResponse, deps?: HandlerDeps) {
  if (deps) {
    setHandlerDeps(deps);
  }

  const method = req.method?.toUpperCase() ?? 'GET';
  const parsedUrl = parseUrl(req.url ?? '/', true);
  const pathname = parsedUrl.pathname ?? '/';
  const match = findRoute(method, pathname);

  if (!match) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const cookies = parseCookies(typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined);
  const { authService } = getHandlerDeps();
  const token = cookies['auth_token'];
  const user = token ? await authService.verifySession(token) : null;

  if (match.route.requireAuth && !user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const requestLike: RequestLike = { ...req, headers: req.headers, cookies };
    const result = await match.route.handler(requestLike, {
      body: req.body ?? {},
      params: match.params,
      query: extractQuery(parsedUrl.search),
      cookies,
      user,
    } as HandlerContext);

    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value);
      }
    }

    if (result.cookies) {
      const serialized = result.cookies
        .map((action) => {
          if (action.type === 'set') {
            const parts = [`${action.name}=${action.value}`];
            const options = action.options ?? {};
            if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
            if (options.httpOnly) parts.push('HttpOnly');
            if (options.secure) parts.push('Secure');
            if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
            parts.push(`Path=${options.path ?? '/'}`);
            return parts.join('; ');
          }
          return `${action.name}=; Expires=${new Date(0).toUTCString()}; Path=${action.options?.path ?? '/'}`;
        })
        .join(', ');
      if (serialized) {
        res.setHeader('Set-Cookie', serialized);
      }
    }

    res.status(result.status).json(result.body);
  } catch (error: any) {
    const status = error?.status ?? 500;
    const message = error?.message ?? 'Internal server error';
    res.status(status).json({ error: message });
  }
}
