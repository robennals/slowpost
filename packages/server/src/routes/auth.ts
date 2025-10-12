import { Router } from 'express';
import { DbAdapter } from '../db/adapter.js';
import { AuthService } from '../auth/auth.js';

const SKIP_PIN = process.env.SKIP_PIN === 'true';

/**
 * Creates and configures the authentication router
 *
 * @param db - Database adapter for data operations
 * @param authService - Authentication service for handling auth logic
 * @param requireAuth - Middleware function for protecting authenticated routes
 * @returns Configured Express Router with auth endpoints
 */
export function createAuthRouter(
  db: DbAdapter,
  authService: AuthService,
  requireAuth: any
): Router {
  const router = Router();

  /**
   * POST /api/auth/request-pin
   * Request a PIN code for authentication
   * Body: { email: string }
   */
  router.post('/request-pin', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const { pin, requiresSignup } = await authService.requestPin(email);

      // In development, return the PIN. In production, send it via email
      if (SKIP_PIN) {
        console.log(`PIN for ${email}: ${pin}`);
        return res.json({ success: true, requiresSignup, pin }); // Only for dev
      }

      // TODO: Send email via Postmark
      console.log(`PIN for ${email}: ${pin} (email not configured yet)`);

      res.json({ success: true, requiresSignup });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/auth/login
   * Verify PIN and log in existing user
   * Body: { email: string, pin: string }
   */
  router.post('/login', async (req, res) => {
    try {
      const { email, pin } = req.body;
      if (!email || !pin) {
        return res.status(400).json({ error: 'Email and PIN are required' });
      }

      const valid = await authService.verifyPin(email, pin);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid or expired PIN' });
      }

      // Mark that the user has logged in (has an account)
      const authData = await db.getDocument<any>('auth', email);
      if (authData && !authData.hasAccount) {
        await db.updateDocument<any>('auth', email, { hasAccount: true });
      }

      const session = await authService.createSession(email);

      res.cookie('auth_token', session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.json({
        success: true,
        session: {
          username: session.username,
          fullName: session.fullName,
          expiresAt: session.expiresAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/auth/signup
   * Create a new user account with PIN verification
   * Body: { email: string, username: string, fullName: string, pin: string }
   */
  router.post('/signup', async (req, res) => {
    try {
      const { email, username, fullName, pin } = req.body;
      if (!email || !username || !fullName || !pin) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const valid = await authService.verifyPin(email, pin);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid or expired PIN' });
      }

      const user = await authService.createUser(email, username, fullName);
      const session = await authService.createSession(email);

      res.cookie('auth_token', session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        session: {
          username: session.username,
          fullName: session.fullName,
          expiresAt: session.expiresAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/auth/me
   * Get current authenticated user's information
   * Protected: Requires authentication
   */
  router.get('/me', requireAuth, (req: any, res) => {
    res.json({
      username: req.user.username,
      fullName: req.user.fullName,
    });
  });

  /**
   * POST /api/auth/logout
   * Log out the current user by clearing the auth cookie
   */
  router.post('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true });
  });

  return router;
}
