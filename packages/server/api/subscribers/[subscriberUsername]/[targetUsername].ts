import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, getAuthService } from '../../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { subscriberUsername, targetUsername } = req.query;

    if (!subscriberUsername || typeof subscriberUsername !== 'string' ||
        !targetUsername || typeof targetUsername !== 'string') {
      return res.status(400).json({ error: 'Subscriber username and target username are required' });
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

    // Only allow users to update their own subscriber settings
    if (session.username !== targetUsername) {
      return res.status(403).json({ error: 'You can only update your own subscribers' });
    }

    const { isClose } = req.body;
    const db = getDb();

    await db.updateLink('subscriptions', targetUsername, subscriberUsername, { isClose });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error updating subscriber relationship:', error);
    return res.status(500).json({ error: error.message });
  }
}
