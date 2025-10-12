import { AuthSession } from '../auth/auth';

declare global {
  namespace Express {
    interface Request {
      user: AuthSession;
    }
  }
}
