import type { Express } from 'express';

type HeadersRecord = Record<string, string | string[]>;

type Handler = (req: any, res: any, next: (err?: any) => void) => any;

interface ResponseState {
  statusCode: number;
  body: any;
  headers: HeadersRecord;
  finished: boolean;
}

interface ResponseData<T = any> {
  status: number;
  body: T;
  headers: HeadersRecord;
}

function matchPath(routePath: string, actualPath: string) {
  const routeSegments = routePath.split('/').filter(Boolean);
  const actualSegments = actualPath.split('/').filter(Boolean);
  if (routeSegments.length !== actualSegments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < routeSegments.length; i += 1) {
    const routeSegment = routeSegments[i];
    const value = actualSegments[i];
    if (routeSegment.startsWith(':')) {
      params[routeSegment.slice(1)] = decodeURIComponent(value);
    } else if (routeSegment !== value) {
      return null;
    }
  }
  return params;
}

function findRoute(app: Express, method: string, path: string) {
  const stack = (app as any)._router?.stack ?? [];
  for (const layer of stack) {
    if (!layer.route) continue;
    const route = layer.route;
    if (!route.methods?.[method.toLowerCase()]) continue;
    const routePath = route.path;
    if (typeof routePath !== 'string') continue;
    const params = matchPath(routePath, path);
    if (params) {
      return { route, params };
    }
  }
  throw new Error(`Route not found: [${method}] ${path}`);
}

function createMockResponse(state: ResponseState) {
  const setCookies: string[] = [];

  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(payload: any) {
      state.body = payload;
      state.finished = true;
      if (!state.headers['content-type']) {
        state.headers['content-type'] = 'application/json; charset=utf-8';
      }
      return res;
    },
    cookie(name: string, value: any, options: Record<string, any> = {}) {
      const parts = [`${name}=${value}`];
      if (options.maxAge !== undefined) {
        parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
      }
      if (options.httpOnly) parts.push('HttpOnly');
      if (options.secure) parts.push('Secure');
      if (options.sameSite) {
        const sameSite = typeof options.sameSite === 'string' ? options.sameSite : options.sameSite === true ? 'Strict' : 'Lax';
        parts.push(`SameSite=${sameSite}`);
      }
      parts.push(`Path=${options.path ?? '/'}`);
      setCookies.push(parts.join('; '));
      state.headers['set-cookie'] = [...setCookies];
      return res;
    },
    clearCookie(name: string) {
      const expires = new Date(0).toUTCString();
      setCookies.push(`${name}=; Expires=${expires}`);
      state.headers['set-cookie'] = [...setCookies];
      return res;
    },
    set(header: string, value: string) {
      state.headers[header.toLowerCase()] = value;
      return res;
    },
  };

  return res;
}

async function runStack(stack: Array<{ handle: Handler }>, req: any, res: any, state: ResponseState) {
  for (const layer of stack) {
    if (state.finished) break;
    const handler = layer.handle;
    await new Promise<void>((resolve, reject) => {
      let nextCalled = false;
      const next = (err?: any) => {
        if (nextCalled) return;
        nextCalled = true;
        if (err) reject(err);
        else resolve();
      };

      try {
        const returned = handler(req, res, next);
        const isMiddleware = handler.length >= 3;
        if (returned && typeof returned.then === 'function') {
          returned
            .then(() => {
              if (!isMiddleware && !nextCalled) {
                resolve();
              } else if (isMiddleware && state.finished && !nextCalled) {
                resolve();
              }
            })
            .catch(reject);
        } else if (!isMiddleware) {
          resolve();
        } else if (isMiddleware && state.finished && !nextCalled) {
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}

async function executeRequest<T>(app: Express, method: string, path: string, options: {
  body?: any;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}) {
  const { route, params } = findRoute(app, method, path);
  const state: ResponseState = {
    statusCode: 200,
    body: undefined,
    headers: {},
    finished: false,
  };

  const req = {
    method,
    url: path,
    path,
    params,
    query: {},
    body: options.body ?? {},
    cookies: options.cookies ?? {},
    headers: options.headers ?? {},
    app,
  };

  const res = createMockResponse(state);
  await runStack(route.stack, req, res, state);

  return {
    status: state.statusCode,
    body: state.body as T,
    headers: state.headers,
    req,
    res,
    state,
  };
}

export class TestAgent {
  private cookieJar = new Map<string, string>();

  constructor(private readonly app: Express) {}

  async request<T>(method: string, path: string, body?: any) {
    const cookieHeader = this.serializeCookies();
    const cookiesObject = Object.fromEntries(this.cookieJar.entries());
    const response = await executeRequest<T>(this.app, method, path, {
      body,
      cookies: cookiesObject,
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });

    this.updateCookies(response.headers['set-cookie']);

    return {
      status: response.status,
      body: response.body,
      headers: response.headers,
    } as ResponseData<T>;
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: any) {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: any) {
    return this.request<T>('PUT', path, body);
  }

  delete<T>(path: string, body?: any) {
    return this.request<T>('DELETE', path, body);
  }

  private serializeCookies() {
    const entries = Array.from(this.cookieJar.entries()).filter(([, value]) => value !== '');
    return entries.length ? entries.map(([key, value]) => `${key}=${value}`).join('; ') : '';
  }

  private updateCookies(header: string | string[] | undefined) {
    if (!header) return;
    const cookies = Array.isArray(header) ? header : [header];
    for (const cookie of cookies) {
      const [pair] = cookie.split(';');
      const [name, value] = pair.split('=');
      if (!name) continue;
      if (value === undefined || value === '') {
        this.cookieJar.delete(name.trim());
      } else {
        this.cookieJar.set(name.trim(), value);
      }
    }
  }
}

export function createAgent(app: Express) {
  return new TestAgent(app);
}

export type { ResponseData };
