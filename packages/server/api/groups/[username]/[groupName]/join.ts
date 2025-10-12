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
    const group = await db.getDocument('groups', groupName);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if already a member
    const members = await db.getChildLinks('members', groupName);
    if (members.some((m: any) => m.username === session.username)) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    const { groupBio } = req.body;

    // Create pending membership (requires admin approval)
    const member = {
      groupName,
      username: session.username,
      groupBio: groupBio || '',
      status: 'pending',
      isAdmin: false,
      timestamp: new Date().toISOString(),
    };

    await db.addLink('members', groupName, session.username, member);

    // Create an update for all group admins
    const updateId = `${Date.now()}-${session.username}-request-${groupName}`;
    const update = {
      id: updateId,
      type: 'group_join_request',
      username: session.username,
      groupName,
      timestamp: new Date().toISOString(),
    };

    // Get all admin members and create updates for each
    const allMembers = await db.getChildLinks<any>('members', groupName);
    const admins = allMembers.filter((m: any) => m.isAdmin && m.status === 'approved');

    for (const admin of admins) {
      await db.addLink<any>('updates', (admin as any).username, `${updateId}-${(admin as any).username}`, update);
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error joining group:', error);
    return res.status(500).json({ error: error.message });
  }
}
