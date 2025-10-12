import { Router } from 'express';
import { DbAdapter } from '../db/adapter.js';
import { AuthService } from '../auth/auth.js';

/**
 * Creates and configures the profiles router
 *
 * @param db - Database adapter for data operations
 * @param authService - Authentication service (unused here but kept for consistency)
 * @param requireAuth - Middleware function for protecting authenticated routes
 * @returns Configured Express Router with profile endpoints
 */
export function createProfilesRouter(
  db: DbAdapter,
  authService: AuthService,
  requireAuth: any
): Router {
  const router = Router();

  /**
   * GET /api/profiles/:username
   * Get a user's profile by username
   * Public endpoint - no authentication required
   */
  router.get('/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const profile = await db.getDocument('profiles', username);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Check if user has logged in (hasAccount flag in auth data)
      // Find the auth record by scanning for this username
      const allAuth = await db.getAllDocuments<any>('auth');
      const authRecord = allAuth.find((auth: any) => auth.data.username === username);

      res.json({ ...profile, hasAccount: authRecord?.data.hasAccount !== false });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/profiles/:username
   * Update a user's profile
   * Protected: Users can only edit their own profile
   * Body: { fullName?: string, bio?: string, photoUrl?: string }
   */
  router.put('/:username', requireAuth, async (req, res) => {
    try {
      const { username } = req.params;

      // Only allow users to edit their own profile
      if (req.user.username !== username) {
        return res.status(403).json({ error: 'You can only edit your own profile' });
      }

      const { fullName, bio, photoUrl } = req.body;
      const updates: any = {};

      if (fullName !== undefined) updates.fullName = fullName;
      if (bio !== undefined) updates.bio = bio;
      if (photoUrl !== undefined) updates.photoUrl = photoUrl;

      await db.updateDocument('profiles', username, updates);

      const updatedProfile = await db.getDocument('profiles', username);
      res.json(updatedProfile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
