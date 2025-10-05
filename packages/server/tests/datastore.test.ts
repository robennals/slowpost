import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../src/datastore.js';

describe('InMemoryStore', () => {
  const store = new InMemoryStore();

  it('generates a home view with followers', () => {
    const home = store.getHomeView('ada');
    expect(home.followers).toHaveLength(2);
    const followerNames = home.followers.map((follower) => follower.username).sort();
    expect(followerNames).toEqual(['elon', 'grace']);
  });

  it('exports follower emails as a string', () => {
    const exportString = store.exportFollowers('ada');
    expect(exportString).toContain('grace@slowpost.org');
    expect(exportString).toContain('elon@slowpost.org');
  });

  it('allows toggling close friend status', () => {
    const updated = store.setCloseFriend('ada', 'elon', true);
    const elon = updated.followers.find((follower) => follower.username === 'elon');
    expect(elon?.isCloseFriend).toBe(true);
  });

  it('creates a profile view with public and private groups', () => {
    const profile = store.getProfileView('ada', 'grace');
    expect(profile.publicGroups).toHaveLength(1);
    expect(profile.sharedPrivateGroups).toHaveLength(1);
  });

  it('provides group member details', () => {
    const group = store.getGroupView('future-society');
    expect(group.group.isPrivate).toBe(true);
    expect(group.members.map((member) => member.username)).toContain('grace');
  });

  it('tracks pending follower requests', () => {
    const followers = store.getFollowersView('grace');
    expect(followers.pendingFollowers).toHaveLength(1);
    expect(followers.pendingFollowers[0].username).toBe('ada');
  });

  it('creates and completes signup sessions', () => {
    const signupStore = new InMemoryStore();
    const session = signupStore.createLoginSession('new@example.com', 'signup');
    expect(session.pin).toHaveLength(6);
    const verified = signupStore.verifyLogin('new@example.com', session.pin);
    expect(verified.verified).toBe(true);
    const completed = signupStore.completeSignup('new@example.com', 'newuser', 'New User');
    expect(completed.username).toBe('newuser');
    expect(signupStore.getProfile('newuser')).toBeDefined();
  });

  it('creates login sessions for existing accounts', () => {
    const loginSession = store.createLoginSession('ada@example.com', 'login');
    expect(loginSession.username).toBe('ada');
    const verifiedLogin = store.verifyLogin('ada@example.com', loginSession.pin);
    expect(verifiedLogin.intent).toBe('login');
  });

  it('force verifies login sessions for development', () => {
    const email = 'devskip@example.com';
    store.createLoginSession(email, 'signup');
    const forced = store.forceVerifyLogin(email, 'signup');
    expect(forced.verified).toBe(true);
  });
});
