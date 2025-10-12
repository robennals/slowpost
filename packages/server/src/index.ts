import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from 'dotenv';
import { SQLiteAdapter } from './db/adapter.js';
import { AuthService } from './auth/auth.js';
import { mkdirSync } from 'fs';
import { join } from 'path';

config();

const app = express();
const PORT = process.env.PORT || 3001;
const SKIP_PIN = process.env.SKIP_PIN === 'true';

// Ensure data directory exists
const dataDir = join(process.cwd(), 'data');
try {
  mkdirSync(dataDir, { recursive: true });
} catch (e) {
  // Directory might already exist
}

// Initialize database and services
const db = new SQLiteAdapter();
const authService = new AuthService(db, SKIP_PIN);

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Auth middleware
async function requireAuth(req: any, res: any, next: any) {
  const token = req.cookies.auth_token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const session = await authService.verifySession(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.user = session;
  next();
}

// API Routes

// Request PIN
app.post('/api/auth/request-pin', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { pin, requiresSignup } = await authService.requestPin(email);

    // In development, return the PIN. In production, send it via email
    if (SKIP_PIN) {
      console.log(`PIN for ${email}: ${pin}`);
      return res.json({ success: true, requiresSignup, pin }); // Only for dev
    }

    // TODO: Send email via Postmark
    console.log(`PIN for ${email}: ${pin} (email not configured yet)`);

    res.json({ success: true, requiresSignup });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify PIN and login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) {
      return res.status(400).json({ error: 'Email and PIN are required' });
    }

    const valid = await authService.verifyPin(email, pin);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid or expired PIN' });
    }

    const session = await authService.createSession(email);

    res.cookie('auth_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      success: true,
      session: {
        username: session.username,
        fullName: session.fullName,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, username, fullName, pin } = req.body;
    if (!email || !username || !fullName || !pin) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const valid = await authService.verifyPin(email, pin);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid or expired PIN' });
    }

    const user = await authService.createUser(email, username, fullName);
    const session = await authService.createSession(email);

    res.cookie('auth_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      session: {
        username: session.username,
        fullName: session.fullName,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', requireAuth, (req: any, res) => {
  res.json({
    username: req.user.username,
    fullName: req.user.fullName,
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// Profile Routes

// Get profile by username
app.get('/api/profiles/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const profile = db.getDocument('profiles', username);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update own profile
app.put('/api/profiles/:username', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;

    // Only allow users to edit their own profile
    if (req.user.username !== username) {
      return res.status(403).json({ error: 'You can only edit your own profile' });
    }

    const { fullName, bio, photoUrl } = req.body;
    const updates: any = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (bio !== undefined) updates.bio = bio;
    if (photoUrl !== undefined) updates.photoUrl = photoUrl;

    db.updateDocument('profiles', username, updates);

    const updatedProfile = db.getDocument('profiles', username);
    res.json(updatedProfile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Updates/Events Routes

// Get updates for a user
app.get('/api/updates/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const updates = db.getChildLinks('updates', username);

    // Sort by timestamp descending (newest first)
    const sorted = updates.sort((a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json(sorted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Subscriber Routes

// Get subscribers of a user (people who subscribe to this user)
app.get('/api/subscribers/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const subscribers = db.getChildLinks('subscriptions', username);
    res.json(subscribers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get subscriptions of a user (people this user subscribes to)
app.get('/api/subscriptions/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const subscriptions = db.getParentLinks('subscriptions', username);
    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Subscribe to a user
app.post('/api/subscribers/:username', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const subscriberUsername = req.user.username;

    if (username === subscriberUsername) {
      return res.status(400).json({ error: 'You cannot subscribe to yourself' });
    }

    // Check if already subscribed
    const existing = db.getChildLinks('subscriptions', username);
    if (existing.some((s: any) => s.subscriberUsername === subscriberUsername)) {
      return res.status(400).json({ error: 'Already subscribed to this user' });
    }

    const subscription = {
      subscriberUsername,
      subscribedToUsername: username,
      isClose: false,
      addedBy: subscriberUsername, // Subscriber initiated this
      confirmed: true, // Self-subscriptions are auto-confirmed
    };

    db.addLink('subscriptions', username, subscriberUsername, subscription);

    // Create an update for the subscribed-to user
    const updateId = `${Date.now()}-${subscriberUsername}-subscribed`;
    const update = {
      id: updateId,
      type: 'new_subscriber',
      username: subscriberUsername,
      timestamp: new Date().toISOString(),
    };
    db.addLink('updates', username, updateId, update);

    res.json({ success: true, subscription });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add subscriber by email
app.post('/api/subscribers/:username/add-by-email', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;

    // Only allow users to add subscribers to themselves
    if (req.user.username !== username) {
      return res.status(403).json({ error: 'You can only add subscribers to yourself' });
    }

    const { email, fullName } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find existing user by email
    const authData = db.getDocument('auth', email);
    let subscriberUsername: string;

    if (authData && authData.username) {
      // User already exists
      subscriberUsername = authData.username;

      // Check if already subscribed
      const existing = db.getChildLinks('subscriptions', username);
      if (existing.some((s: any) => s.subscriberUsername === subscriberUsername)) {
        return res.status(400).json({ error: 'This person is already a subscriber' });
      }

      // Optionally update their name if provided and they don't have one
      if (fullName) {
        const profile = db.getDocument('profiles', subscriberUsername);
        if (profile && !profile.fullName) {
          db.updateDocument('profiles', subscriberUsername, { fullName });
        }
      }
    } else {
      // Create new user account
      if (!fullName) {
        return res.status(400).json({ error: 'Full name is required for new users' });
      }

      // Generate a username from email (before @)
      const baseUsername = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
      let newUsername = baseUsername;
      let counter = 1;

      // Ensure username is unique
      while (db.getDocument('profiles', newUsername)) {
        newUsername = `${baseUsername}${counter}`;
        counter++;
      }

      subscriberUsername = newUsername;

      // Create auth record
      db.addDocument('auth', email, {
        email,
        username: subscriberUsername,
      });

      // Create profile
      db.addDocument('profiles', subscriberUsername, {
        username: subscriberUsername,
        fullName,
        bio: '',
      });
    }

    // Create the subscription
    const subscription = {
      subscriberUsername,
      subscribedToUsername: username,
      isClose: false,
      addedBy: username, // The subscribedTo user added this person
      confirmed: false, // Not yet confirmed by subscriber
    };

    db.addLink('subscriptions', username, subscriberUsername, subscription);

    res.json({ success: true, subscriberUsername });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update subscription relationship (toggle close friend)
app.put('/api/subscribers/:username/:subscriberUsername', requireAuth, async (req, res) => {
  try {
    const { username, subscriberUsername } = req.params;

    // Only allow users to update their own subscriber settings
    if (req.user.username !== username) {
      return res.status(403).json({ error: 'You can only update your own subscribers' });
    }

    const { isClose } = req.body;
    db.updateLink('subscriptions', username, subscriberUsername, { isClose });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unsubscribe from a user
app.delete('/api/subscribers/:username/:subscriberUsername', requireAuth, async (req, res) => {
  try {
    const { username, subscriberUsername } = req.params;

    // Only the subscriber can unsubscribe
    if (req.user.username !== subscriberUsername) {
      return res.status(403).json({ error: 'You can only unsubscribe yourself' });
    }

    db.deleteLink('subscriptions', username, subscriberUsername);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm subscription (for email-added subscriptions)
app.post('/api/subscribers/:username/:subscriberUsername/confirm', requireAuth, async (req, res) => {
  try {
    const { username, subscriberUsername } = req.params;

    // Only the subscriber can confirm
    if (req.user.username !== subscriberUsername) {
      return res.status(403).json({ error: 'You can only confirm your own subscription' });
    }

    // Update the subscription to be confirmed
    db.updateLink('subscriptions', username, subscriberUsername, { confirmed: true });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Group Routes

// Get all groups for a user
app.get('/api/groups/user/:username', async (req: any, res) => {
  try {
    const { username } = req.params;
    const memberships = db.getParentLinks('members', username);

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
    const groups = memberships
      .map((m: any) => {
        const group = db.getDocument('groups', m.groupName);
        return { ...group, memberBio: m.groupBio, memberStatus: m.status };
      })
      .filter((group: any) => {
        // Filter out pending memberships unless viewer is the profile owner or an admin
        if (group.memberStatus === 'pending') {
          if (viewerUsername === username) {
            // Show own pending memberships
            return true;
          }
          // Check if viewer is an admin of this group
          if (viewerUsername) {
            const members = db.getChildLinks('members', group.groupName);
            const viewerMembership = members.find((m: any) => m.username === viewerUsername);
            if (viewerMembership?.isAdmin && viewerMembership?.status === 'approved') {
              return true;
            }
          }
          // Don't show pending memberships to others
          return false;
        }

        // For approved memberships, apply visibility rules
        // Show public groups to everyone
        if (group.isPublic) return true;

        // For private groups, only show if viewer is also a member (approved or pending)
        if (!viewerUsername) return false;
        const members = db.getChildLinks('members', group.groupName);
        const viewerMembership = members.find((m: any) => m.username === viewerUsername);
        return viewerMembership && viewerMembership.status === 'approved';
      });

    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific group
app.get('/api/groups/:groupName', async (req, res) => {
  try {
    const { groupName } = req.params;
    const group = db.getDocument('groups', groupName);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get members
    const members = db.getChildLinks('members', groupName);

    res.json({ ...group, members });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new group
app.post('/api/groups', requireAuth, async (req, res) => {
  try {
    const { groupName, displayName, description, isPublic } = req.body;

    if (!groupName || !displayName) {
      return res.status(400).json({ error: 'Group name and display name are required' });
    }

    // Check if group already exists
    const existing = db.getDocument('groups', groupName);
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

    db.addDocument('groups', groupName, group);

    // Add creator as first member (approved and admin)
    const member = {
      groupName,
      username: req.user.username,
      groupBio: 'Creator',
      status: 'approved',
      isAdmin: true,
    };

    db.addLink('members', groupName, req.user.username, member);

    res.json({ success: true, group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Request to join a group
app.post('/api/groups/:groupName/join', requireAuth, async (req, res) => {
  try {
    const { groupName } = req.params;
    const { groupBio } = req.body;

    const group = db.getDocument('groups', groupName);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if already a member
    const members = db.getChildLinks('members', groupName);
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
    };

    db.addLink('members', groupName, req.user.username, member);

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
    const allMembers = db.getChildLinks('members', groupName);
    const admins = allMembers.filter((m: any) => m.isAdmin && m.status === 'approved');

    admins.forEach((admin: any) => {
      db.addLink('updates', admin.username, `${updateId}-${admin.username}`, update);
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update member's group bio or status (admins can approve/reject, users can update their own bio)
app.put('/api/groups/:groupName/members/:username', requireAuth, async (req, res) => {
  try {
    const { groupName, username } = req.params;
    const { groupBio, status, isAdmin } = req.body;

    // Get the group and check if requester is an admin
    const members = db.getChildLinks('members', groupName);
    const requesterMembership = members.find((m: any) => m.username === req.user.username);

    const isRequesterAdmin = requesterMembership?.isAdmin && requesterMembership?.status === 'approved';

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

    db.updateLink('members', groupName, username, updates);

    // If approving a member, create an update for them
    if (status === 'approved') {
      const group = db.getDocument('groups', groupName);
      const updateId = `${Date.now()}-${username}-approved-${groupName}`;
      const update = {
        id: updateId,
        type: 'group_join_approved',
        groupName,
        timestamp: new Date().toISOString(),
      };
      db.addLink('updates', username, updateId, update);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Leave a group
app.delete('/api/groups/:groupName/members/:username', requireAuth, async (req, res) => {
  try {
    const { groupName, username } = req.params;

    // Only allow users to leave themselves
    if (req.user.username !== username) {
      return res.status(403).json({ error: 'You can only remove yourself' });
    }

    db.deleteLink('members', groupName, username);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`SKIP_PIN mode: ${SKIP_PIN}`);
});
