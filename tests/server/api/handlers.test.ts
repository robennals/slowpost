import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requestPinHandler } from '../../../src/app/api/auth/request-pin/handler';
import { signupHandler } from '../../../src/app/api/auth/signup/handler';
import { loginHandler } from '../../../src/app/api/auth/login/handler';
import { currentUserHandler } from '../../../src/app/api/auth/me/handler';
import { logoutHandler } from '../../../src/app/api/auth/logout/handler';
import { getProfileHandler, updateProfileHandler } from '../../../src/app/api/profiles/[username]/handlers';
import { getUpdatesHandler } from '../../../src/app/api/updates/[username]/handler';
import {
  getSubscribersHandler,
  subscribeHandler,
} from '../../../src/app/api/subscribers/[username]/handlers';
import { getSubscriptionsHandler } from '../../../src/app/api/subscriptions/[username]/handler';
import { addSubscriberByEmailHandler } from '../../../src/app/api/subscribers/[username]/add-by-email/handler';
import {
  updateSubscriberHandler,
  unsubscribeHandler,
} from '../../../src/app/api/subscribers/[username]/[subscriberUsername]/handlers';
import { confirmSubscriptionHandler } from '../../../src/app/api/subscribers/[username]/[subscriberUsername]/confirm/handler';
import { getUserGroupsHandler } from '../../../src/app/api/groups/user/[username]/handler';
import { getGroupHandler } from '../../../src/app/api/groups/[groupName]/handler';
import { createGroupHandler } from '../../../src/app/api/groups/handler';
import { joinGroupHandler } from '../../../src/app/api/groups/[groupName]/join/handler';
import {
  updateGroupMemberHandler,
  leaveGroupHandler,
} from '../../../src/app/api/groups/[groupName]/members/[username]/handlers';
import { updateGroupHandler } from '../../../src/app/api/groups/[groupName]/handler';
import { uploadProfilePhotoHandler } from '../../../src/app/api/profile-photo/handlers';
import { markLetterSentHandler } from '../../../src/app/api/profiles/[username]/handlers';
import {
  createTestDeps,
  executeHandler,
  fakeSession,
  createUserWithProfile,
} from '../helpers/handlerTestUtils';

// Mock @vercel/blob
vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({ url: 'https://blob.vercel-storage.com/test-photo.jpg' }),
}));

process.env.SKIP_PIN = 'true';

function makeContext(overrides: any = {}) {
  return {
    params: {},
    body: {},
    query: {},
    cookies: {},
    user: undefined,
    ...overrides,
  };
}

