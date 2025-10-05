import { randomBytes } from 'crypto';
import type {
  Follow,
  Group,
  LoginSession,
  Membership,
  Notification,
  Profile,
  ProfileViewModel
} from './types.js';

export interface StandardDataset {
  profiles: Profile[];
  groups: Group[];
  memberships: Membership[];
  follows: Follow[];
  loginSessions: LoginSession[];
  notifications: Notification[];
}

export function getStandardDataset(): StandardDataset {
  const profiles: Profile[] = [
    {
      username: 'ada',
      name: 'Ada Lovelace',
      photoUrl: 'https://example.com/ada.jpg',
      blurb: 'Visionary of analytical engines and slow thoughtful posts.'
    },
    {
      username: 'grace',
      name: 'Grace Hopper',
      photoUrl: 'https://example.com/grace.jpg',
      blurb: 'Debugger of compilers and letters alike.'
    },
    {
      username: 'elon',
      name: 'Elon Slow',
      photoUrl: 'https://example.com/elon.jpg',
      blurb: 'I only ship rockets once a year.'
    }
  ];

  const groups: Group[] = [
    {
      key: 'fibonacci-fans',
      name: 'Fibonacci Fans',
      description: 'Discuss the slow growth of mathematical sequences.',
      isPrivate: false
    },
    {
      key: 'future-society',
      name: 'Future Society',
      description: 'Private think tank for the future of mail.',
      isPrivate: true
    },
    {
      key: 'slow-adventurers',
      name: 'Slow Adventurers',
      description: 'Plan one expedition per decade.',
      isPrivate: false
    }
  ];

  const memberships: Membership[] = [
    { username: 'ada', groupKey: 'fibonacci-fans', role: 'owner' },
    { username: 'ada', groupKey: 'future-society', role: 'member' },
    { username: 'grace', groupKey: 'future-society', role: 'member' },
    { username: 'elon', groupKey: 'slow-adventurers', role: 'member' }
  ];

  const follows: Follow[] = [
    { follower: 'grace', following: 'ada', isCloseFriend: true, status: 'accepted' },
    { follower: 'elon', following: 'ada', isCloseFriend: false, status: 'accepted' },
    { follower: 'ada', following: 'grace', isCloseFriend: true, status: 'pending' }
  ];

  const loginSessions: LoginSession[] = [
    { email: 'ada@example.com', username: 'ada', pin: '123456', verified: true },
    { email: 'grace@example.com', username: 'grace', pin: '654321', verified: true }
  ];

  const notifications: Notification[] = [];

  return { profiles, groups, memberships, follows, loginSessions, notifications };
}

export function toProfileViewModel(profile: Profile, memberships: Membership[], groups: Group[]): ProfileViewModel {
  const groupMap = new Map(groups.map((group) => [group.key, group] as const));
  return {
    ...profile,
    groups: memberships
      .filter((membership) => membership.username === profile.username)
      .map((membership) => {
        const group = groupMap.get(membership.groupKey);
        return {
          groupKey: membership.groupKey,
          role: membership.role,
          visibility: group?.isPrivate ? 'private' : 'public'
        };
      })
  };
}

export function generateRequestId(): string {
  return randomBytes(4).toString('hex');
}
