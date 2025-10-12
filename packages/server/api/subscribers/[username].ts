import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const db = getDb();
    const subscribers = await db.getChildLinks('subscriptions', username);

    return res.status(200).json(subscribers);
  } catch (error: any) {
    console.error('Error getting subscribers:', error);
    return res.status(500).json({ error: error.message });
  }
}
