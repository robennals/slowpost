import { Router } from 'express';
import { DbAdapter } from '../db/adapter.js';
import { AuthService } from '../auth/auth.js';

/**
 * Creates and configures the subscribers router
 *
 * @param db - Database adapter for data operations
 * @param authService - Authentication service (unused here but kept for consistency)
 * @param requireAuth - Middleware function for protecting authenticated routes
 * @returns Configured Express Router with subscriber endpoints
 */
export function createSubscribersRouter(
  db: DbAdapter,
  authService: AuthService,
  requireAuth: any
): Router {
  const router = Router();

  /**
   * GET /api/subscribers/:username
   * Get subscribers of a user (people who subscribe to this user)
   * Public endpoint - no authentication required
   */
  router.get('/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const subscribers = await db.getChildLinks('subscriptions', username);
      res.json(subscribers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/subscriptions/:username
   * Get subscriptions of a user (people this user subscribes to)
   * Public endpoint - no authentication required
   */
  router.get('/subscriptions/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const subscriptions = await db.getParentLinks('subscriptions', username);
      res.json(subscriptions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/subscribers/:username
   * Subscribe to a user
   * Protected: Requires authentication
   * Creates a subscription relationship between the authenticated user and the target user
   */
  router.post('/:username', requireAuth, async (req, res) => {
    try {
      const { username } = req.params;
      const subscriberUsername = req.user.username;

      if (username === subscriberUsername) {
        return res.status(400).json({ error: 'You cannot subscribe to yourself' });
      }

      // Check if already subscribed
      const existing = await db.getChildLinks('subscriptions', username);
      if (existing.some((s: any) => s.subscriberUsername === subscriberUsername)) {
        return res.status(400).json({ error: 'Already subscribed to this user' });
      }

      const subscription = {
        subscriberUsername,
        subscribedToUsername: username,
        isClose: false,
        addedBy: subscriberUsername, // Subscriber initiated this
        confirmed: true, // Self-subscriptions are auto-confirmed
        timestamp: new Date().toISOString(),
      };

      await db.addLink('subscriptions', username, subscriberUsername, subscription);

      // Create an update for the subscribed-to user
      const updateId = `${Date.now()}-${subscriberUsername}-subscribed`;
      const update = {
        id: updateId,
        type: 'new_subscriber',
        username: subscriberUsername,
        timestamp: new Date().toISOString(),
      };
      await db.addLink('updates', username, updateId, update);

      res.json({ success: true, subscription });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/subscribers/:username/add-by-email
   * Add a subscriber by email address
   * Protected: Users can only add subscribers to themselves
   * Body: { email: string, fullName?: string }
   * Creates a new user account if email doesn't exist
   */
  router.post('/:username/add-by-email', requireAuth, async (req, res) => {
    try {
      const { username } = req.params;

      // Only allow users to add subscribers to themselves
      if (req.user.username !== username) {
        return res.status(403).json({ error: 'You can only add subscribers to yourself' });
      }

      const { email, fullName } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Find existing user by email
      const authData = await db.getDocument<any>('auth', email);
      let subscriberUsername: string;

      if (authData && authData.username) {
        // User already exists
        subscriberUsername = authData.username;

        // Check if already subscribed
        const existing = await db.getChildLinks('subscriptions', username);
        if (existing.some((s: any) => s.subscriberUsername === subscriberUsername)) {
          return res.status(400).json({ error: 'This person is already a subscriber' });
        }

        // Optionally update their name if provided and they don't have one
        if (fullName) {
          const profile = await db.getDocument<any>('profiles', subscriberUsername);
          if (profile && !profile.fullName) {
            await db.updateDocument<any>('profiles', subscriberUsername, { fullName });
          }
        }
      } else {
        // Create new user account
        if (!fullName) {
          return res.status(400).json({ error: 'Full name is required for new users' });
        }

        // Generate a username from email (before @)
        const baseUsername = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
        let newUsername = baseUsername;
        let counter = 1;

        // Ensure username is unique
        while (await db.getDocument<any>('profiles', newUsername)) {
          newUsername = `${baseUsername}${counter}`;
          counter++;
        }

        subscriberUsername = newUsername;

        // Create auth record
        await db.addDocument<any>('auth', email, {
          email,
          username: subscriberUsername,
          hasAccount: false, // They haven't logged in yet
        });

        // Create profile
        await db.addDocument<any>('profiles', subscriberUsername, {
          username: subscriberUsername,
          fullName,
          bio: '',
        });
      }

      // Create the subscription
      const subscription = {
        subscriberUsername,
        subscribedToUsername: username,
        isClose: false,
        addedBy: username, // The subscribedTo user added this person
        confirmed: false, // Not yet confirmed by subscriber
        timestamp: new Date().toISOString(),
      };

      await db.addLink('subscriptions', username, subscriberUsername, subscription);

      res.json({ success: true, subscriberUsername });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/subscribers/:username/:subscriberUsername
   * Update subscription relationship (toggle close friend status)
   * Protected: Users can only update their own subscriber settings
   * Body: { isClose: boolean }
   */
  router.put('/:username/:subscriberUsername', requireAuth, async (req, res) => {
    try {
      const { username, subscriberUsername } = req.params;

      // Only allow users to update their own subscriber settings
      if (req.user.username !== username) {
        return res.status(403).json({ error: 'You can only update your own subscribers' });
      }

      const { isClose } = req.body;
      await db.updateLink('subscriptions', username, subscriberUsername, { isClose });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/subscribers/:username/:subscriberUsername
   * Unsubscribe from a user
   * Protected: Only the subscriber can unsubscribe themselves
   */
  router.delete('/:username/:subscriberUsername', requireAuth, async (req, res) => {
    try {
      const { username, subscriberUsername } = req.params;

      // Only the subscriber can unsubscribe
      if (req.user.username !== subscriberUsername) {
        return res.status(403).json({ error: 'You can only unsubscribe yourself' });
      }

      await db.deleteLink('subscriptions', username, subscriberUsername);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/subscribers/:username/:subscriberUsername/confirm
   * Confirm subscription (for email-added subscriptions)
   * Protected: Only the subscriber can confirm their own subscription
   */
  router.post('/:username/:subscriberUsername/confirm', requireAuth, async (req, res) => {
    try {
      const { username, subscriberUsername } = req.params;

      // Only the subscriber can confirm
      if (req.user.username !== subscriberUsername) {
        return res.status(403).json({ error: 'You can only confirm your own subscription' });
      }

      // Update the subscription to be confirmed
      await db.updateLink('subscriptions', username, subscriberUsername, { confirmed: true });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
