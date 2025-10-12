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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`SKIP_PIN mode: ${SKIP_PIN}`);
});
