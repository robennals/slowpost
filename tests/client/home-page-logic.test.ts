import { describe, it, expect } from 'vitest';

// Extract the getNextAction logic for testing
type Profile = {
  bio?: string;
  photoUrl?: string;
  expectedSendMonth?: string;
  lastSentDate?: string;
};

type NextAction = {
  type: 'setup' | 'send';
  message: string;
  link: string;
  linkText: string;
  helpDoc: string;
} | null;

// Check what's missing from profile and return appropriate message
function getProfileSetupMessage(profile: Profile): string | null {
  if (!profile.bio || profile.bio.trim() === '') {
    return 'Edit your profile to tell people what you\'ll write about';
  }
  if (!profile.photoUrl) {
    return 'Add a profile photo so subscribers can recognize you';
  }
  if (!profile.expectedSendMonth) {
    return 'Set when you plan to send your annual letter';
  }
  return null; // Profile is complete
}

function getNextAction(
  profile: Profile | null,
  subscribers: any[],
  groups: any[],
  username: string
): NextAction {
  // Don't show setup widget if profile hasn't loaded yet
  if (!profile) {
    return null;
  }

  const setupMessage = getProfileSetupMessage(profile);
  if (setupMessage) {
    return {
      type: 'setup' as const,
      message: setupMessage,
      link: `/${username}`,
      linkText: 'Edit your profile',
      helpDoc: '/pages/setting-up-your-profile.html'
    };
  }

  // Check if it's time to send
  const isTimeToSend = () => {
    if (!profile.expectedSendMonth) return false;

    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

    if (profile.expectedSendMonth === currentMonth) {
      if (!profile.lastSentDate) return true;

      const lastSentDate = new Date(profile.lastSentDate);
      const now = new Date();

      const monthsSinceLastSent = (now.getFullYear() - lastSentDate.getFullYear()) * 12 +
                                  (now.getMonth() - lastSentDate.getMonth());
      return monthsSinceLastSent >= 6;
    }

    return false;
  };

  if (isTimeToSend() && subscribers.length > 0) {
    return {
      type: 'send' as const,
      message: `It's time to send your annual letter! You have ${subscribers.length} ${subscribers.length === 1 ? 'subscriber' : 'subscribers'} waiting to hear from you.`,
      link: '/subscribers',
      linkText: 'View subscribers',
      helpDoc: '/pages/writing-a-good-letter.html'
    };
  }

  if (groups.length === 0) {
    return {
      type: 'setup' as const,
      message: 'Create a group to reconnect with people you know',
      link: '/groups',
      linkText: 'Create a group',
      helpDoc: '/pages/joining-groups.html'
    };
  }

  return {
    type: 'setup' as const,
    message: `You have ${subscribers.length} ${subscribers.length === 1 ? 'subscriber' : 'subscribers'}. Share your profile to get more!`,
    link: `/${username}`,
    linkText: 'View your profile',
    helpDoc: '/pages/getting-subscribers.html'
  };
}

