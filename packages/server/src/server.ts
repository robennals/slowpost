import express, { type CookieOptions, type Request, type Response } from 'express';
import { randomBytes } from 'crypto';
import { ServerClient } from 'postmark';
import { z } from 'zod';
import { store } from './datastore.js';
import type { SlowpostStore } from './datastore.js';
import type { LoginSession } from './types.js';

const isDev = process.env.NODE_ENV !== 'production';
const postmarkServerToken = process.env.POSTMARK_SERVER_TOKEN;
const postmarkFromEmail = process.env.POSTMARK_FROM_EMAIL;
const postmarkClient = !isDev && postmarkServerToken ? new ServerClient(postmarkServerToken) : undefined;

const loginCookieName = 'slowpost_login';
const loginCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: !isDev,
  path: '/',
  ...(isDev ? {} : { maxAge: 60 * 60 * 24 * 30 })
};

type SessionSnapshot = Pick<LoginSession, 'username' | 'email'>;
const loginTokens = new Map<string, SessionSnapshot>();

if (!isDev && !postmarkServerToken) {
  console.warn('POSTMARK_SERVER_TOKEN is not set. Login emails will fail until it is configured.');
}

async function deliverLoginPin(session: LoginSession) {
  if (isDev) {
    console.log(`[dev] Login PIN for ${session.email}: ${session.pin}`);
    return;
  }

  if (!postmarkClient) {
    throw new Error('Postmark server token is not configured');
  }

  if (!postmarkFromEmail) {
    throw new Error('POSTMARK_FROM_EMAIL environment variable is not configured');
  }

  await postmarkClient.sendEmail({
    From: postmarkFromEmail,
    To: session.email,
    Subject: 'Your Slowpost login PIN',
    TextBody: `Your Slowpost login PIN is ${session.pin}`,
    HtmlBody: `<p>Your Slowpost login PIN is <strong>${session.pin}</strong>.</p>`
  });
}

function issueLoginToken(session: SessionSnapshot): string {
  const token = randomBytes(16).toString('hex');
  loginTokens.set(token, session);
  return token;
}

function setLoginCookie(res: Response, token: string) {
  res.cookie(loginCookieName, token, loginCookieOptions);
}

function clearLoginCookie(res: Response) {
  res.clearCookie(loginCookieName, loginCookieOptions);
}

function readLoginToken(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawName, ...valueParts] = cookie.trim().split('=');
    if (rawName === loginCookieName) {
      return decodeURIComponent(valueParts.join('='));
    }
  }
  return undefined;
}

function findSessionByToken(token: string): SessionSnapshot | undefined {
  return loginTokens.get(token);
}

function revokeToken(token: string) {
  loginTokens.delete(token);
}

export function createServer(dataStore: SlowpostStore = store) {
  const app = express();
  app.use(express.json());

  app.get('/api/home/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const view = await dataStore.getHomeView(username);
      res.json(view);
    } catch (error) {
      res.status(404).json({ message: (error as Error).message });
    }
  });

  app.post('/api/home/:username/close-friend', async (req, res) => {
    try {
      const schema = z.object({ followerUsername: z.string(), isCloseFriend: z.boolean() });
      const { followerUsername, isCloseFriend } = schema.parse(req.body);
      const view = await dataStore.setCloseFriend(req.params.username, followerUsername, isCloseFriend);
      res.json(view);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.get('/api/profile/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const viewer = req.query.viewer as string | undefined;
      const view = await dataStore.getProfileView(username, viewer);
      res.json(view);
    } catch (error) {
      res.status(404).json({ message: (error as Error).message });
    }
  });

  app.post('/api/profile/:username/follow', async (req, res) => {
    try {
      const schema = z.object({ follower: z.string() });
      const { follower } = schema.parse(req.body);
      const follow = await dataStore.requestFollow(follower, req.params.username);
      res.json(follow);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.get('/api/group/:groupKey', async (req, res) => {
    try {
      const { groupKey } = req.params;
      const view = await dataStore.getGroupView(groupKey);
      res.json(view);
    } catch (error) {
      res.status(404).json({ message: (error as Error).message });
    }
  });

  app.post('/api/group/:groupKey/join', async (req, res) => {
    try {
      const schema = z.object({ username: z.string() });
      const { username } = schema.parse(req.body);
      const result = await dataStore.requestGroupJoin(username, req.params.groupKey);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.get('/api/followers/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const view = await dataStore.getFollowersView(username);
      res.json(view);
    } catch (error) {
      res.status(404).json({ message: (error as Error).message });
    }
  });

  app.post('/api/login/request', async (req, res) => {
    try {
      const schema = z.object({ email: z.string().email() });
      const { email } = schema.parse(req.body);
      const session = await dataStore.createLoginSession(email);
      await deliverLoginPin(session);
      const message = isDev
        ? 'PIN generated. Check the API server logs for the code.'
        : 'PIN sent. Please check your email.';
      res.json({ ok: true, message });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid email address.' });
        return;
      }
      console.error('Failed to deliver login PIN', error);
      res.status(500).json({ message: 'Unable to send login PIN. Please try again.' });
    }
  });

  app.post('/api/login/verify', async (req, res) => {
    try {
      const schema = z.object({ email: z.string().email(), pin: z.string() });
      const { email, pin } = schema.parse(req.body);
      const session = await dataStore.verifyLogin(email, pin);
      const token = issueLoginToken({ username: session.username, email: session.email });
      setLoginCookie(res, token);
      res.json({ username: session.username });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.post('/api/login/dev-skip', async (req, res) => {
    if (!isDev) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    try {
      const schema = z.object({ email: z.string().email() });
      const { email } = schema.parse(req.body);
      console.log(`[dev] Skipping PIN verification for ${email}`);
      const session = await dataStore.createLoginSession(email);
      const verified = await dataStore.verifyLogin(email, session.pin);
      const token = issueLoginToken({ username: verified.username, email: verified.email });
      setLoginCookie(res, token);
      res.json({ username: verified.username });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.get('/api/login/session', (req, res) => {
    const token = readLoginToken(req);
    if (!token) {
      res.json({ isLoggedIn: false });
      return;
    }
    const session = findSessionByToken(token);
    if (!session) {
      revokeToken(token);
      clearLoginCookie(res);
      res.json({ isLoggedIn: false });
      return;
    }
    res.json({ isLoggedIn: true, username: session.username });
  });

  return app;
}
