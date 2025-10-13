import { createDbAdapter } from '../db/types';
import { AuthService } from '../auth/auth';
import { createPostmarkMailerFromEnv } from '../mailer/postmarkMailer';
import type { HandlerDeps } from './types';
import { setHandlerDeps, getHandlerDeps } from './context';
import { isSkipPinMode } from './utils';

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

export async function initialiseHandlerDeps(overrides?: HandlerDeps): Promise<HandlerDeps> {
  if (overrides) {
    setHandlerDeps(overrides);
    depsPromise = Promise.resolve(overrides);
    return overrides;
  }
  return ensureDeps();
}
