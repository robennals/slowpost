import { Router } from 'express';
import { DbAdapter } from '../db/adapter.js';
import { AuthService } from '../auth/auth.js';

/**
 * Creates and configures the groups router
 *
 * @param db - Database adapter for data operations
 * @param authService - Authentication service for session verification
 * @param requireAuth - Middleware function for protecting authenticated routes
 * @returns Configured Express Router with group endpoints
 */
export function createGroupsRouter(
  db: DbAdapter,
  authService: AuthService,
  requireAuth: any
): Router {
  const router = Router();

  /**
   * GET /api/groups/user/:username
   * Get all groups for a user with visibility filtering
   * Public endpoint but applies visibility rules based on authentication
   * Returns groups where the user is a member, with appropriate filtering
   */
  router.get('/user/:username', async (req: any, res) => {
    try {
      const { username } = req.params;
      const memberships = await db.getParentLinks('members', username);

      // Get the viewer's username from the session if logged in
      let viewerUsername: string | null = null;
      const token = req.cookies.auth_token;
      if (token) {
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

      res.json(filteredGroups.filter((g: any) => g !== null));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/groups/:groupName
   * Get a specific group with its members
   * Public endpoint - no authentication required
   */
  router.get('/:groupName', async (req, res) => {
    try {
      const { groupName } = req.params;
      const group = await db.getDocument('groups', groupName);

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Get members
      const members = await db.getChildLinks('members', groupName);

      res.json({ ...group, members });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/groups
   * Create a new group
   * Protected: Requires authentication
   * Body: { groupName: string, displayName: string, description?: string, isPublic?: boolean }
   * The creator is automatically added as the first admin member
   */
  router.post('/', requireAuth, async (req, res) => {
    try {
      const { groupName, displayName, description, isPublic } = req.body;

      if (!groupName || !displayName) {
        return res.status(400).json({ error: 'Group name and display name are required' });
      }

      // Check if group already exists
      const existing = await db.getDocument('groups', groupName);
      if (existing) {
        return res.status(400).json({ error: 'Group already exists' });
      }

      const group = {
        groupName,
        displayName,
        description: description || '',
        adminUsername: req.user.username,
        isPublic: isPublic !== false,
      };

      await db.addDocument('groups', groupName, group);

      // Add creator as first member (approved and admin)
      const member = {
        groupName,
        username: req.user.username,
        groupBio: 'Creator',
        status: 'approved',
        isAdmin: true,
        timestamp: new Date().toISOString(),
      };

      await db.addLink('members', groupName, req.user.username, member);

      res.json({ success: true, group });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/groups/:groupName/join
   * Request to join a group
   * Protected: Requires authentication
   * Body: { groupBio?: string }
   * Creates a pending membership that requires admin approval
   */
  router.post('/:groupName/join', requireAuth, async (req, res) => {
    try {
      const { groupName } = req.params;
      const { groupBio } = req.body;

      const group = await db.getDocument('groups', groupName);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Check if already a member
      const members = await db.getChildLinks('members', groupName);
      if (members.some((m: any) => m.username === req.user.username)) {
        return res.status(400).json({ error: 'Already a member of this group' });
      }

      // Create pending membership (requires admin approval)
      const member = {
        groupName,
        username: req.user.username,
        groupBio: groupBio || '',
        status: 'pending',
        isAdmin: false,
        timestamp: new Date().toISOString(),
      };

      await db.addLink('members', groupName, req.user.username, member);

      // Create an update for all group admins
      const updateId = `${Date.now()}-${req.user.username}-request-${groupName}`;
      const update = {
        id: updateId,
        type: 'group_join_request',
        username: req.user.username,
        groupName,
        timestamp: new Date().toISOString(),
      };

      // Get all admin members and create updates for each
      const allMembers = await db.getChildLinks<any>('members', groupName);
      const admins = allMembers.filter((m: any) => m.isAdmin && m.status === 'approved');

      for (const admin of admins) {
        await db.addLink<any>('updates', (admin as any).username, `${updateId}-${(admin as any).username}`, update);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/groups/:groupName/members/:username
   * Update member's group bio or status
   * Protected: Requires authentication
   * Body: { groupBio?: string, status?: string, isAdmin?: boolean }
   * Users can update their own bio, admins can approve/reject and toggle admin status
   */
  router.put('/:groupName/members/:username', requireAuth, async (req, res) => {
    try {
      const { groupName, username } = req.params;
      const { groupBio, status, isAdmin } = req.body;

      // Get the group and check if requester is an admin
      const members = await db.getChildLinks<any>('members', groupName);
      const requesterMembership = members.find((m: any) => m.username === req.user.username);

      const isRequesterAdmin = (requesterMembership as any)?.isAdmin && (requesterMembership as any)?.status === 'approved';

      // Check permissions
      if (groupBio !== undefined && req.user.username !== username && !isRequesterAdmin) {
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

      await db.updateLink('members', groupName, username, updates);

      // If approving a member, create an update for them
      if (status === 'approved') {
        const group = await db.getDocument<any>('groups', groupName);
        const updateId = `${Date.now()}-${username}-approved-${groupName}`;
        const update = {
          id: updateId,
          type: 'group_join_approved',
          groupName,
          timestamp: new Date().toISOString(),
        };
        await db.addLink<any>('updates', username, updateId, update);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/groups/:groupName/members/:username
   * Leave a group
   * Protected: Users can only remove themselves from groups
   */
  router.delete('/:groupName/members/:username', requireAuth, async (req, res) => {
    try {
      const { groupName, username } = req.params;

      // Only allow users to leave themselves
      if (req.user.username !== username) {
        return res.status(403).json({ error: 'You can only remove yourself' });
      }

      await db.deleteLink('members', groupName, username);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
