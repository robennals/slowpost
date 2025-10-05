import { randomBytes } from 'crypto';
import {
  Follow,
  FollowersView,
  Group,
  GroupView,
  HomeFollower,
  HomeView,
  LoginSession,
  Profile,
  ProfileView
} from './types.js';

type Optional<T> = T | undefined;

const SAMPLE_PROFILES: Profile[] = [
  {
    username: 'ada',
    name: 'Ada Lovelace',
    photoUrl: 'https://example.com/ada.jpg',
    blurb: 'Visionary of analytical engines and slow thoughtful posts.',
    groups: [
      { groupKey: 'fibonacci-fans', role: 'owner', visibility: 'public' },
      { groupKey: 'future-society', role: 'member', visibility: 'private' }
    ]
  },
  {
    username: 'grace',
    name: 'Grace Hopper',
    photoUrl: 'https://example.com/grace.jpg',
    blurb: 'Debugger of compilers and letters alike.',
    groups: [
      { groupKey: 'future-society', role: 'member', visibility: 'private' }
    ]
  },
  {
    username: 'elon',
    name: 'Elon Slow',
    photoUrl: 'https://example.com/elon.jpg',
    blurb: 'I only ship rockets once a year.',
    groups: [
      { groupKey: 'slow-adventurers', role: 'member', visibility: 'public' }
    ]
  }
];

const SAMPLE_GROUPS: Group[] = [
  {
    key: 'fibonacci-fans',
    name: 'Fibonacci Fans',
    description: 'Discuss the slow growth of mathematical sequences.',
    isPrivate: false,
    memberUsernames: ['ada']
  },
  {
    key: 'future-society',
    name: 'Future Society',
    description: 'Private think tank for the future of mail.',
    isPrivate: true,
    memberUsernames: ['ada', 'grace']
  },
  {
    key: 'slow-adventurers',
    name: 'Slow Adventurers',
    description: 'Plan one expedition per decade.',
    isPrivate: false,
    memberUsernames: ['elon']
  }
];

const SAMPLE_FOLLOWS: Follow[] = [
  { follower: 'grace', following: 'ada', isCloseFriend: true, status: 'accepted' },
  { follower: 'elon', following: 'ada', isCloseFriend: false, status: 'accepted' },
  { follower: 'ada', following: 'grace', isCloseFriend: true, status: 'pending' }
];

const SAMPLE_SESSIONS: LoginSession[] = [
  { email: 'ada@example.com', username: 'ada', pin: '123456', verified: true },
  { email: 'grace@example.com', username: 'grace', pin: '654321', verified: true }
];

export class InMemoryStore {
  private profiles = new Map<string, Profile>();
  private groups = new Map<string, Group>();
  private follows: Follow[] = [];
  private sessions: LoginSession[] = [];

  constructor() {
    for (const profile of SAMPLE_PROFILES) {
      this.profiles.set(profile.username, structuredClone(profile));
    }
    for (const group of SAMPLE_GROUPS) {
      this.groups.set(group.key, structuredClone(group));
    }
    this.follows = SAMPLE_FOLLOWS.map((follow) => ({ ...follow }));
    this.sessions = SAMPLE_SESSIONS.map((session) => ({ ...session }));
  }

  getProfile(username: string): Optional<Profile> {
    return this.profiles.get(username);
  }

  updateProfilePhoto(username: string, photoUrl: string): Profile {
    const profile = this.getProfile(username);
    if (!profile) {
      throw new Error(`Profile not found: ${username}`);
    }
    profile.photoUrl = photoUrl;
    return profile;
  }

  getGroup(groupKey: string): Optional<Group> {
    return this.groups.get(groupKey);
  }

  listFollowers(username: string): Follow[] {
    return this.follows.filter((follow) => follow.following === username);
  }

  listFollowing(username: string): Follow[] {
    return this.follows.filter((follow) => follow.follower === username);
  }

  getHomeView(username: string): HomeView {
    const profile = this.getProfile(username);
    if (!profile) {
      throw new Error(`Profile not found: ${username}`);
    }
    const followers = this.listFollowers(username)
      .filter((follow) => follow.status === 'accepted')
      .map((follow): HomeFollower => {
        const followerProfile = this.getProfile(follow.follower);
        if (!followerProfile) {
          throw new Error(`Follower profile missing: ${follow.follower}`);
        }
        return {
          username: followerProfile.username,
          name: followerProfile.name,
          blurb: followerProfile.blurb,
          photoUrl: followerProfile.photoUrl,
          isCloseFriend: follow.isCloseFriend
        };
      });
    return { username: profile.username, followers };
  }

