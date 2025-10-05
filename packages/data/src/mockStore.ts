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
  type Profile,
  type ProfileView,
  type ProfileViewModel,
  type SlowpostStore
} from './types.js';
import { generateRequestId, getStandardDataset, toProfileViewModel } from './dataset.js';

type Optional<T> = T | undefined;

interface GroupJoinRequest {
  requestId: string;
  username: string;
  groupKey: string;
}

export interface MockStoreOptions {
  dataset?: ReturnType<typeof getStandardDataset>;
}

export class MockStore implements SlowpostStore {
  private profiles = new Map<string, Profile>();
  private groups = new Map<string, Group>();
  private memberships: Membership[] = [];
  private follows: Follow[] = [];
  private sessions: LoginSession[] = [];
  private joinRequests: GroupJoinRequest[] = [];

  constructor(options: MockStoreOptions = {}) {
    const dataset = options.dataset ?? getStandardDataset();
    for (const profile of dataset.profiles) {
      this.profiles.set(profile.username, structuredClone(profile));
    }
    for (const group of dataset.groups) {
      this.groups.set(group.key, structuredClone(group));
    }
    this.memberships = dataset.memberships.map((membership) => ({ ...membership }));
    this.follows = dataset.follows.map((follow) => ({ ...follow }));
    this.sessions = dataset.loginSessions.map((session) => ({ ...session }));
  }

  private getProfile(username: string): Optional<Profile> {
    return this.profiles.get(username);
  }

  private getGroup(groupKey: string): Optional<Group> {
    return this.groups.get(groupKey);
  }

  private listFollowers(username: string, status?: Follow['status']): Follow[] {
    return this.follows.filter((follow) => {
      return follow.following === username && (!status || follow.status === status);
    });
  }

  private listFollowing(username: string): Follow[] {
    return this.follows.filter((follow) => follow.follower === username);
  }

  private getMembershipsForUser(username: string): Membership[] {
    return this.memberships.filter((membership) => membership.username === username);
  }

  private toProfileViewModel(profile: Profile): ProfileViewModel {
    return toProfileViewModel(profile, this.memberships, Array.from(this.groups.values()));
  }

  async getHomeView(username: string): Promise<HomeView> {
    const profile = this.getProfile(username);
    if (!profile) {
      throw new Error(`Profile not found: ${username}`);
    }
    const acceptedFollows = this.listFollowers(username, 'accepted');
    const followers: HomeFollower[] = acceptedFollows.map((follow) => {
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

  async exportFollowers(username: string, closeOnly = false): Promise<string> {
    const home = await this.getHomeView(username);
    const filtered = closeOnly
      ? home.followers.filter((follower) => follower.isCloseFriend)
      : home.followers;
    return filtered.map((f) => `${f.name} <${f.username}@slowpost.org>`).join(', ');
  }

  async setCloseFriend(username: string, followerUsername: string, isCloseFriend: boolean): Promise<HomeView> {
    const follow = this.follows.find((record) => {
      return record.following === username && record.follower === followerUsername && record.status === 'accepted';
    });
    if (!follow) {
      throw new Error('Follow relationship not found');
    }
    follow.isCloseFriend = isCloseFriend;
    return this.getHomeView(username);
  }

  async getProfileView(username: string, viewer?: string): Promise<ProfileView> {
    const profile = this.getProfile(username);
    if (!profile) {
      throw new Error(`Profile not found: ${username}`);
    }
    const profileModel = this.toProfileViewModel(profile);
    const publicGroups = profileModel.groups
      .filter((membership) => membership.visibility === 'public')
      .map((membership) => {
        const group = this.getGroup(membership.groupKey);
        if (!group) {
          throw new Error(`Group not found: ${membership.groupKey}`);
        }
        return group;
      });
    const sharedPrivateGroups = viewer
      ? this.getMembershipsForUser(viewer)
          .map((membership) => membership.groupKey)
          .filter((groupKey) => {
            return profileModel.groups.some((membership) => membership.groupKey === groupKey && membership.visibility === 'private');
          })
          .map((groupKey) => this.getGroup(groupKey))
          .filter((group): group is Group => !!group)
      : [];
    const isSelf = viewer === username;
    const isFollowing = viewer
      ? this.listFollowing(viewer).some((record) => record.following === username)
      : false;
    return {
      profile: profileModel,
      publicGroups,
      sharedPrivateGroups,
      isSelf,
      isFollowing
    };
  }

  async getGroupView(groupKey: string): Promise<GroupView> {
    const group = this.getGroup(groupKey);
    if (!group) {
      throw new Error(`Group not found: ${groupKey}`);
    }
    const members = this.memberships
      .filter((membership) => membership.groupKey === groupKey)
      .map((membership) => this.getProfile(membership.username))
      .filter((profile): profile is Profile => !!profile);
    return { group, members };
  }

  async requestGroupJoin(username: string, groupKey: string): Promise<{ requestId: string }> {
    const group = this.getGroup(groupKey);
    if (!group) {
      throw new Error(`Group not found: ${groupKey}`);
    }
    if (this.memberships.some((membership) => membership.groupKey === groupKey && membership.username === username)) {
      throw new Error('Already a member');
    }
    const requestId = generateRequestId();
    this.joinRequests.push({ requestId, username, groupKey });
    return { requestId };
  }

  async requestFollow(follower: string, following: string): Promise<Follow> {
    const existing = this.follows.find((record) => record.follower === follower && record.following === following);
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

  async getFollowersView(username: string): Promise<FollowersView> {
    const profile = this.getProfile(username);
    if (!profile) {
      throw new Error(`Profile not found: ${username}`);
    }
    const pending = this.listFollowers(username, 'pending');
    const pendingFollowers = pending.map((follow): HomeFollower => {
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
    return { username: profile.username, pendingFollowers };
  }

  async createLoginSession(email: string): Promise<LoginSession> {
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

  async verifyLogin(email: string, pin: string): Promise<LoginSession> {
    const session = this.sessions.find((record) => record.email === email);
    if (!session || session.pin !== pin) {
      throw new Error('Invalid login');
    }
    session.verified = true;
    return session;
  }
}

export async function createMockStore(options: MockStoreOptions = {}): Promise<SlowpostStore> {
  return new MockStore(options);
}
