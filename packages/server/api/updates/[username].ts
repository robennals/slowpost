import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const db = getDb();
    const updates = await db.getChildLinks('updates', username);

    // Sort by timestamp descending (newest first)
    const sorted = updates.sort((a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return res.status(200).json(sorted);
  } catch (error: any) {
    console.error('Error getting updates:', error);
    return res.status(500).json({ error: error.message });
  }
}