  exportFollowers(username: string, closeOnly = false): string {
    const home = this.getHomeView(username);
    const filtered = closeOnly
      ? home.followers.filter((follower) => follower.isCloseFriend)
      : home.followers;
    return filtered.map((f) => `${f.name} <${f.username}@slowpost.org>`).join(', ');
  }

  setCloseFriend(username: string, followerUsername: string, isCloseFriend: boolean): HomeView {
    const follow = this.follows.find(
      (record) =>
        record.following === username &&
        record.follower === followerUsername &&
        record.status === 'accepted'
    );
    if (!follow) {
      throw new Error('Follow relationship not found');
    }
    follow.isCloseFriend = isCloseFriend;
    return this.getHomeView(username);
  }

  getProfileView(username: string, viewer?: string): ProfileView {
    const profile = this.getProfile(username);
    if (!profile) {
      throw new Error(`Profile not found: ${username}`);
    }
    const viewerProfile = viewer ? this.getProfile(viewer) : undefined;
    const publicGroups = profile.groups
      .filter((membership) => membership.visibility === 'public')
      .map((membership) => {
        const group = this.getGroup(membership.groupKey);
        if (!group) {
          throw new Error(`Group not found: ${membership.groupKey}`);
        }
        return group;
      });
    const sharedPrivateGroups = viewerProfile
      ? profile.groups
          .filter((membership) => membership.visibility === 'private')
          .map((membership) => this.getGroup(membership.groupKey))
          .filter((group): group is Group => !!group && group.memberUsernames.includes(viewerProfile.username))
      : [];
    const isSelf = viewer === username;
    const isFollowing = !!this.follows.find(
      (record) => record.follower === (viewer ?? '') && record.following === username
    );
    return {
      profile,
      publicGroups,
      sharedPrivateGroups,
      isSelf,
      isFollowing
    };
  }

  getGroupView(groupKey: string): GroupView {
    const group = this.getGroup(groupKey);
    if (!group) {
      throw new Error(`Group not found: ${groupKey}`);
    }
    const members = group.memberUsernames
      .map((username) => this.getProfile(username))
      .filter((profile): profile is Profile => !!profile);
    return {
      group,
      members
    };
  }

  requestGroupJoin(username: string, groupKey: string): { requestId: string } {
    const group = this.getGroup(groupKey);
    if (!group) {
      throw new Error(`Group not found: ${groupKey}`);
    }
    if (group.memberUsernames.includes(username)) {
      throw new Error('Already a member');
    }
    const requestId = randomBytes(4).toString('hex');
    return { requestId };
  }

  requestFollow(follower: string, following: string): Follow {
    const existing = this.follows.find(
      (record) => record.follower === follower && record.following === following
    );
    if (existing) {
      return existing;
    }
    const follow: Follow = {
      follower,
      following,
      isCloseFriend: false,
      status: 'pending'
    };
    this.follows.push(follow);
    return follow;
  }

  getFollowersView(username: string): FollowersView {
    const profile = this.getProfile(username);
    if (!profile) {
      throw new Error(`Profile not found: ${username}`);
    }
    const pendingFollowers = this.listFollowers(username)
      .filter((follow) => follow.status === 'pending')
      .map((follow): HomeFollower => {
        const followerProfile = this.getProfile(follow.follower);
        if (!followerProfile) {
          throw new Error(`Follower profile missing: ${follow.follower}`);
        }
        return {
          username: followerProfile.username,
          name: followerProfile.name,
          blurb: followerProfile.blurb,
          photoUrl: followerProfile.photoUrl,
          isCloseFriend: follow.isCloseFriend
        };
      });
    return {
      username: profile.username,
      pendingFollowers
    };
  }

  createLoginSession(email: string): LoginSession {
    const pin = randomBytes(3).toString('hex');
    const existing = this.sessions.find((session) => session.email === email);
    if (existing) {
      existing.pin = pin;
      existing.verified = false;
      return existing;
    }
    const username = email.split('@')[0];
    const session: LoginSession = { email, username, pin, verified: false };
    this.sessions.push(session);
    return session;
  }

  verifyLogin(email: string, pin: string): LoginSession {
    const session = this.sessions.find((record) => record.email === email);
    if (!session || session.pin !== pin) {
      throw new Error('Invalid login');
    }
    session.verified = true;
    return session;
  }

  forceVerifyLogin(email: string): LoginSession {
    const session = this.sessions.find((record) => record.email === email);
    if (session) {
      session.verified = true;
      return session;
    }
    const newSession = this.createLoginSession(email);
    newSession.verified = true;
    return newSession;
  }
}

export const store = new InMemoryStore();
