import type { Handler, HandlerContext, HandlerDeps, HandlerResult, RequestLike } from './types';
import { ApiError } from './types';
import { initialiseHandlerDeps } from './deps';

function parseCookieHeader(header: string | string[] | undefined): Record<string, string> {
  if (!header) return {};
  const value = Array.isArray(header) ? header.join(';') : header;
  return value.split(';').reduce<Record<string, string>>((acc, part) => {
    const [name, ...rest] = part.trim().split('=');
    if (!name) return acc;
    acc[name] = rest.join('=');
    return acc;
  }, {});
}

export interface ExecuteHandlerOptions<
  TBody = any,
  TParams extends Record<string, string> = Record<string, string>,
  TQuery extends Record<string, unknown> = Record<string, string | string[] | undefined>
> {
  method: string;
  url: string;
  headers?: RequestLike['headers'];
  body?: TBody;
  cookies?: Record<string, string>;
  params?: TParams;
  query?: TQuery;
  requireAuth?: boolean;
  overrides?: HandlerDeps;
}

export async function executeHandler<
  TBody,
  TParams extends Record<string, string>,
  TQuery extends Record<string, unknown>
>(
  handler: Handler<TBody, TParams, TQuery>,
  options: ExecuteHandlerOptions<TBody, TParams, TQuery>
): Promise<HandlerResult> {
  const deps = await initialiseHandlerDeps(options.overrides);

  const headers = options.headers ?? {};
  const cookies = options.cookies ?? parseCookieHeader(headers?.cookie);

  const token = cookies['auth_token'];
  const user = token ? await deps.authService.verifySession(token) : null;

  if (options.requireAuth && !user) {
    throw new ApiError(401, 'Not authenticated');
  }

  const requestLike: RequestLike = {
    method: options.method,
    url: options.url,
    headers,
    body: options.body,
    cookies,
  };

  const context: HandlerContext<TBody, TParams, TQuery> = {
    body: (options.body ?? {}) as TBody,
    params: (options.params ?? ({} as TParams)) as TParams,
    query: (options.query ?? ({} as TQuery)) as TQuery,
    cookies,
    user,
  };

  return handler(requestLike, context);
}
