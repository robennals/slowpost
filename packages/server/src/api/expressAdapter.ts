import type { Request, Response } from 'express';
import { ApiError, type Handler } from './types.js';
import { getHandlerDeps } from './context.js';

export interface ExpressHandlerOptions {
  requireAuth?: boolean;
}

export function createExpressHandler<
  TBody = any,
  TParams extends Record<string, string> = Record<string, string>
>(handler: Handler<TBody, TParams>, options: ExpressHandlerOptions = {}) {
  return async (req: Request, res: Response) => {
    try {
      const { authService } = getHandlerDeps();
      const token = req.cookies?.auth_token;
      const user = token ? await authService.verifySession(token) : null;

      if (options.requireAuth && !user) {
        throw new ApiError(401, 'Not authenticated');
      }

      const result = await handler(req, {
        body: req.body,
        params: req.params as TParams,
        query: req.query,
        cookies: req.cookies ?? {},
        user,
      });

      if (result.headers) {
        for (const [key, value] of Object.entries(result.headers)) {
          res.setHeader(key, value);
        }
      }

      if (result.cookies) {
        for (const action of result.cookies) {
          if (action.type === 'set') {
            res.cookie(action.name, action.value, {
              httpOnly: action.options?.httpOnly,
              secure: action.options?.secure,
              sameSite: action.options?.sameSite,
              maxAge: action.options?.maxAge,
              path: action.options?.path ?? '/',
            });
          } else if (action.type === 'clear') {
            res.clearCookie(action.name, {
              path: action.options?.path ?? '/',
            });
          }
        }
      }

      res.status(result.status).json(result.body);
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.status).json({ error: error.message });
        return;
      }

      console.error('API handler error', error);
      res.status(500).json({ error: error?.message ?? 'Internal server error' });
    }
  };
}
