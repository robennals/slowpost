import { describe, expect, it } from 'vitest';
import { createMemoryStore, type HomeFollower, type Profile } from '@slowpost/data';

describe('Slowpost data store', () => {
  it('generates a home view with followers', async () => {
    const store = createMemoryStore();
    const home = await store.getHomeView('ada');
    expect(home.followers).toHaveLength(2);
    const followerNames = home.followers
      .map((follower: HomeFollower) => follower.username)
      .sort();
    expect(followerNames).toEqual(['elon', 'grace']);
  });

  it('exports follower emails as a string', async () => {
    const store = createMemoryStore();
    const exportString = await store.exportFollowers('ada');
    expect(exportString).toContain('grace@slowpost.org');
    expect(exportString).toContain('elon@slowpost.org');
  });

  it('allows toggling close friend status', async () => {
    const store = createMemoryStore();
    const updated = await store.setCloseFriend('ada', 'elon', true);
    const elon = updated.followers.find(
      (follower: HomeFollower) => follower.username === 'elon'
    );
    expect(elon?.isCloseFriend).toBe(true);
  });

  it('creates a profile view with public and private groups', async () => {
    const store = createMemoryStore();
    const profile = await store.getProfileView('ada', 'grace');
    expect(profile.publicGroups).toHaveLength(1);
    expect(profile.sharedPrivateGroups).toHaveLength(1);
  });

  it('provides group member details', async () => {
    const store = createMemoryStore();
    const group = await store.getGroupView('future-society');
    expect(group.group.isPrivate).toBe(true);
    expect(group.members.map((member: Profile) => member.username)).toContain('grace');
  });

  it('tracks pending follower requests', async () => {
    const store = createMemoryStore();
    const followers = await store.getFollowersView('grace');
    expect(followers.pendingFollowers).toHaveLength(1);
    expect(followers.pendingFollowers[0].username).toBe('ada');
  });

  it('creates and completes signup sessions', async () => {
    const store = createMemoryStore();
    const session = await store.createLoginSession('new@example.com', 'signup');
    expect(session.pin).toHaveLength(6);
    const verified = await store.verifyLogin('new@example.com', session.pin);
    expect(verified.verified).toBe(true);
    expect(verified.intent).toBe('signup');
    const completed = await store.completeSignup('new@example.com', 'newuser', 'New User');
    expect(completed.username).toBe('newuser');
    const profile = await store.getProfileView('newuser');
    expect(profile.profile.username).toBe('newuser');
  });

  it('creates login sessions for existing accounts', async () => {
    const store = createMemoryStore();
    const session = await store.createLoginSession('ada@example.com', 'login');
    expect(session.username).toBe('ada');
    const verifiedLogin = await store.verifyLogin('ada@example.com', session.pin);
    expect(verifiedLogin.intent).toBe('login');
  });

  it('force verifies login sessions for development', async () => {
    const store = createMemoryStore();
    const email = 'devskip@example.com';
    await store.createLoginSession(email, 'signup');
    const forced = await store.forceVerifyLogin(email, 'signup');
    expect(forced.verified).toBe(true);
    expect(forced.intent).toBe('signup');
  });

  it('updates profile photos', async () => {
    const store = createMemoryStore();
    const newPhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
    const profile = await store.updateProfilePhoto('ada', newPhoto);
    expect(profile.photoUrl).toBe(newPhoto);
    const updatedView = await store.getProfileView('ada');
    expect(updatedView.profile.photoUrl).toBe(newPhoto);
  });
});
