import { randomBytes } from 'crypto';
import { MongoClient, type Db, type Collection, ObjectId } from 'mongodb';
import {
  type Follow,
  type FollowersView,
  type Group,
  type GroupView,
  type HomeFollower,
  type HomeView,
  type LoginSession,
  type Membership,
  type Profile,
  type ProfileView,
  type SlowpostStore,
  type Notification
} from './types.js';
import {
  generateRequestId,
  getStandardDataset,
  type StandardDataset,
  toProfileViewModel
} from './dataset.js';

interface GroupJoinRequestDoc {
  _id: ObjectId;
  requestId: string;
  username: string;
  groupKey: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

interface MongoCollections {
  profiles: Collection<Profile>;
  groups: Collection<Group>;
  memberships: Collection<Membership>;
  follows: Collection<Follow>;
  loginSessions: Collection<LoginSession>;
  notifications: Collection<Notification>;
  groupJoinRequests: Collection<GroupJoinRequestDoc>;
}

class MongoStore implements SlowpostStore {
  constructor(private readonly collections: MongoCollections) {}

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
    const groups = await this.collections.groups
      .find({ key: { $in: groupKeys } })
      .toArray();
    return new Map(groups.map((group) => [group.key, group] as const));
  }

  private async getMemberships(username: string): Promise<Membership[]> {
    return this.collections.memberships.find({ username }).toArray();
  }

  private async buildFollowers(
    username: string,
    status: Follow['status']
  ): Promise<{ profile: Profile; follow: Follow }[]> {
    const follows = await this.collections.follows
      .find({ following: username, status })
      .toArray();
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
    await this.collections.groupJoinRequests.insertOne({
      _id: new ObjectId(),
      requestId,
      username,
      groupKey,
      status: 'pending',
      createdAt: new Date()
    });
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

  async createLoginSession(email: string): Promise<LoginSession> {
    const pin = randomBytes(3).toString('hex');
    const existing = await this.collections.loginSessions.findOne({ email });
    if (existing) {
      await this.collections.loginSessions.updateOne({ email }, { $set: { pin, verified: false } });
      return { ...existing, pin, verified: false };
    }
    const username = email.split('@')[0];
    const session: LoginSession = { email, username, pin, verified: false };
    await this.collections.loginSessions.insertOne(session);
    return session;
  }

  async verifyLogin(email: string, pin: string): Promise<LoginSession> {
    const session = await this.collections.loginSessions.findOne({ email });
    if (!session || session.pin !== pin) {
      throw new Error('Invalid login');
    }
    await this.collections.loginSessions.updateOne({ email }, { $set: { verified: true } });
    return { ...session, verified: true };
  }
}

export interface MongoStoreConnection {
  client: MongoClient;
  db: Db;
  store: SlowpostStore;
  close(): Promise<void>;
}

export async function connectToMongoStore(options: {
  uri: string;
  dbName: string;
}): Promise<MongoStoreConnection> {
  const client = new MongoClient(options.uri);
  await client.connect();
  const db = client.db(options.dbName);
  const collections: MongoCollections = {
    profiles: db.collection<Profile>('profiles'),
    groups: db.collection<Group>('groups'),
    memberships: db.collection<Membership>('memberships'),
    follows: db.collection<Follow>('follows'),
    loginSessions: db.collection<LoginSession>('loginSessions'),
    notifications: db.collection<Notification>('notifications'),
    groupJoinRequests: db.collection<GroupJoinRequestDoc>('groupJoinRequests')
  };
  const store = new MongoStore(collections);
  return {
    client,
    db,
    store,
    close: async () => {
      await client.close();
    }
  };
}

export async function seedDataset(db: Db, dataset: StandardDataset = getStandardDataset()): Promise<void> {
  const operations = [
    db.collection('profiles').deleteMany({}),
    db.collection('groups').deleteMany({}),
    db.collection('memberships').deleteMany({}),
    db.collection('follows').deleteMany({}),
    db.collection('loginSessions').deleteMany({}),
    db.collection('notifications').deleteMany({}),
    db.collection('groupJoinRequests').deleteMany({})
  ];
  await Promise.all(operations);
  if (dataset.profiles.length) {
    await db.collection<Profile>('profiles').insertMany(dataset.profiles);
  }
  if (dataset.groups.length) {
    await db.collection<Group>('groups').insertMany(dataset.groups);
  }
  if (dataset.memberships.length) {
    await db.collection<Membership>('memberships').insertMany(dataset.memberships);
  }
  if (dataset.follows.length) {
    await db.collection<Follow>('follows').insertMany(dataset.follows);
  }
  if (dataset.loginSessions.length) {
    await db.collection<LoginSession>('loginSessions').insertMany(dataset.loginSessions);
  }
  if (dataset.notifications.length) {
    await db.collection<Notification>('notifications').insertMany(dataset.notifications);
  }
}

export interface InMemoryMongoOptions {
  dbName?: string;
  seed?: boolean;
  dataset?: StandardDataset;
}

export async function startInMemoryMongo(options: InMemoryMongoOptions = {}): Promise<
  MongoStoreConnection & {
    stop(): Promise<void>;
  }
> {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const memory = await MongoMemoryServer.create();
  const dbName = options.dbName ?? 'slowpost-dev';
  const connection = await connectToMongoStore({ uri: memory.getUri(), dbName });
  if (options.seed !== false) {
    await seedDataset(connection.db, options.dataset ?? getStandardDataset());
  }
  return {
    ...connection,
    stop: async () => {
      await connection.close();
      await memory.stop();
    }
  };
}
