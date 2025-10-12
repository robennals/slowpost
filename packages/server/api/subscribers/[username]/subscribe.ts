import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, getAuthService } from '../../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Authenticate user
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const authService = getAuthService();
    const session = await authService.verifySession(token);

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const subscriberUsername = session.username;

    if (username === subscriberUsername) {
      return res.status(400).json({ error: 'You cannot subscribe to yourself' });
    }

    const db = getDb();

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

    return res.status(200).json({ success: true, subscription });
  } catch (error: any) {
    console.error('Error subscribing:', error);
    return res.status(500).json({ error: error.message });
  }
}
