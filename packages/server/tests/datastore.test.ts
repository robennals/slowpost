import { describe, expect, it } from 'vitest';
import { createMockStore } from '@slowpost/data';

describe('Slowpost data store', () => {
  it('generates a home view with followers', async () => {
    const store = await createMockStore();
    const home = await store.getHomeView('ada');
    expect(home.followers).toHaveLength(2);
    const followerNames = home.followers.map((follower) => follower.username).sort();
    expect(followerNames).toEqual(['elon', 'grace']);
  });

  it('exports follower emails as a string', async () => {
    const store = await createMockStore();
    const exportString = await store.exportFollowers('ada');
    expect(exportString).toContain('grace@slowpost.org');
    expect(exportString).toContain('elon@slowpost.org');
  });

  it('allows toggling close friend status', async () => {
    const store = await createMockStore();
    const updated = await store.setCloseFriend('ada', 'elon', true);
    const elon = updated.followers.find((follower) => follower.username === 'elon');
    expect(elon?.isCloseFriend).toBe(true);
  });

  it('creates a profile view with public and private groups', async () => {
    const store = await createMockStore();
    const profile = await store.getProfileView('ada', 'grace');
    expect(profile.publicGroups).toHaveLength(1);
    expect(profile.sharedPrivateGroups).toHaveLength(1);
  });

  it('provides group member details', async () => {
    const store = await createMockStore();
    const group = await store.getGroupView('future-society');
    expect(group.group.isPrivate).toBe(true);
    expect(group.members.map((member) => member.username)).toContain('grace');
  });

  it('tracks pending follower requests', async () => {
    const store = await createMockStore();
    const followers = await store.getFollowersView('grace');
    expect(followers.pendingFollowers).toHaveLength(1);
    expect(followers.pendingFollowers[0].username).toBe('ada');
  });

  it('creates and verifies login sessions', async () => {
    const store = await createMockStore();
    const session = await store.createLoginSession('test@example.com');
    expect(session.pin).toHaveLength(6);
    const verified = await store.verifyLogin('test@example.com', session.pin);
    expect(verified.verified).toBe(true);
  });
});
