import { randomBytes } from 'crypto';
import {
  type Follow,
  type FollowersView,
  type Group,
  type GroupView,
  type HomeFollower,
  type HomeView,
  type LoginSession,
  type Membership,
  type Notification,
  type Profile,
  type ProfileView,
  type SlowpostStore,
  type GroupJoinRequest
} from './types.js';
import {
  generateRequestId,
  getStandardDataset,
  type StandardDataset,
  toProfileViewModel
} from './dataset.js';

export type Query<T> = Record<string, unknown>;

export interface Update<T> {
  $set?: Partial<T>;
}

export interface CursorLike<T> {
  toArray(): Promise<T[]>;
}

export interface CollectionLike<T> {
  find(query: Query<T>): CursorLike<T>;
  findOne(query: Query<T>): Promise<T | null>;
  insertOne(document: T): Promise<void>;
  insertMany(documents: readonly T[]): Promise<void>;
  updateOne(filter: Query<T>, update: Update<T>): Promise<void>;
  deleteMany(filter: Query<T>): Promise<void>;
}

export interface SlowpostCollections {
  profiles: CollectionLike<Profile>;
  groups: CollectionLike<Group>;
  memberships: CollectionLike<Membership>;
  follows: CollectionLike<Follow>;
  loginSessions: CollectionLike<LoginSession>;
  notifications: CollectionLike<Notification>;
  groupJoinRequests: CollectionLike<GroupJoinRequest>;
}

class SlowpostStoreImpl implements SlowpostStore {
  constructor(private readonly collections: SlowpostCollections) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private sanitizeUsername(username: string): string {
    return username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  }

  private sanitizeName(name: string): string {
    return name.trim();
  }

  private async getLoginSession(email: string): Promise<LoginSession | null> {
    const normalizedEmail = this.normalizeEmail(email);
    return this.collections.loginSessions.findOne({ email: normalizedEmail });
  }

  private async isUsernameAvailableInternal(username: string): Promise<boolean> {
    const normalized = this.sanitizeUsername(username);
    if (!normalized) {
      return false;
    }
    const [profile, session] = await Promise.all([
      this.collections.profiles.findOne({ username: normalized }),
      this.collections.loginSessions.findOne({ username: normalized })
    ]);
    return !profile && !session;
  }

  private async generateUsernameSuggestion(seed: string): Promise<string> {
    const normalizedSeed = this.sanitizeUsername(seed) || 'friend';
    let attempt = normalizedSeed;
    let counter = 1;
    while (!(await this.isUsernameAvailableInternal(attempt))) {
      attempt = `${normalizedSeed}${counter}`;
      counter += 1;
    }
    return attempt;
  }

  private async requireProfile(username: string): Promise<Profile> {
    const profile = await this.collections.profiles.findOne({ username });
    if (!profile) {
      throw new Error(`Profile not found: ${username}`);
    }
    return profile;
  }

  private async getGroupsByKeys(groupKeys: string[]): Promise<Map<string, Group>> {
    if (groupKeys.length === 0) {
      return new Map();
    }
    const groups = await this.collections.groups.find({ key: { $in: groupKeys } }).toArray();
    return new Map(groups.map((group) => [group.key, group] as const));
  }

  private async getMemberships(username: string): Promise<Membership[]> {
    return this.collections.memberships.find({ username }).toArray();
  }

  private async buildFollowers(
    username: string,
    status: Follow['status']
  ): Promise<{ profile: Profile; follow: Follow }[]> {
    const follows = await this.collections.follows.find({ following: username, status }).toArray();
    if (follows.length === 0) {
      return [];
    }
    const followerUsernames = follows.map((follow) => follow.follower);
    const followerProfiles = await this.collections.profiles
      .find({ username: { $in: followerUsernames } })
      .toArray();
    const profileMap = new Map(followerProfiles.map((profile) => [profile.username, profile] as const));
    return follows.map((follow) => {
      const profile = profileMap.get(follow.follower);
      if (!profile) {
        throw new Error(`Follower profile missing: ${follow.follower}`);
      }
      return { profile, follow };
    });
  }

  async getHomeView(username: string): Promise<HomeView> {
    const profile = await this.requireProfile(username);
    const followers = await this.buildFollowers(username, 'accepted');
    const homeFollowers: HomeFollower[] = followers.map(({ profile: followerProfile, follow }) => ({
      username: followerProfile.username,
      name: followerProfile.name,
      blurb: followerProfile.blurb,
      photoUrl: followerProfile.photoUrl,
      isCloseFriend: follow.isCloseFriend
    }));
    return { username: profile.username, followers: homeFollowers };
  }

