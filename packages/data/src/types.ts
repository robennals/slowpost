export interface Profile {
  username: string;
  name: string;
  photoUrl: string;
  blurb: string;
}

export interface Group {
  key: string;
  name: string;
  description: string;
  isPrivate: boolean;
}

export interface Membership {
  groupKey: string;
  username: string;
  role: 'member' | 'owner';
}

export interface Follow {
  follower: string;
  following: string;
  isCloseFriend: boolean;
  status: 'pending' | 'accepted';
}

export interface LoginSession {
  email: string;
  username: string;
  pin: string;
  verified: boolean;
}

export interface Notification {
  username: string;
  message: string;
  createdAt: Date;
}

export interface GroupMembershipView {
  groupKey: string;
  role: 'member' | 'owner';
  visibility: 'public' | 'private';
}

export interface ProfileViewModel extends Profile {
  groups: GroupMembershipView[];
}

export interface HomeFollower {
  username: string;
  name: string;
  blurb: string;
  photoUrl: string;
  isCloseFriend: boolean;
}

export interface HomeView {
  username: string;
  followers: HomeFollower[];
}

export interface ProfileView {
  profile: ProfileViewModel;
  publicGroups: Group[];
  sharedPrivateGroups: Group[];
  isSelf: boolean;
  isFollowing: boolean;
}

export interface GroupView {
  group: Group;
  members: Profile[];
}

export interface FollowersView {
  username: string;
  pendingFollowers: HomeFollower[];
}

export interface SlowpostStore {
  getHomeView(username: string): Promise<HomeView>;
  exportFollowers(username: string, closeOnly?: boolean): Promise<string>;
  setCloseFriend(username: string, followerUsername: string, isCloseFriend: boolean): Promise<HomeView>;
  getProfileView(username: string, viewer?: string): Promise<ProfileView>;
  getGroupView(groupKey: string): Promise<GroupView>;
  requestGroupJoin(username: string, groupKey: string): Promise<{ requestId: string }>;
  requestFollow(follower: string, following: string): Promise<Follow>;
  getFollowersView(username: string): Promise<FollowersView>;
  createLoginSession(email: string): Promise<LoginSession>;
  verifyLogin(email: string, pin: string): Promise<LoginSession>;
}
