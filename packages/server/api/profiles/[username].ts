import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const db = getDb();
    const profile = await db.getDocument('profiles', username);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Check if user has logged in (hasAccount flag in auth data)
    // Find the auth record by scanning for this username
    const allAuth = await db.getAllDocuments<any>('auth');
    const authRecord = allAuth.find((auth: any) => auth.data.username === username);

    return res.status(200).json({
      ...profile,
      hasAccount: authRecord?.data.hasAccount !== false
    });
  } catch (error: any) {
    console.error('Error getting profile:', error);
    return res.status(500).json({ error: error.message });
  }
}
