import { Router } from 'express';
import { DbAdapter } from '../db/adapter.js';
import { AuthService } from '../auth/auth.js';

/**
 * Creates and configures the updates router
 *
 * @param db - Database adapter for data operations
 * @param authService - Authentication service (unused here but kept for consistency)
 * @param requireAuth - Middleware function for protecting authenticated routes (unused here but kept for consistency)
 * @returns Configured Express Router with update endpoints
 */
export function createUpdatesRouter(
  db: DbAdapter,
  authService: AuthService,
  requireAuth: any
): Router {
  const router = Router();

  /**
   * GET /api/updates/:username
   * Get updates for a user
   * Public endpoint - no authentication required
   * Returns updates sorted by timestamp (newest first)
   */
  router.get('/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const updates = await db.getChildLinks('updates', username);

      // Sort by timestamp descending (newest first)
      const sorted = updates.sort((a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      res.json(sorted);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
