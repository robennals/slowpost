import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { groupName } = req.query;

    if (!groupName || typeof groupName !== 'string') {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const db = getDb();
    const group = await db.getDocument('groups', groupName);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get members
    const members = await db.getChildLinks('members', groupName);

    return res.status(200).json({ ...group, members });
  } catch (error: any) {
    console.error('Error getting group:', error);
    return res.status(500).json({ error: error.message });
  }
}
