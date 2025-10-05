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
  { email: 'ada@example.com', username: 'ada', pin: '123456', verified: true, intent: 'login' },
  { email: 'grace@example.com', username: 'grace', pin: '654321', verified: true, intent: 'login' }
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class InMemoryStore {
  private profiles = new Map<string, Profile>();
  private groups = new Map<string, Group>();
  private follows: Follow[] = [];
  private sessions: LoginSession[] = [];
  private emailDirectory = new Map<string, string>();

  constructor() {
    for (const profile of SAMPLE_PROFILES) {
      const clone = structuredClone(profile);
      clone.username = clone.username.toLowerCase();
      this.profiles.set(clone.username, clone);
    }
    for (const group of SAMPLE_GROUPS) {
      this.groups.set(group.key, structuredClone(group));
    }
    this.follows = SAMPLE_FOLLOWS.map((follow) => ({ ...follow }));
    this.sessions = SAMPLE_SESSIONS.map((session) => ({ ...session }));
    for (const session of this.sessions) {
      this.emailDirectory.set(normalizeEmail(session.email), session.username.toLowerCase());
    }
  }

  getProfile(username: string): Optional<Profile> {
    return this.profiles.get(username.toLowerCase());
  }

  getGroup(groupKey: string): Optional<Group> {
    return this.groups.get(groupKey);
  }

  listFollowers(username: string): Follow[] {
    const normalized = username.toLowerCase();
    return this.follows.filter((follow) => follow.following === normalized);
  }

  listFollowing(username: string): Follow[] {
    const normalized = username.toLowerCase();
    return this.follows.filter((follow) => follow.follower === normalized);
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
    const normalizedUsername = username.toLowerCase();
    const normalizedFollower = followerUsername.toLowerCase();
    const follow = this.follows.find(
      (record) =>
        record.following === normalizedUsername &&
        record.follower === normalizedFollower &&
        record.status === 'accepted'
    );
    if (!follow) {
      throw new Error('Follow relationship not found');
    }
    follow.isCloseFriend = isCloseFriend;
    return this.getHomeView(normalizedUsername);
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
    const normalizedViewer = viewer?.toLowerCase();
    const normalizedUsername = username.toLowerCase();
    const isSelf = normalizedViewer === normalizedUsername;
    const isFollowing = !!this.follows.find(
      (record) => record.follower === (normalizedViewer ?? '') && record.following === normalizedUsername
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
    const normalizedUsername = username.toLowerCase();
    if (group.memberUsernames.includes(normalizedUsername)) {
      throw new Error('Already a member');
    }
    const requestId = randomBytes(4).toString('hex');
    return { requestId };
  }

  requestFollow(follower: string, following: string): Follow {
    const normalizedFollower = follower.toLowerCase();
    const normalizedFollowing = following.toLowerCase();
    const existing = this.follows.find(
      (record) => record.follower === normalizedFollower && record.following === normalizedFollowing
    );
    if (existing) {
      return existing;
    }
    const follow: Follow = {
      follower: normalizedFollower,
      following: normalizedFollowing,
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

  private generateUsernameSuggestion(seed: string): string {
    const normalizedSeed = seed.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'friend';
    let attempt = normalizedSeed;
    let counter = 1;
    while (!this.isUsernameAvailable(attempt)) {
      attempt = `${normalizedSeed}${counter}`;
      counter += 1;
    }
    return attempt;
  }

  isUsernameAvailable(username: string): boolean {
    return !this.profiles.has(username.toLowerCase()) && !this.emailDirectoryHasUsername(username.toLowerCase());
  }

  private emailDirectoryHasUsername(username: string): boolean {
    for (const mapped of this.emailDirectory.values()) {
      if (mapped.toLowerCase() === username.toLowerCase()) {
        return true;
      }
    }
    return false;
  }

  createLoginSession(email: string, intent: 'login' | 'signup'): LoginSession {
    const normalizedEmail = normalizeEmail(email);
    const pin = randomBytes(3).toString('hex');
    const existing = this.sessions.find((session) => normalizeEmail(session.email) === normalizedEmail);
    let usernameSuggestion: string;

    if (intent === 'login') {
      const knownUsername = this.emailDirectory.get(normalizedEmail);
      if (!knownUsername) {
        throw new Error('Account not found');
      }
      usernameSuggestion = knownUsername;
    } else {
      if (this.emailDirectory.has(normalizedEmail)) {
        throw new Error('Account already exists');
      }
      usernameSuggestion = this.generateUsernameSuggestion(normalizedEmail.split('@')[0] ?? 'friend');
    }

    if (existing) {
      existing.email = normalizedEmail;
      existing.pin = pin;
      existing.verified = false;
      existing.loginToken = undefined;
      existing.intent = intent;
      existing.username = usernameSuggestion;
      return existing;
    }

    const session: LoginSession = {
      email: normalizedEmail,
      username: usernameSuggestion,
      pin,
      verified: false,
      intent
    };
    this.sessions.push(session);
    return session;
  }

  verifyLogin(email: string, pin: string): LoginSession {
    const normalizedEmail = normalizeEmail(email);
    const session = this.sessions.find((record) => normalizeEmail(record.email) === normalizedEmail);
    if (!session || session.pin !== pin) {
      throw new Error('Invalid login');
    }
    session.verified = true;
    return session;
  }

  forceVerifyLogin(email: string, intent: 'login' | 'signup' = 'login'): LoginSession {
    const normalizedEmail = normalizeEmail(email);
    const session = this.sessions.find((record) => normalizeEmail(record.email) === normalizedEmail);
    if (session) {
      session.intent = intent;
      session.verified = true;
      if (intent === 'login') {
        const knownUsername = this.emailDirectory.get(normalizedEmail);
        if (knownUsername) {
          session.username = knownUsername;
        }
      }
      return session;
    }
    const newSession = this.createLoginSession(normalizedEmail, intent);
    newSession.verified = true;
    return newSession;
  }

  completeSignup(email: string, username: string, name: string): LoginSession {
    const normalizedEmail = normalizeEmail(email);
    const normalizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!normalizedUsername) {
      throw new Error('Username is required');
    }
    if (!name.trim()) {
      throw new Error('Name is required');
    }
    if (!this.isUsernameAvailable(normalizedUsername)) {
      throw new Error('Username is already taken');
    }
    const session = this.sessions.find((record) => normalizeEmail(record.email) === normalizedEmail);
    if (!session || session.intent !== 'signup' || !session.verified) {
      throw new Error('Signup session is not verified');
    }

    const profile: Profile = {
      username: normalizedUsername,
      name: name.trim(),
      photoUrl: '',
      blurb: '',
      groups: []
    };

    this.profiles.set(profile.username, profile);
    this.emailDirectory.set(normalizedEmail, profile.username);
    session.username = profile.username;
    session.intent = 'login';
    return session;
  }

  issueLoginToken(session: LoginSession): string {
    const token = randomBytes(16).toString('hex');
    session.loginToken = token;
    return token;
  }

  findSessionByToken(token: string): Optional<LoginSession> {
    return this.sessions.find((record) => record.loginToken === token && record.verified);
  }
}

export const store = new InMemoryStore();
