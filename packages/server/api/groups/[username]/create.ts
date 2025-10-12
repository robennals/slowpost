import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, getAuthService } from '../../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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

    const { groupName, displayName, description, isPublic } = req.body;

    if (!groupName || !displayName) {
      return res.status(400).json({ error: 'Group name and display name are required' });
    }

    const db = getDb();

    // Check if group already exists
    const existing = await db.getDocument('groups', groupName);
    if (existing) {
      return res.status(400).json({ error: 'Group already exists' });
    }

    const group = {
      groupName,
      displayName,
      description: description || '',
      adminUsername: session.username,
      isPublic: isPublic !== false,
    };

    await db.addDocument('groups', groupName, group);

    // Add creator as first member (approved and admin)
    const member = {
      groupName,
      username: session.username,
      groupBio: 'Creator',
      status: 'approved',
      isAdmin: true,
      timestamp: new Date().toISOString(),
    };

    await db.addLink('members', groupName, session.username, member);

    return res.status(200).json({ success: true, group });
  } catch (error: any) {
    console.error('Error creating group:', error);
    return res.status(500).json({ error: error.message });
  }
}
