import express from 'express';
import { ServerClient } from 'postmark';
import { z } from 'zod';
import { store } from './datastore.js';
import type { LoginSession } from './types.js';

const isDev = process.env.NODE_ENV !== 'production';
const postmarkServerToken = process.env.POSTMARK_SERVER_TOKEN;
const postmarkFromEmail = process.env.POSTMARK_FROM_EMAIL;
const postmarkClient = !isDev && postmarkServerToken ? new ServerClient(postmarkServerToken) : undefined;

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

const app = express();
app.use(express.json());

app.get('/api/home/:username', (req, res) => {
  try {
    const { username } = req.params;
    const view = store.getHomeView(username);
    res.json(view);
  } catch (error) {
    res.status(404).json({ message: (error as Error).message });
  }
});

app.post('/api/home/:username/close-friend', (req, res) => {
  try {
    const schema = z.object({ followerUsername: z.string(), isCloseFriend: z.boolean() });
    const { followerUsername, isCloseFriend } = schema.parse(req.body);
    const view = store.setCloseFriend(req.params.username, followerUsername, isCloseFriend);
    res.json(view);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

app.get('/api/profile/:username', (req, res) => {
  try {
    const { username } = req.params;
    const viewer = req.query.viewer as string | undefined;
    const view = store.getProfileView(username, viewer);
    res.json(view);
  } catch (error) {
    res.status(404).json({ message: (error as Error).message });
  }
});

app.post('/api/profile/:username/follow', (req, res) => {
  try {
    const schema = z.object({ follower: z.string() });
    const { follower } = schema.parse(req.body);
    const follow = store.requestFollow(follower, req.params.username);
    res.json(follow);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

app.get('/api/group/:groupKey', (req, res) => {
  try {
    const { groupKey } = req.params;
    const view = store.getGroupView(groupKey);
    res.json(view);
  } catch (error) {
    res.status(404).json({ message: (error as Error).message });
  }
});

app.post('/api/group/:groupKey/join', (req, res) => {
  try {
    const schema = z.object({ username: z.string() });
    const { username } = schema.parse(req.body);
    const result = store.requestGroupJoin(username, req.params.groupKey);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

app.get('/api/followers/:username', (req, res) => {
  try {
    const { username } = req.params;
    const view = store.getFollowersView(username);
    res.json(view);
  } catch (error) {
    res.status(404).json({ message: (error as Error).message });
  }
});

app.post('/api/login/request', async (req, res) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);
    const session = store.createLoginSession(email);
    await deliverLoginPin(session);
    const message = isDev
      ? 'PIN generated. Check the server logs for the code.'
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

app.post('/api/login/verify', (req, res) => {
  try {
    const schema = z.object({ email: z.string().email(), pin: z.string() });
    const { email, pin } = schema.parse(req.body);
    const session = store.verifyLogin(email, pin);
    res.json({ username: session.username });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

app.post('/api/login/dev-skip', (req, res) => {
  if (!isDev) {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  try {
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);
    console.log(`[dev] Skipping PIN verification for ${email}`);
    const session = store.forceVerifyLogin(email);
    res.json({ username: session.username });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

export function createServer() {
  return app;
}

export default app;
