import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, getAuthService } from '../../../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { groupName } = req.query;

    if (!groupName || typeof groupName !== 'string') {
      return res.status(400).json({ error: 'Group name is required' });
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

    const db = getDb();
    await db.deleteLink('members', groupName, session.username);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error leaving group:', error);
    return res.status(500).json({ error: error.message });
  }
}
