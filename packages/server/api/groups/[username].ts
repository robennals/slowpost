import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, getAuthService } from '../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const db = getDb();
    const memberships = await db.getParentLinks('members', username);

    // Get the viewer's username from the session if logged in
    let viewerUsername: string | null = null;
    const token = req.cookies.auth_token;
    if (token) {
      const authService = getAuthService();
      const session = await authService.verifySession(token);
      if (session) {
        viewerUsername = session.username;
      }
    }

    // Enrich with group data and filter based on visibility and membership status
    const groups = await Promise.all(memberships.map(async (m: any) => {
      const group = await db.getDocument<any>('groups', m.groupName);
      return { ...group, memberBio: m.groupBio, memberStatus: m.status };
    }));

    const filteredGroups = await Promise.all(groups.map(async (group: any) => {
      // Filter out pending memberships unless viewer is the profile owner or an admin
      if (group.memberStatus === 'pending') {
        if (viewerUsername === username) {
          // Show own pending memberships
          return group;
        }
        // Check if viewer is an admin of this group
        if (viewerUsername) {
          const members = await db.getChildLinks<any>('members', group.groupName);
          const viewerMembership = members.find((m: any) => m.username === viewerUsername);
          if (viewerMembership?.isAdmin && viewerMembership?.status === 'approved') {
            return group;
          }
        }
        // Don't show pending memberships to others
        return null;
      }

      // For approved memberships, apply visibility rules
      // Show public groups to everyone
      if (group.isPublic) return group;

      // For private groups, only show if viewer is also a member (approved or pending)
      if (!viewerUsername) return null;
      const members = await db.getChildLinks<any>('members', group.groupName);
      const viewerMembership = members.find((m: any) => m.username === viewerUsername);
      return (viewerMembership && viewerMembership.status === 'approved') ? group : null;
    }));

    return res.status(200).json(filteredGroups.filter((g: any) => g !== null));
  } catch (error: any) {
    console.error('Error getting user groups:', error);
    return res.status(500).json({ error: error.message });
  }
}
