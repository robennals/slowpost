export interface Profile {
  username: string;
  name: string;
  photoUrl: string;
  blurb: string;
  groups: GroupMembership[];
}

export interface GroupMembership {
  groupKey: string;
  role: 'member' | 'owner';
  visibility: 'public' | 'private';
}

export interface Group {
  key: string;
  name: string;
  description: string;
  memberUsernames: string[];
  isPrivate: boolean;
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
  loginToken?: string;
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
  profile: Profile;
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
