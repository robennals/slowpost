import express from 'express';
import { z } from 'zod';
import type { SlowpostStore } from '@slowpost/data';

export function createServer(store: SlowpostStore) {
  const app = express();
  app.use(express.json());

  app.get('/api/home/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const view = await store.getHomeView(username);
      res.json(view);
    } catch (error) {
      res.status(404).json({ message: (error as Error).message });
    }
  });

  app.post('/api/home/:username/close-friend', async (req, res) => {
    try {
      const schema = z.object({ followerUsername: z.string(), isCloseFriend: z.boolean() });
      const { followerUsername, isCloseFriend } = schema.parse(req.body);
      const view = await store.setCloseFriend(req.params.username, followerUsername, isCloseFriend);
      res.json(view);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.get('/api/profile/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const viewer = req.query.viewer as string | undefined;
      const view = await store.getProfileView(username, viewer);
      res.json(view);
    } catch (error) {
      res.status(404).json({ message: (error as Error).message });
    }
  });

  app.post('/api/profile/:username/follow', async (req, res) => {
    try {
      const schema = z.object({ follower: z.string() });
      const { follower } = schema.parse(req.body);
      const follow = await store.requestFollow(follower, req.params.username);
      res.json(follow);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.get('/api/group/:groupKey', async (req, res) => {
    try {
      const { groupKey } = req.params;
      const view = await store.getGroupView(groupKey);
      res.json(view);
    } catch (error) {
      res.status(404).json({ message: (error as Error).message });
    }
  });

  app.post('/api/group/:groupKey/join', async (req, res) => {
    try {
      const schema = z.object({ username: z.string() });
      const { username } = schema.parse(req.body);
      const result = await store.requestGroupJoin(username, req.params.groupKey);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.get('/api/followers/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const view = await store.getFollowersView(username);
      res.json(view);
    } catch (error) {
      res.status(404).json({ message: (error as Error).message });
    }
  });

  app.post('/api/login/request', async (req, res) => {
    try {
      const schema = z.object({ email: z.string().email() });
      const { email } = schema.parse(req.body);
      const session = await store.createLoginSession(email);
      res.json({ username: session.username, pin: session.pin });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.post('/api/login/verify', async (req, res) => {
    try {
      const schema = z.object({ email: z.string().email(), pin: z.string() });
      const { email, pin } = schema.parse(req.body);
      const session = await store.verifyLogin(email, pin);
      res.json({ username: session.username });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  return app;
}
