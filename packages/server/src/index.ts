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

// Follower Routes

// Get followers of a user
app.get('/api/followers/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const followers = db.getChildLinks('follows', username);
    res.json(followers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Follow a user
app.post('/api/followers/:username', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const followerUsername = req.user.username;

    if (username === followerUsername) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check if already following
    const existing = db.getChildLinks('follows', username);
    if (existing.some((f: any) => f.followerUsername === followerUsername)) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    const follow = {
      followerUsername,
      followedUsername: username,
      isClose: false,
    };

    db.addLink('follows', username, followerUsername, follow);
    res.json({ success: true, follow });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update follow relationship (toggle close friend)
app.put('/api/followers/:username/:followerUsername', requireAuth, async (req, res) => {
  try {
    const { username, followerUsername } = req.params;

    // Only allow users to update their own follower settings
    if (req.user.username !== username) {
      return res.status(403).json({ error: 'You can only update your own followers' });
    }

    const { isClose } = req.body;
    db.updateLink('follows', username, followerUsername, { isClose });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unfollow a user
app.delete('/api/followers/:username/:followerUsername', requireAuth, async (req, res) => {
  try {
    const { username, followerUsername } = req.params;

    // Only the follower can unfollow
    if (req.user.username !== followerUsername) {
      return res.status(403).json({ error: 'You can only unfollow yourself' });
    }

    db.deleteLink('follows', username, followerUsername);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Group Routes

// Get all groups for a user
app.get('/api/groups/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const memberships = db.getParentLinks('members', username);

    // Enrich with group data
    const groups = memberships.map((m: any) => {
      const group = db.getDocument('groups', m.groupName);
      return { ...group, memberBio: m.groupBio };
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

    // Add creator as first member
    const member = {
      groupName,
      username: req.user.username,
      groupBio: 'Creator',
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

    // For now, auto-approve joins (in a real app, this would create a join request)
    const member = {
      groupName,
      username: req.user.username,
      groupBio: groupBio || '',
    };

    db.addLink('members', groupName, req.user.username, member);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update member's group bio
app.put('/api/groups/:groupName/members/:username', requireAuth, async (req, res) => {
  try {
    const { groupName, username } = req.params;

    // Only allow users to update their own bio
    if (req.user.username !== username) {
      return res.status(403).json({ error: 'You can only update your own bio' });
    }

    const { groupBio } = req.body;
    db.updateLink('members', groupName, username, { groupBio });

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
