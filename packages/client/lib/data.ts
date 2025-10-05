export interface HomeFollower {
  username: string;
  name: string;
  blurb: string;
  photoUrl: string;
  isCloseFriend: boolean;
}

export interface Profile {
  username: string;
  name: string;
  blurb: string;
  photoUrl: string;
  publicGroups: Array<{ key: string; name: string }>;
  sharedPrivateGroups: Array<{ key: string; name: string }>;
  isSelf: boolean;
  isFollowing: boolean;
}

export interface Group {
  key: string;
  name: string;
  description: string;
  members: Array<{ username: string; name: string }>;
  isPrivate: boolean;
}

export interface FollowersView {
  pendingFollowers: HomeFollower[];
}

export interface HomeView {
  followers: HomeFollower[];
}

export const sampleHome: HomeView = {
  followers: [
    {
      username: 'grace',
      name: 'Grace Hopper',
      blurb: 'Debugger of compilers and letters alike.',
      photoUrl: 'https://example.com/grace.jpg',
      isCloseFriend: true
    },
    {
      username: 'elon',
      name: 'Elon Slow',
      blurb: 'I only ship rockets once a year.',
      photoUrl: 'https://example.com/elon.jpg',
      isCloseFriend: false
    }
  ]
};

export const sampleProfile: Profile = {
  username: 'ada',
  name: 'Ada Lovelace',
  blurb: 'Visionary of analytical engines and slow thoughtful posts.',
  photoUrl: 'https://example.com/ada.jpg',
  publicGroups: [
    { key: 'fibonacci-fans', name: 'Fibonacci Fans' }
  ],
  sharedPrivateGroups: [
    { key: 'future-society', name: 'Future Society' }
  ],
  isSelf: true,
  isFollowing: false
};

export const sampleGroup: Group = {
  key: 'future-society',
  name: 'Future Society',
  description: 'Private think tank for the future of mail.',
  members: [
    { username: 'ada', name: 'Ada Lovelace' },
    { username: 'grace', name: 'Grace Hopper' }
  ],
  isPrivate: true
};

export const sampleFollowers: FollowersView = {
  pendingFollowers: [
    {
      username: 'ada',
      name: 'Ada Lovelace',
      blurb: 'Visionary of analytical engines and slow thoughtful posts.',
      photoUrl: 'https://example.com/ada.jpg',
      isCloseFriend: true
    }
  ]
};