  async exportFollowers(username: string, closeOnly = false): Promise<string> {
    const home = await this.getHomeView(username);
    const filtered = closeOnly
      ? home.followers.filter((follower) => follower.isCloseFriend)
      : home.followers;
    return filtered.map((f) => `${f.name} <${f.username}@slowpost.org>`).join(', ');
  }

  async setCloseFriend(username: string, followerUsername: string, isCloseFriend: boolean): Promise<HomeView> {
    const follow = await this.collections.follows.findOne({
      following: username,
      follower: followerUsername,
      status: 'accepted'
    });
    if (!follow) {
      throw new Error('Follow relationship not found');
    }
    await this.collections.follows.updateOne(
      { following: username, follower: followerUsername, status: 'accepted' },
      { $set: { isCloseFriend } }
    );
    return this.getHomeView(username);
  }

  async getProfileView(username: string, viewer?: string): Promise<ProfileView> {
    const profile = await this.requireProfile(username);
    const memberships = await this.getMemberships(username);
    const groupMap = await this.getGroupsByKeys(memberships.map((membership) => membership.groupKey));
    const profileModel = toProfileViewModel(profile, memberships, Array.from(groupMap.values()));

    const publicGroups = profileModel.groups
      .filter((membership) => membership.visibility === 'public')
      .map((membership) => {
        const group = groupMap.get(membership.groupKey);
        if (!group) {
          throw new Error(`Group not found: ${membership.groupKey}`);
        }
        return group;
      });

    let sharedPrivateGroups: Group[] = [];
    let isFollowing = false;
    const isSelf = viewer === username;
    if (viewer) {
      const viewerMemberships = await this.getMemberships(viewer);
      const viewerGroups = new Set(viewerMemberships.map((membership) => membership.groupKey));
      sharedPrivateGroups = profileModel.groups
        .filter((membership) => membership.visibility === 'private' && viewerGroups.has(membership.groupKey))
        .map((membership) => {
          const group = groupMap.get(membership.groupKey);
          if (!group) {
            throw new Error(`Group not found: ${membership.groupKey}`);
          }
          return group;
        });
      const follow = await this.collections.follows.findOne({ follower: viewer, following: username });
      isFollowing = !!follow;
    }

    return { profile: profileModel, publicGroups, sharedPrivateGroups, isSelf, isFollowing };
  }

  async getGroupView(groupKey: string): Promise<GroupView> {
    const group = await this.collections.groups.findOne({ key: groupKey });
    if (!group) {
      throw new Error(`Group not found: ${groupKey}`);
    }
    const memberships = await this.collections.memberships.find({ groupKey }).toArray();
    const usernames = memberships.map((membership) => membership.username);
    const members = usernames.length
      ? await this.collections.profiles
          .find({ username: { $in: usernames } })
          .toArray()
      : [];
    return { group, members };
  }

  async requestGroupJoin(username: string, groupKey: string): Promise<{ requestId: string }> {
    const group = await this.collections.groups.findOne({ key: groupKey });
    if (!group) {
      throw new Error(`Group not found: ${groupKey}`);
    }
    const membership = await this.collections.memberships.findOne({ groupKey, username });
    if (membership) {
      throw new Error('Already a member');
    }
    const requestId = generateRequestId();
    const request: GroupJoinRequest = {
      requestId,
      username,
      groupKey,
      status: 'pending',
      createdAt: new Date()
    };
    await this.collections.groupJoinRequests.insertOne(request);
    return { requestId };
  }

  async requestFollow(follower: string, following: string): Promise<Follow> {
    const existing = await this.collections.follows.findOne({ follower, following });
    if (existing) {
      return existing;
    }
    const follow: Follow = {
      follower,
      following,
      isCloseFriend: false,
      status: 'pending'
    };
    await this.collections.follows.insertOne(follow);
    return follow;
  }

  async getFollowersView(username: string): Promise<FollowersView> {
    const profile = await this.requireProfile(username);
    const pending = await this.buildFollowers(username, 'pending');
    const pendingFollowers: HomeFollower[] = pending.map(({ profile: followerProfile, follow }) => ({
      username: followerProfile.username,
      name: followerProfile.name,
      blurb: followerProfile.blurb,
      photoUrl: followerProfile.photoUrl,
      isCloseFriend: follow.isCloseFriend
    }));
    return { username: profile.username, pendingFollowers };
  }