describe('Home page next action logic', () => {
  const username = 'testuser';
  const subscribers = [{ subscriberUsername: 'sub1' }];
  const groups = [{ groupName: 'group1' }];

  describe('Profile loading state', () => {
    it('returns null when profile has not loaded yet', () => {
      const action = getNextAction(null, [], [], username);
      expect(action).toBeNull();
    });
  });

  describe('Profile completion checks', () => {
    it('shows bio message when only bio is missing', () => {
      const profile = {
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: 'January'
      };
      const action = getNextAction(profile, subscribers, groups, username);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('setup');
      expect(action?.message).toBe('Edit your profile to tell people what you\'ll write about');
      expect(action?.link).toBe('/testuser');
    });

    it('shows bio message when bio is empty string', () => {
      const profile = {
        bio: '',
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: 'January'
      };
      const action = getNextAction(profile, subscribers, groups, username);

      expect(action).not.toBeNull();
      expect(action?.message).toBe('Edit your profile to tell people what you\'ll write about');
    });

    it('shows bio message when bio is only whitespace', () => {
      const profile = {
        bio: '   ',
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: 'January'
      };
      const action = getNextAction(profile, subscribers, groups, username);

      expect(action).not.toBeNull();
      expect(action?.message).toBe('Edit your profile to tell people what you\'ll write about');
    });

    it('shows photo message when only photo is missing', () => {
      const profile = {
        bio: 'This is my bio',
        expectedSendMonth: 'January'
      };
      const action = getNextAction(profile, subscribers, groups, username);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('setup');
      expect(action?.message).toBe('Add a profile photo so subscribers can recognize you');
    });

    it('shows expected month message when only expected month is missing', () => {
      const profile = {
        bio: 'This is my bio',
        photoUrl: 'http://example.com/photo.jpg'
      };
      const action = getNextAction(profile, subscribers, groups, username);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('setup');
      expect(action?.message).toBe('Set when you plan to send your annual letter');
    });

    it('shows photo message when bio is set but photo and expected month are missing', () => {
      const profile = {
        bio: 'This is my bio'
      };
      const action = getNextAction(profile, subscribers, groups, username);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('setup');
      expect(action?.message).toBe('Add a profile photo so subscribers can recognize you');
    });

    it('shows expected month message when bio and photo are set but expected month is missing', () => {
      const profile = {
        bio: 'This is my bio',
        photoUrl: 'http://example.com/photo.jpg'
      };
      const action = getNextAction(profile, subscribers, groups, username);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('setup');
      expect(action?.message).toBe('Set when you plan to send your annual letter');
    });

    it('does not show setup message when profile is complete', () => {
      const profile = {
        bio: 'This is my bio',
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: 'January'
      };
      const action = getNextAction(profile, subscribers, groups, username);

      // Should either be null or a different action (like create group or time to send)
      expect(action?.message).not.toContain('Complete your profile');
      expect(action?.message).not.toContain('Edit your profile to tell people');
      expect(action?.message).not.toContain('Add a profile photo');
      expect(action?.message).not.toContain('Set when you plan');
    });
  });

  describe('Time to send logic', () => {
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

    it('shows send message when it\'s the expected send month and user has subscribers', () => {
      const profile = {
        bio: 'My bio',
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: currentMonth
      };
      const action = getNextAction(profile, subscribers, groups, username);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('send');
      expect(action?.message).toContain('time to send your annual letter');
      expect(action?.message).toContain('1 subscriber');
    });

    it('shows correct plural form for multiple subscribers', () => {
      const profile = {
        bio: 'My bio',
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: currentMonth
      };
      const multipleSubscribers = [
        { subscriberUsername: 'sub1' },
        { subscriberUsername: 'sub2' },
        { subscriberUsername: 'sub3' }
      ];
      const action = getNextAction(profile, multipleSubscribers, groups, username);

      expect(action).not.toBeNull();
      expect(action?.message).toContain('3 subscribers');
    });

    it('does not show send message when expected month does not match', () => {
      const differentMonth = currentMonth === 'January' ? 'July' : 'January';
      const profile = {
        bio: 'My bio',
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: differentMonth
      };
      const action = getNextAction(profile, subscribers, groups, username);

      expect(action?.type).not.toBe('send');
    });

    it('does not show send message when user has no subscribers', () => {
      const profile = {
        bio: 'My bio',
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: currentMonth
      };
      const action = getNextAction(profile, [], groups, username);

      expect(action?.type).not.toBe('send');
    });

    it('does not show send message if sent recently (within 6 months)', () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const profile = {
        bio: 'My bio',
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: currentMonth,
        lastSentDate: twoMonthsAgo.toISOString()
      };
      const action = getNextAction(profile, subscribers, groups, username);

      expect(action?.type).not.toBe('send');
    });

    it('shows send message if sent more than 6 months ago', () => {
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

      const profile = {
        bio: 'My bio',
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: currentMonth,
        lastSentDate: sevenMonthsAgo.toISOString()
      };
      const action = getNextAction(profile, subscribers, groups, username);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('send');
    });
  });

  describe('Other action suggestions', () => {
    it('suggests creating a group when profile is complete but no groups exist', () => {
      const profile = {
        bio: 'My bio',
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: 'January' // Not current month
      };
      const action = getNextAction(profile, subscribers, [], username);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('setup');
      expect(action?.message).toBe('Create a group to reconnect with people you know');
      expect(action?.link).toBe('/groups');
    });

    it('suggests getting more subscribers when profile is complete and groups exist', () => {
      const profile = {
        bio: 'My bio',
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: 'January' // Not current month
      };
      const action = getNextAction(profile, subscribers, groups, username);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('setup');
      expect(action?.message).toContain('You have 1 subscriber');
    });

    it('shows correct subscriber count in message', () => {
      const profile = {
        bio: 'My bio',
        photoUrl: 'http://example.com/photo.jpg',
        expectedSendMonth: 'January'
      };
      const noSubscribers: any[] = [];
      const action = getNextAction(profile, noSubscribers, groups, username);

      expect(action).not.toBeNull();
      expect(action?.message).toContain('You have 0 subscribers');
    });
  });
});