describe('API handlers', () => {
  let deps = createTestDeps();

  beforeEach(() => {
    deps = createTestDeps();
  });

  describe('Auth', () => {
    it('issues a PIN and reports signup requirement', async () => {
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn().mockResolvedValue(undefined),
          sendNewSubscriberNotification: vi.fn().mockResolvedValue(undefined),
          sendGroupJoinRequestNotification: vi.fn().mockResolvedValue(undefined),
          sendAnnualLetterReminder: vi.fn().mockResolvedValue(undefined),
          sendAnnualLetterFollowUp: vi.fn().mockResolvedValue(undefined),
        },
      });
      const result = await executeHandler(requestPinHandler, makeContext({ body: { email: 'auth@test.com' } }));
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({ success: true, requiresSignup: true });
      expect(result.body.pin).toHaveLength(6);
    });

    it('sends PIN email when mailer configured and skip-pin disabled', async () => {
      const originalSkip = process.env.SKIP_PIN;
      process.env.SKIP_PIN = 'false';
      const sendPin = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        skipPin: false,
        mailer: {
          sendPinEmail: sendPin,
          sendNewSubscriberNotification: vi.fn().mockResolvedValue(undefined),
          sendGroupJoinRequestNotification: vi.fn().mockResolvedValue(undefined),
          sendAnnualLetterReminder: vi.fn().mockResolvedValue(undefined),
          sendAnnualLetterFollowUp: vi.fn().mockResolvedValue(undefined),
        },
      });

      const result = await executeHandler(requestPinHandler, makeContext({ body: { email: 'mail@test.com' } }));

      expect(result.status).toBe(200);
      expect(sendPin).toHaveBeenCalledWith('mail@test.com', expect.any(String));

      process.env.SKIP_PIN = originalSkip;
    });

    it('returns PIN when mailer missing and skip-pin disabled', async () => {
      const originalSkip = process.env.SKIP_PIN;
      process.env.SKIP_PIN = 'false';
      deps = createTestDeps({ skipPin: false, mailer: undefined });

      const result = await executeHandler(
        requestPinHandler,
        makeContext({ body: { email: 'nomailer@test.com' } })
      );

      expect(result.status).toBe(200);
      expect(result.body.pin).toHaveLength(6);

      process.env.SKIP_PIN = originalSkip;
    });

    it('shows PIN in responses for localhost requests', async () => {
      const originalSkip = process.env.SKIP_PIN;
      process.env.SKIP_PIN = 'false';
      const sendPin = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        skipPin: false,
        mailer: {
          sendPinEmail: sendPin,
          sendNewSubscriberNotification: vi.fn().mockResolvedValue(undefined),
          sendGroupJoinRequestNotification: vi.fn().mockResolvedValue(undefined),
          sendAnnualLetterReminder: vi.fn().mockResolvedValue(undefined),
          sendAnnualLetterFollowUp: vi.fn().mockResolvedValue(undefined),
        },
      });

      const result = await executeHandler(
        requestPinHandler,
        makeContext({
          body: { email: 'local@test.com' },
          request: { method: 'POST', headers: { host: 'localhost:3000' } },
        })
      );

      expect(result.status).toBe(200);
      expect(result.body.pin).toHaveLength(6);
      expect(sendPin).not.toHaveBeenCalled();

      process.env.SKIP_PIN = originalSkip;
    });

    it('rejects PIN request without email', async () => {
      await expect(executeHandler(requestPinHandler, makeContext())).rejects.toThrow('Email is required');
    });

    it('signs up a user and sets auth cookie', async () => {
      const result = await executeHandler(
        signupHandler,
        makeContext({
          body: {
            email: 'signup@test.com',
            username: 'signupUser',
            fullName: 'Signup User',
            pin: 'skip',
          },
        })
      );
      expect(result.status).toBe(200);
      expect(result.cookies?.[0]).toMatchObject({ type: 'set', name: 'auth_token' });
      expect(result.body.session.username).toBe('signupUser');
    });

    it('rejects signup with missing data', async () => {
      await expect(
        executeHandler(signupHandler, makeContext({ body: { email: 'x@test.com', pin: 'skip' } }))
      ).rejects.toThrow('All fields are required');
    });

    it('signs up a user with planToSend=true', async () => {
      const result = await executeHandler(
        signupHandler,
        makeContext({
          body: {
            email: 'planner@test.com',
            username: 'planner',
            fullName: 'Plan To Send',
            pin: 'skip',
            planToSend: true,
          },
        })
      );
      expect(result.status).toBe(200);
      const profile = await deps.db.getDocument('profiles', 'planner') as any;
      expect(profile?.planToSend).toBe(true);
    });

    it('signs up a user with planToSend=false', async () => {
      const result = await executeHandler(
        signupHandler,
        makeContext({
          body: {
            email: 'notplanner@test.com',
            username: 'notplanner',
            fullName: 'Not Planning',
            pin: 'skip',
            planToSend: false,
          },
        })
      );
      expect(result.status).toBe(200);
      const profile = await deps.db.getDocument('profiles', 'notplanner') as any;
      expect(profile?.planToSend).toBe(false);
    });

    it('signs up a user without planToSend (defaults to true)', async () => {
      const result = await executeHandler(
        signupHandler,
        makeContext({
          body: {
            email: 'default@test.com',
            username: 'defaultuser',
            fullName: 'Default User',
            pin: 'skip',
          },
        })
      );
      expect(result.status).toBe(200);
      const profile = await deps.db.getDocument('profiles', 'defaultuser') as any;
      expect(profile?.planToSend).toBe(true);
    });

    it('migrates pending subscriptions when user signs up', async () => {
      // Setup: Alice adds Bob by email (creating a pending subscription)
      await createUserWithProfile(deps, 'alice@test.com', 'alice', 'Alice');
      await executeHandler(
        addSubscriberByEmailHandler,
        makeContext({
          params: { username: 'alice' },
          body: { email: 'bob@test.com', fullName: 'Bob Smith' },
          user: fakeSession('alice'),
        })
      );

      // Verify pending subscription was created
      const pendingSubscriptions = await deps.db.getChildLinks('subscriptions', 'alice');
      const pendingSub = pendingSubscriptions.find((s: any) => s.subscriberUsername === 'pending-bob@test.com');
      expect(pendingSub).toBeDefined();
      expect((pendingSub as any)?.pendingEmail).toBe('bob@test.com');
      expect((pendingSub as any)?.pendingFullName).toBe('Bob Smith');

      // Bob signs up with his own username
      await executeHandler(
        signupHandler,
        makeContext({
          body: {
            email: 'bob@test.com',
            username: 'bob',
            fullName: 'Bob',
            pin: 'skip',
          },
        })
      );

      // Verify subscription was migrated to use Bob's chosen username
      const updatedSubscriptions = await deps.db.getChildLinks('subscriptions', 'alice');
      const realSub = updatedSubscriptions.find((s: any) => s.subscriberUsername === 'bob');
      expect(realSub).toBeDefined();
      expect((realSub as any)?.pendingEmail).toBeUndefined();
      expect((realSub as any)?.pendingFullName).toBeUndefined();
      expect((realSub as any)?.confirmed).toBe(false); // Still needs confirmation
      expect((realSub as any)?.addedBy).toBe('alice');

      // Old pending subscription should be removed
      const stillPending = updatedSubscriptions.find((s: any) => s.subscriberUsername === 'pending-bob@test.com');
      expect(stillPending).toBeUndefined();

      // Bob's profile should exist with his chosen username
      const bobProfile = await deps.db.getDocument('profiles', 'bob');
      expect(bobProfile).toBeDefined();
      expect((bobProfile as any)?.fullName).toBe('Bob');
    });

    it('logs in with generated pin when skip mode disabled', async () => {
      const strictDeps = createTestDeps({ skipPin: false });
      await createUserWithProfile(strictDeps, 'login@test.com', 'loginUser', 'Login User');
      const { pin } = await strictDeps.authService.requestPin('login@test.com');
      const result = await executeHandler(loginHandler, makeContext({ body: { email: 'login@test.com', pin } }));
      expect(result.status).toBe(200);
      expect(result.body.session.username).toBe('loginUser');
    });

    it('rejects invalid PIN', async () => {
      const strictDeps = createTestDeps({ skipPin: false });
      await createUserWithProfile(strictDeps, 'badpin@test.com', 'badpin', 'Bad Pin');
      await strictDeps.authService.requestPin('badpin@test.com');
      await expect(
        executeHandler(loginHandler, makeContext({ body: { email: 'badpin@test.com', pin: 'wrong' } }))
      ).rejects.toThrow('Invalid or expired PIN');
    });

    it('returns current user details', async () => {
      const session = fakeSession('current', 'Current User');
      const result = await executeHandler(currentUserHandler, makeContext({ user: session }));
      expect(result.body).toEqual({ username: 'current', fullName: 'Current User' });
    });

    it('clears auth cookie on logout', async () => {
      const result = await executeHandler(logoutHandler, makeContext());
      expect(result.cookies?.[0]).toMatchObject({ type: 'clear', name: 'auth_token' });
    });
  });

  describe('Profiles & updates', () => {
    it('returns profile with hasAccount flag', async () => {
      await deps.db.addDocument('profiles', 'alice', { username: 'alice', fullName: 'Alice', bio: '' });
      await deps.db.addDocument('auth', 'alice@example.com', {
        email: 'alice@example.com',
        username: 'alice',
        hasAccount: true,
      });
      const result = await executeHandler(getProfileHandler, makeContext({ params: { username: 'alice' } }));
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({ username: 'alice', hasAccount: true });
    });

    it('throws when profile missing', async () => {
      await expect(executeHandler(getProfileHandler, makeContext({ params: { username: 'missing' } }))).rejects.toThrow(
        'Profile not found'
      );
    });

    it('allows owner to update profile', async () => {
      await deps.db.addDocument('profiles', 'owner', { username: 'owner', fullName: 'Owner', bio: '' });
      const session = fakeSession('owner', 'Owner');
      const result = await executeHandler(
        updateProfileHandler,
        makeContext({ params: { username: 'owner' }, body: { bio: 'New bio' }, user: session })
      );
      expect(result.body).toMatchObject({ bio: 'New bio' });
    });

    it('allows owner to update expectedSendMonth', async () => {
      await deps.db.addDocument('profiles', 'owner', { username: 'owner', fullName: 'Owner', bio: '' });
      const session = fakeSession('owner', 'Owner');
      const result = await executeHandler(
        updateProfileHandler,
        makeContext({ params: { username: 'owner' }, body: { expectedSendMonth: 'January' }, user: session })
      );
      expect(result.body).toMatchObject({ expectedSendMonth: 'January' });
    });

    it('allows owner to update planToSend', async () => {
      await deps.db.addDocument('profiles', 'planner2', { username: 'planner2', fullName: 'Planner', bio: '', planToSend: true });
      const session = fakeSession('planner2', 'Planner');
      const result = await executeHandler(
        updateProfileHandler,
        makeContext({ params: { username: 'planner2' }, body: { planToSend: false }, user: session })
      );
      expect(result.body).toMatchObject({ planToSend: false });
    });

    it('allows owner to update multiple fields at once', async () => {
      await deps.db.addDocument('profiles', 'owner', { username: 'owner', fullName: 'Owner', bio: '' });
      const session = fakeSession('owner', 'Owner');
      const result = await executeHandler(
        updateProfileHandler,
        makeContext({
          params: { username: 'owner' },
          body: { bio: 'New bio', photoUrl: 'https://example.com/photo.jpg', expectedSendMonth: 'December' },
          user: session
        })
      );
      expect(result.body).toMatchObject({
        bio: 'New bio',
        photoUrl: 'https://example.com/photo.jpg',
        expectedSendMonth: 'December'
      });
    });

    it('rejects profile update when acting on another user', async () => {
      await deps.db.addDocument('profiles', 'owner', { username: 'owner', fullName: 'Owner', bio: '' });
      await expect(
        executeHandler(
          updateProfileHandler,
          makeContext({ params: { username: 'owner' }, body: { bio: 'Hack' }, user: fakeSession('other') })
        )
      ).rejects.toThrow('You can only edit your own profile');
    });

    it('allows user to mark letter as sent', async () => {
      await deps.db.addDocument('profiles', 'owner', {
        username: 'owner',
        fullName: 'Owner',
        bio: 'Test bio',
        expectedSendMonth: 'January'
      });
      const session = fakeSession('owner', 'Owner');
      const result = await executeHandler(
        markLetterSentHandler,
        makeContext({ params: { username: 'owner' }, user: session })
      );

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('lastSentDate');
      expect(new Date(result.body.lastSentDate).getTime()).toBeGreaterThan(Date.now() - 5000);
      expect(new Date(result.body.lastSentDate).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('rejects marking letter as sent for another user', async () => {
      await deps.db.addDocument('profiles', 'owner', { username: 'owner', fullName: 'Owner', bio: '' });
      await expect(
        executeHandler(
          markLetterSentHandler,
          makeContext({ params: { username: 'owner' }, user: fakeSession('other') })
        )
      ).rejects.toThrow('You can only mark your own letter as sent');
    });

    it('requires authentication to mark letter as sent', async () => {
      await deps.db.addDocument('profiles', 'owner', { username: 'owner', fullName: 'Owner', bio: '' });
      await expect(
        executeHandler(markLetterSentHandler, makeContext({ params: { username: 'owner' } }))
      ).rejects.toThrow('Not authenticated');
    });

    it('returns updates sorted by timestamp', async () => {
      await createUserWithProfile(deps, 'alice@example.com', 'alice', 'Alice');
      await createUserWithProfile(deps, 'bob@example.com', 'bob', 'Bob');
      await deps.db.addLink('updates', 'alice', 'old', {
        id: 'old',
        username: 'bob',
        timestamp: '2020-01-01T00:00:00Z',
      });
      await deps.db.addLink('updates', 'alice', 'new', {
        id: 'new',
        username: 'bob',
        timestamp: '2024-01-01T00:00:00Z',
      });
      const result = await executeHandler(getUpdatesHandler, makeContext({ params: { username: 'alice' } }));
      expect(result.body.map((u: any) => u.id)).toEqual(['new', 'old']);
    });
  });

  describe('Subscribers', () => {
    beforeEach(async () => {
      await createUserWithProfile(deps, 'alice@example.com', 'alice', 'Alice');
      await createUserWithProfile(deps, 'bob@example.com', 'bob', 'Bob');
    });

    it('lists subscribers and subscriptions', async () => {
      await createUserWithProfile(deps, 'carol@example.com', 'carol', 'Carol');
      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });
      await deps.db.addLink('subscriptions', 'carol', 'alice', {
        subscriberUsername: 'alice',
        subscribedToUsername: 'carol',
      });

      const subs = await executeHandler(getSubscribersHandler, makeContext({ params: { username: 'alice' } }));
      expect(subs.body[0].subscriberUsername).toBe('bob');

      const following = await executeHandler(getSubscriptionsHandler, makeContext({ params: { username: 'alice' } }));
      expect(following.body[0].subscriberUsername).toBe('alice');
    });

    it('creates subscription and update when subscribing directly', async () => {
      const result = await executeHandler(
        subscribeHandler,
        makeContext({
          params: { username: 'alice' },
          user: fakeSession('bob', 'Bob'),
        })
      );
      expect(result.status).toBe(200);
      const subscribers = await deps.db.getChildLinks<any>('subscriptions', 'alice');
      expect(subscribers).toHaveLength(1);
    });

    it('rejects subscribing twice', async () => {
      await deps.db.addLink('subscriptions', 'alice', 'bob', { subscriberUsername: 'bob' });
      await expect(
        executeHandler(subscribeHandler, makeContext({ params: { username: 'alice' }, user: fakeSession('bob') }))
      ).rejects.toThrow('Already subscribed to this user');
    });

    it('adds subscriber by email creating placeholder records', async () => {
      const result = await executeHandler(
        addSubscriberByEmailHandler,
        makeContext({
          params: { username: 'alice' },
          body: { email: 'invitee@example.com', fullName: 'Invitee' },
          user: fakeSession('alice'),
        })
      );
      expect(result.body.success).toBe(true);
      const authDoc = await deps.db.getDocument<any>('auth', 'invitee@example.com');
      expect(authDoc?.hasAccount).toBe(false);
    });

    it('creates pending subscriber without profile when adding by email', async () => {
      const result = await executeHandler(
        addSubscriberByEmailHandler,
        makeContext({
          params: { username: 'alice' },
          body: { email: 'newperson@example.com', fullName: 'New Person' },
          user: fakeSession('alice'),
        })
      );

      expect(result.body.success).toBe(true);
      // Pending subscribers get a pending- identifier, not a real username
      expect(result.body.subscriberUsername).toBe('pending-newperson@example.com');

      // No profile should be created for pending subscribers
      const profile = await deps.db.getDocument<any>('profiles', 'pending-newperson@example.com');
      expect(profile).toBeNull();

      // Auth record should be created with hasAccount=false
      const auth = await deps.db.getDocument<any>('auth', 'newperson@example.com');
      expect(auth?.hasAccount).toBe(false);

      // Subscription should have pending info stored
      const subscriptions = await deps.db.getChildLinks('subscriptions', 'alice');
      const pendingSubscription = subscriptions.find((s: any) => s.subscriberUsername === 'pending-newperson@example.com');
      expect(pendingSubscription).toBeDefined();
      expect((pendingSubscription as any)?.pendingEmail).toBe('newperson@example.com');
      expect((pendingSubscription as any)?.pendingFullName).toBe('New Person');
    });

    it('adds existing user as subscriber and updates missing profile data', async () => {
      // Create existing user without fullName in profile
      await deps.db.addDocument('auth', 'existing@example.com', {
        email: 'existing@example.com',
        username: 'existinguser',
        hasAccount: true,
      });
      await deps.db.addDocument('profiles', 'existinguser', {
        username: 'existinguser',
        fullName: '', // Missing fullName
        bio: 'Test bio',
        // Missing email in profile
      });

      const result = await executeHandler(
        addSubscriberByEmailHandler,
        makeContext({
          params: { username: 'alice' },
          body: { email: 'existing@example.com', fullName: 'Updated Name' },
          user: fakeSession('alice'),
        })
      );

      expect(result.body.success).toBe(true);
      expect(result.body.subscriberUsername).toBe('existinguser');

      const profile = await deps.db.getDocument<any>('profiles', 'existinguser');
      expect(profile?.fullName).toBe('Updated Name'); // Should be updated
      expect(profile?.email).toBe('existing@example.com'); // Should be added
    });

    it('does not overwrite existing profile data when adding subscriber', async () => {
      await createUserWithProfile(deps, 'existing@example.com', 'existinguser', 'Existing Name');

      // Update profile to have email
      await deps.db.updateDocument('profiles', 'existinguser', {
        email: 'existing@example.com'
      });

      const result = await executeHandler(
        addSubscriberByEmailHandler,
        makeContext({
          params: { username: 'alice' },
          body: { email: 'existing@example.com', fullName: 'Different Name' },
          user: fakeSession('alice'),
        })
      );

      expect(result.body.success).toBe(true);

      const profile = await deps.db.getDocument<any>('profiles', 'existinguser');
      expect(profile?.fullName).toBe('Existing Name'); // Should NOT be overwritten
      expect(profile?.email).toBe('existing@example.com'); // Should remain
    });

    it('rejects adding subscriber by email without fullName for new users', async () => {
      await expect(
        executeHandler(
          addSubscriberByEmailHandler,
          makeContext({
            params: { username: 'alice' },
            body: { email: 'newuser@example.com' }, // Missing fullName
            user: fakeSession('alice'),
          })
        )
      ).rejects.toThrow('Full name is required for new users');
    });

    it('updates subscriber relationship flags', async () => {
      await deps.db.addLink('subscriptions', 'alice', 'bob', { subscriberUsername: 'bob', isClose: false });
      const result = await executeHandler(
        updateSubscriberHandler,
        makeContext({
          params: { username: 'alice', subscriberUsername: 'bob' },
          body: { isClose: true },
          user: fakeSession('alice'),
        })
      );
      expect(result.status).toBe(200);
      const link = await deps.db.getChildLinks<any>('subscriptions', 'alice');
      expect(link[0].isClose).toBe(true);
    });

    it('confirms subscription when requested by subscriber', async () => {
      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        confirmed: false,
      });
      const result = await executeHandler(
        confirmSubscriptionHandler,
        makeContext({
          params: { username: 'alice', subscriberUsername: 'bob' },
          user: fakeSession('bob'),
        })
      );
      expect(result.status).toBe(200);
      const link = await deps.db.getChildLinks<any>('subscriptions', 'alice');
      expect(link[0].confirmed).toBe(true);
    });

    it('returns subscriber emails from profiles when fetching subscribers', async () => {
      // Create two users with emails in their profiles
      await createUserWithProfile(deps, 'sender@test.com', 'sender', 'Sender User');
      await createUserWithProfile(deps, 'subscriber@test.com', 'subscriber', 'Subscriber User');

      // Subscriber subscribes to Sender
      await deps.db.addLink('subscriptions', 'sender', 'subscriber', {
        subscriberUsername: 'subscriber',
        subscribedToUsername: 'sender',
        isClose: false,
        confirmed: true,
        timestamp: new Date().toISOString(),
      });

      // Get Sender's subscribers
      const result = await executeHandler(
        getSubscribersHandler,
        makeContext({
          params: { username: 'sender' },
        })
      );

      expect(result.status).toBe(200);
      expect(result.body).toHaveLength(1);
      expect(result.body[0].subscriberUsername).toBe('subscriber');
      expect(result.body[0].fullName).toBe('Subscriber User');
      expect(result.body[0].email).toBe('subscriber@test.com'); // Email should be returned from profile
    });

    it('prevents others from confirming subscription', async () => {
      await deps.db.addLink('subscriptions', 'alice', 'bob', { subscriberUsername: 'bob' });
      await expect(
        executeHandler(
          confirmSubscriptionHandler,
          makeContext({ params: { username: 'alice', subscriberUsername: 'bob' }, user: fakeSession('carol') })
        )
      ).rejects.toThrow('You can only confirm your own subscription');
    });

    it('removes subscription when unsubscribing self', async () => {
      await deps.db.addLink('subscriptions', 'alice', 'bob', { subscriberUsername: 'bob' });
      const result = await executeHandler(
        unsubscribeHandler,
        makeContext({ params: { username: 'alice', subscriberUsername: 'bob' }, user: fakeSession('bob') })
      );
      expect(result.status).toBe(200);
      const remaining = await deps.db.getChildLinks('subscriptions', 'alice');
      expect(remaining).toHaveLength(0);
    });

    it('sends email notification when user gets a new subscriber', async () => {
      const sendNotification = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn().mockResolvedValue(undefined),
          sendNewSubscriberNotification: sendNotification,
          sendGroupJoinRequestNotification: vi.fn().mockResolvedValue(undefined),
          sendAnnualLetterReminder: vi.fn().mockResolvedValue(undefined),
          sendAnnualLetterFollowUp: vi.fn().mockResolvedValue(undefined),
        },
      });
      await createUserWithProfile(deps, 'alice@example.com', 'alice', 'Alice');
      await createUserWithProfile(deps, 'bob@example.com', 'bob', 'Bob');

      const result = await executeHandler(
        subscribeHandler,
        makeContext({
          params: { username: 'alice' },
          user: fakeSession('bob', 'Bob'),
        })
      );

      expect(result.status).toBe(200);
      expect(sendNotification).toHaveBeenCalledWith('alice@example.com', 'bob', 'Bob');
    });

    it('does not send email when mailer is not configured', async () => {
      deps = createTestDeps({ mailer: undefined });
      await createUserWithProfile(deps, 'alice@example.com', 'alice', 'Alice');
      await createUserWithProfile(deps, 'bob@example.com', 'bob', 'Bob');

      const result = await executeHandler(
        subscribeHandler,
        makeContext({
          params: { username: 'alice' },
          user: fakeSession('bob', 'Bob'),
        })
      );

      expect(result.status).toBe(200);
      const subscribers = await deps.db.getChildLinks<any>('subscriptions', 'alice');
      expect(subscribers).toHaveLength(1);
    });
  });

  describe('Groups', () => {
    beforeEach(async () => {
      await createUserWithProfile(deps, 'owner@example.com', 'owner', 'Owner');
      await createUserWithProfile(deps, 'member@example.com', 'member', 'Member');
      await createUserWithProfile(deps, 'viewer@example.com', 'viewer', 'Viewer');
    });

    it('creates group and adds creator as admin member', async () => {
      const result = await executeHandler(
        createGroupHandler,
        makeContext({
          body: { groupName: 'writers', displayName: 'Writers' },
          user: fakeSession('owner'),
        })
      );
      expect(result.status).toBe(200);
      const group = await deps.db.getDocument<any>('groups', 'writers');
      expect(group?.adminUsername).toBe('owner');
      const members = await deps.db.getChildLinks<any>('members', 'writers');
      expect(members[0].isAdmin).toBe(true);
    });

    it('rejects duplicate group creation', async () => {
      await deps.db.addDocument('groups', 'writers', { groupName: 'writers', displayName: 'Writers' });
      await expect(
        executeHandler(
          createGroupHandler,
          makeContext({ body: { groupName: 'writers', displayName: 'Duplicate' }, user: fakeSession('owner') })
        )
      ).rejects.toThrow('Group already exists');
    });

    it('handles join request and notifies admins', async () => {
      await deps.db.addDocument('groups', 'writers', { groupName: 'writers', displayName: 'Writers' });
      await deps.db.addLink('members', 'writers', 'owner', {
        groupName: 'writers',
        username: 'owner',
        status: 'approved',
        isAdmin: true,
      });

      const result = await executeHandler(
        joinGroupHandler,
        makeContext({ params: { groupName: 'writers' }, body: { groupBio: 'I write' }, user: fakeSession('member') })
      );
      expect(result.status).toBe(200);
      const members = await deps.db.getChildLinks<any>('members', 'writers');
      expect(members.find((m) => m.username === 'member')?.status).toBe('pending');
    });

    it('requires admin for membership updates', async () => {
      await deps.db.addDocument('groups', 'writers', { groupName: 'writers' });
      await deps.db.addLink('members', 'writers', 'owner', {
        groupName: 'writers',
        username: 'owner',
        status: 'approved',
        isAdmin: true,
      });
      await deps.db.addLink('members', 'writers', 'member', {
        groupName: 'writers',
        username: 'member',
        status: 'pending',
        isAdmin: false,
      });

      await expect(
        executeHandler(
          updateGroupMemberHandler,
          makeContext({
            params: { groupName: 'writers', username: 'member' },
            body: { status: 'approved' },
            user: fakeSession('member'),
          })
        )
      ).rejects.toThrow('Only admins can approve members or toggle admin status');

      const result = await executeHandler(
        updateGroupMemberHandler,
        makeContext({
          params: { groupName: 'writers', username: 'member' },
          body: { status: 'approved', isAdmin: true },
          user: fakeSession('owner'),
        })
      );
      expect(result.status).toBe(200);
      const members = await deps.db.getChildLinks<any>('members', 'writers');
      expect(members.find((m) => m.username === 'member')?.status).toBe('approved');
    });

    it('returns group with members', async () => {
      await deps.db.addDocument('groups', 'writers', { groupName: 'writers' });
      await deps.db.addLink('members', 'writers', 'owner', { groupName: 'writers', username: 'owner', status: 'approved' });
      const result = await executeHandler(getGroupHandler, makeContext({ params: { groupName: 'writers' } }));
      expect(result.body.members).toHaveLength(1);
    });

    it('lists visible user groups with viewer rules applied', async () => {
      await deps.db.addDocument('groups', 'writers', { groupName: 'writers', isPublic: false });
      await deps.db.addLink('members', 'writers', 'member', {
        groupName: 'writers',
        username: 'member',
        status: 'approved',
        isAdmin: false,
      });
      await deps.db.addLink('members', 'writers', 'viewer', {
        groupName: 'writers',
        username: 'viewer',
        status: 'approved',
        isAdmin: false,
      });
      const session = await deps.authService.createSession('viewer@example.com');
      const result = await executeHandler(
        getUserGroupsHandler,
        makeContext({ params: { username: 'member' }, cookies: { auth_token: session.token } })
      );
      expect(result.body).toHaveLength(1);
    });

    it('removes member when leaving group', async () => {
      await deps.db.addDocument('groups', 'writers', { groupName: 'writers' });
      await deps.db.addLink('members', 'writers', 'member', {
        groupName: 'writers',
        username: 'member',
        status: 'approved',
        isAdmin: false,
      });
      const result = await executeHandler(
        leaveGroupHandler,
        makeContext({ params: { groupName: 'writers', username: 'member' }, user: fakeSession('member') })
      );
      expect(result.status).toBe(200);
      const remaining = await deps.db.getChildLinks<any>('members', 'writers');
      expect(remaining).toHaveLength(0);
    });

    it('allows admin to toggle group visibility', async () => {
      await deps.db.addDocument('groups', 'writers', { groupName: 'writers', displayName: 'Writers', isPublic: true });
      await deps.db.addLink('members', 'writers', 'owner', {
        groupName: 'writers',
        username: 'owner',
        status: 'approved',
        isAdmin: true,
      });

      const result = await executeHandler(
        updateGroupHandler,
        makeContext({
          params: { groupName: 'writers' },
          body: { isPublic: false },
          user: fakeSession('owner'),
        })
      );

      expect(result.status).toBe(200);
      expect(result.body.isPublic).toBe(false);

      const group = await deps.db.getDocument<any>('groups', 'writers');
      expect(group?.isPublic).toBe(false);
    });

    it('allows admin to update group description', async () => {
      await deps.db.addDocument('groups', 'writers', { groupName: 'writers', displayName: 'Writers', description: 'Old description' });
      await deps.db.addLink('members', 'writers', 'owner', {
        groupName: 'writers',
        username: 'owner',
        status: 'approved',
        isAdmin: true,
      });

      const result = await executeHandler(
        updateGroupHandler,
        makeContext({
          params: { groupName: 'writers' },
          body: { description: 'New description' },
          user: fakeSession('owner'),
        })
      );

      expect(result.status).toBe(200);
      expect(result.body.description).toBe('New description');
    });

    it('allows admin to update multiple group fields at once', async () => {
      await deps.db.addDocument('groups', 'writers', { groupName: 'writers', displayName: 'Writers', description: 'Old', isPublic: true });
      await deps.db.addLink('members', 'writers', 'owner', {
        groupName: 'writers',
        username: 'owner',
        status: 'approved',
        isAdmin: true,
      });

      const result = await executeHandler(
        updateGroupHandler,
        makeContext({
          params: { groupName: 'writers' },
          body: { description: 'New description', isPublic: false },
          user: fakeSession('owner'),
        })
      );

      expect(result.status).toBe(200);
      expect(result.body.description).toBe('New description');
      expect(result.body.isPublic).toBe(false);
    });

    it('rejects group update from non-admin', async () => {
      await deps.db.addDocument('groups', 'writers', { groupName: 'writers', displayName: 'Writers', isPublic: true });
      await deps.db.addLink('members', 'writers', 'owner', {
        groupName: 'writers',
        username: 'owner',
        status: 'approved',
        isAdmin: true,
      });
      await deps.db.addLink('members', 'writers', 'member', {
        groupName: 'writers',
        username: 'member',
        status: 'approved',
        isAdmin: false,
      });

      await expect(
        executeHandler(
          updateGroupHandler,
          makeContext({
            params: { groupName: 'writers' },
            body: { isPublic: false },
            user: fakeSession('member'),
          })
        )
      ).rejects.toThrow('Only group admins can update group settings');
    });

    it('rejects group update from non-member', async () => {
      await deps.db.addDocument('groups', 'writers', { groupName: 'writers', displayName: 'Writers', isPublic: true });
      await deps.db.addLink('members', 'writers', 'owner', {
        groupName: 'writers',
        username: 'owner',
        status: 'approved',
        isAdmin: true,
      });

      await expect(
        executeHandler(
          updateGroupHandler,
          makeContext({
            params: { groupName: 'writers' },
            body: { isPublic: false },
            user: fakeSession('viewer'),
          })
        )
      ).rejects.toThrow('Only group admins can update group settings');
    });

    it('requires authentication to update group', async () => {
      await deps.db.addDocument('groups', 'writers', { groupName: 'writers', displayName: 'Writers' });

      await expect(
        executeHandler(
          updateGroupHandler,
          makeContext({
            params: { groupName: 'writers' },
            body: { isPublic: false },
          })
        )
      ).rejects.toThrow('Not authenticated');
    });

    it('returns 404 for non-existent group', async () => {
      await expect(
        executeHandler(
          updateGroupHandler,
          makeContext({
            params: { groupName: 'nonexistent' },
            body: { isPublic: false },
            user: fakeSession('owner'),
          })
        )
      ).rejects.toThrow('Group not found');
    });

    it('sends email notification to group admins when user requests to join', async () => {
      const sendGroupJoinNotification = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn().mockResolvedValue(undefined),
          sendNewSubscriberNotification: vi.fn().mockResolvedValue(undefined),
          sendGroupJoinRequestNotification: sendGroupJoinNotification,
          sendAnnualLetterReminder: vi.fn().mockResolvedValue(undefined),
          sendAnnualLetterFollowUp: vi.fn().mockResolvedValue(undefined),
        },
      });
      await createUserWithProfile(deps, 'owner@example.com', 'owner', 'Owner');
      await createUserWithProfile(deps, 'member@example.com', 'member', 'Member');

      await deps.db.addDocument('groups', 'writers', { groupName: 'writers', displayName: 'Writers Club' });
      await deps.db.addLink('members', 'writers', 'owner', {
        groupName: 'writers',
        username: 'owner',
        status: 'approved',
        isAdmin: true,
      });

      const result = await executeHandler(
        joinGroupHandler,
        makeContext({ params: { groupName: 'writers' }, body: { groupBio: 'I write' }, user: fakeSession('member', 'Member') })
      );

      expect(result.status).toBe(200);
      expect(sendGroupJoinNotification).toHaveBeenCalledWith(
        'owner@example.com',
        'member',
        'Member',
        'writers',
        'Writers Club'
      );
    });

    it('sends email to all group admins when user requests to join', async () => {
      const sendGroupJoinNotification = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn().mockResolvedValue(undefined),
          sendNewSubscriberNotification: vi.fn().mockResolvedValue(undefined),
          sendGroupJoinRequestNotification: sendGroupJoinNotification,
          sendAnnualLetterReminder: vi.fn().mockResolvedValue(undefined),
          sendAnnualLetterFollowUp: vi.fn().mockResolvedValue(undefined),
        },
      });
      await createUserWithProfile(deps, 'owner@example.com', 'owner', 'Owner');
      await createUserWithProfile(deps, 'admin2@example.com', 'admin2', 'Admin Two');
      await createUserWithProfile(deps, 'member@example.com', 'member', 'Member');

      await deps.db.addDocument('groups', 'writers', { groupName: 'writers', displayName: 'Writers' });
      await deps.db.addLink('members', 'writers', 'owner', {
        groupName: 'writers',
        username: 'owner',
        status: 'approved',
        isAdmin: true,
      });
      await deps.db.addLink('members', 'writers', 'admin2', {
        groupName: 'writers',
        username: 'admin2',
        status: 'approved',
        isAdmin: true,
      });

      const result = await executeHandler(
        joinGroupHandler,
        makeContext({ params: { groupName: 'writers' }, user: fakeSession('member', 'Member') })
      );

      expect(result.status).toBe(200);
      expect(sendGroupJoinNotification).toHaveBeenCalledTimes(2);
      expect(sendGroupJoinNotification).toHaveBeenCalledWith(
        'owner@example.com',
        'member',
        'Member',
        'writers',
        'Writers'
      );
      expect(sendGroupJoinNotification).toHaveBeenCalledWith(
        'admin2@example.com',
        'member',
        'Member',
        'writers',
        'Writers'
      );
    });

    it('does not send group join email when mailer is not configured', async () => {
      deps = createTestDeps({ mailer: undefined });
      await createUserWithProfile(deps, 'owner@example.com', 'owner', 'Owner');
      await createUserWithProfile(deps, 'member@example.com', 'member', 'Member');

      await deps.db.addDocument('groups', 'writers', { groupName: 'writers', displayName: 'Writers' });
      await deps.db.addLink('members', 'writers', 'owner', {
        groupName: 'writers',
        username: 'owner',
        status: 'approved',
        isAdmin: true,
      });

      const result = await executeHandler(
        joinGroupHandler,
        makeContext({ params: { groupName: 'writers' }, user: fakeSession('member', 'Member') })
      );

      expect(result.status).toBe(200);
      const members = await deps.db.getChildLinks<any>('members', 'writers');
      expect(members.find((m) => m.username === 'member')?.status).toBe('pending');
    });
  });

  describe('Profile Photo', () => {
    it('uploads profile photo successfully', async () => {
      await createUserWithProfile(deps, 'user@test.com', 'user', 'Test User');
      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      const result = await executeHandler(
        uploadProfilePhotoHandler,
        makeContext({ body: { image: imageData }, user: fakeSession('user', 'Test User') })
      );

      expect(result.status).toBe(200);
      expect(result.body.photoUrl).toBe('https://blob.vercel-storage.com/test-photo.jpg');

      const profile = await deps.db.getDocument<any>('profiles', 'user');
      expect(profile?.photoUrl).toBe('https://blob.vercel-storage.com/test-photo.jpg');
    });

    it('requires authentication', async () => {
      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      await expect(
        executeHandler(uploadProfilePhotoHandler, makeContext({ body: { image: imageData } }))
      ).rejects.toThrow('Not authenticated');
    });

    it('rejects missing image data', async () => {
      await createUserWithProfile(deps, 'user@test.com', 'user', 'Test User');

      await expect(
        executeHandler(uploadProfilePhotoHandler, makeContext({ body: {}, user: fakeSession('user', 'Test User') }))
      ).rejects.toThrow('Image is required');
    });

    it('rejects invalid image format', async () => {
      await createUserWithProfile(deps, 'user@test.com', 'user', 'Test User');

      await expect(
        executeHandler(
          uploadProfilePhotoHandler,
          makeContext({ body: { image: 'not-a-data-url' }, user: fakeSession('user', 'Test User') })
        )
      ).rejects.toThrow('Invalid image format');
    });

    it('rejects unsupported image types', async () => {
      await createUserWithProfile(deps, 'user@test.com', 'user', 'Test User');
      const imageData = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

      await expect(
        executeHandler(
          uploadProfilePhotoHandler,
          makeContext({ body: { image: imageData }, user: fakeSession('user', 'Test User') })
        )
      ).rejects.toThrow('Unsupported image type');
    });

    it('accepts PNG images', async () => {
      await createUserWithProfile(deps, 'user@test.com', 'user', 'Test User');
      const imageData = 'data:image/png;base64,iVBORw0KGgo=';

      const result = await executeHandler(
        uploadProfilePhotoHandler,
        makeContext({ body: { image: imageData }, user: fakeSession('user', 'Test User') })
      );

      expect(result.status).toBe(200);
      expect(result.body.photoUrl).toBeTruthy();
    });

    it('accepts WebP images', async () => {
      await createUserWithProfile(deps, 'user@test.com', 'user', 'Test User');
      const imageData = 'data:image/webp;base64,UklGRiQAAABXRUJQ';

      const result = await executeHandler(
        uploadProfilePhotoHandler,
        makeContext({ body: { image: imageData }, user: fakeSession('user', 'Test User') })
      );

      expect(result.status).toBe(200);
      expect(result.body.photoUrl).toBeTruthy();
    });
  });
});