  async createLoginSession(email: string, intent: 'login' | 'signup'): Promise<LoginSession> {
    const normalizedEmail = this.normalizeEmail(email);
    const pin = randomBytes(3).toString('hex');
    const existing = await this.getLoginSession(normalizedEmail);

    let username = existing?.username ?? this.sanitizeUsername(normalizedEmail.split('@')[0] ?? '');

    if (intent === 'login') {
      if (!existing || existing.intent !== 'login') {
        throw new Error('Account not found');
      }
      username = this.sanitizeUsername(existing.username);
    } else {
      if (existing && existing.intent === 'login') {
        throw new Error('Account already exists');
      }
      if (!existing) {
        username = await this.generateUsernameSuggestion(normalizedEmail.split('@')[0] ?? 'friend');
      } else {
        username = this.sanitizeUsername(existing.username) ||
          (await this.generateUsernameSuggestion(normalizedEmail.split('@')[0] ?? 'friend'));
      }
    }

    const sanitizedUsername = this.sanitizeUsername(username);
    if (!sanitizedUsername) {
      throw new Error('Unable to generate username');
    }

    const session: LoginSession = {
      email: normalizedEmail,
      username: sanitizedUsername,
      pin,
      verified: false,
      intent
    };

    if (existing) {
      await this.collections.loginSessions.updateOne(
        { email: normalizedEmail },
        { $set: { pin, verified: false, intent, username: sanitizedUsername } }
      );
    } else {
      await this.collections.loginSessions.insertOne(session);
    }

    return session;
  }

  async verifyLogin(email: string, pin: string): Promise<LoginSession> {
    const normalizedEmail = this.normalizeEmail(email);
    const session = await this.getLoginSession(normalizedEmail);
    if (!session || session.pin !== pin) {
      throw new Error('Invalid login');
    }
    await this.collections.loginSessions.updateOne({ email: normalizedEmail }, { $set: { verified: true } });
    return { ...session, verified: true };
  }

  async forceVerifyLogin(email: string, intent: 'login' | 'signup' = 'login'): Promise<LoginSession> {
    const session = await this.createLoginSession(email, intent);
    await this.collections.loginSessions.updateOne(
      { email: session.email },
      { $set: { verified: true, intent } }
    );
    return { ...session, verified: true, intent };
  }

  async completeSignup(email: string, username: string, name: string): Promise<LoginSession> {
    const normalizedEmail = this.normalizeEmail(email);
    const sanitizedUsername = this.sanitizeUsername(username);
    const sanitizedName = this.sanitizeName(name);
    if (!sanitizedUsername) {
      throw new Error('Username is required');
    }
    if (!sanitizedName) {
      throw new Error('Name is required');
    }
    if (!(await this.isUsernameAvailableInternal(sanitizedUsername))) {
      throw new Error('Username is already taken');
    }
    const session = await this.getLoginSession(normalizedEmail);
    if (!session || session.intent !== 'signup' || !session.verified) {
      throw new Error('Signup session is not verified');
    }

    const profile: Profile = {
      username: sanitizedUsername,
      name: sanitizedName,
      photoUrl: '',
      blurb: ''
    };

    await Promise.all([
      this.collections.profiles.insertOne(profile),
      this.collections.loginSessions.updateOne(
        { email: normalizedEmail },
        { $set: { username: sanitizedUsername, intent: 'login' } }
      )
    ]);

    return { ...session, username: sanitizedUsername, intent: 'login' };
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    return this.isUsernameAvailableInternal(username);
  }
}

export function createSlowpostStore(collections: SlowpostCollections): SlowpostStore {
  return new SlowpostStoreImpl(collections);
}

export async function seedCollections(
  collections: SlowpostCollections,
  dataset: StandardDataset = getStandardDataset()
): Promise<void> {
  await Promise.all([
    collections.profiles.deleteMany({}),
    collections.groups.deleteMany({}),
    collections.memberships.deleteMany({}),
    collections.follows.deleteMany({}),
    collections.loginSessions.deleteMany({}),
    collections.notifications.deleteMany({}),
    collections.groupJoinRequests.deleteMany({})
  ]);

  if (dataset.profiles.length) {
    await collections.profiles.insertMany(dataset.profiles);
  }
  if (dataset.groups.length) {
    await collections.groups.insertMany(dataset.groups);
  }
  if (dataset.memberships.length) {
    await collections.memberships.insertMany(dataset.memberships);
  }
  if (dataset.follows.length) {
    await collections.follows.insertMany(dataset.follows);
  }
  if (dataset.loginSessions.length) {
    await collections.loginSessions.insertMany(dataset.loginSessions);
  }
  if (dataset.notifications.length) {
    await collections.notifications.insertMany(dataset.notifications);
  }
  if (dataset.groupJoinRequests.length) {
    await collections.groupJoinRequests.insertMany(dataset.groupJoinRequests);
  }
}
