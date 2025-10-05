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

  it('creates and verifies login sessions', () => {
    const session = store.createLoginSession('test@example.com');
    expect(session.pin).toHaveLength(6);
    const verified = store.verifyLogin('test@example.com', session.pin);
    expect(verified.verified).toBe(true);
  });
});
