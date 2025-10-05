import express from 'express';
import { z } from 'zod';
import { store } from './datastore.js';

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

app.post('/api/login/request', (req, res) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);
    const session = store.createLoginSession(email);
    res.json({ username: session.username, pin: session.pin });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
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

export function createServer() {
  return app;
}

export default app;
