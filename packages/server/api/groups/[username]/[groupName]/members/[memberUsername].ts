import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, getAuthService } from '../../../../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { groupName, memberUsername } = req.query;

    if (!groupName || typeof groupName !== 'string' ||
        !memberUsername || typeof memberUsername !== 'string') {
      return res.status(400).json({ error: 'Group name and member username are required' });
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

    const { groupBio, status, isAdmin } = req.body;

    const db = getDb();

    // Get the group and check if requester is an admin
    const members = await db.getChildLinks<any>('members', groupName);
    const requesterMembership = members.find((m: any) => m.username === session.username);

    const isRequesterAdmin = (requesterMembership as any)?.isAdmin && (requesterMembership as any)?.status === 'approved';

    // Check permissions
    if (groupBio !== undefined && session.username !== memberUsername && !isRequesterAdmin) {
      return res.status(403).json({ error: 'You can only update your own bio' });
    }

    if ((status !== undefined || isAdmin !== undefined) && !isRequesterAdmin) {
      return res.status(403).json({ error: 'Only admins can approve members or toggle admin status' });
    }

    // Build update object
    const updates: any = {};
    if (groupBio !== undefined) updates.groupBio = groupBio;
    if (status !== undefined) updates.status = status;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;

    await db.updateLink('members', groupName, memberUsername, updates);

    // If approving a member, create an update for them
    if (status === 'approved') {
      const group = await db.getDocument<any>('groups', groupName);
      const updateId = `${Date.now()}-${memberUsername}-approved-${groupName}`;
      const update = {
        id: updateId,
        type: 'group_join_approved',
        groupName,
        timestamp: new Date().toISOString(),
      };
      await db.addLink<any>('updates', memberUsername, updateId, update);
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error updating group member:', error);
    return res.status(500).json({ error: error.message });
  }
}
