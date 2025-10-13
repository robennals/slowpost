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
import {
  createTestDeps,
  executeHandler,
  fakeSession,
  createUserWithProfile,
} from '../helpers/handlerTestUtils';

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
      const result = await executeHandler(requestPinHandler, makeContext({ body: { email: 'auth@test.com' } }));
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({ success: true, requiresSignup: true });
      expect(result.body.pin).toHaveLength(6);
    });

    it('sends PIN email when mailer configured and skip-pin disabled', async () => {
      const originalSkip = process.env.SKIP_PIN;
      process.env.SKIP_PIN = 'false';
      const sendPin = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({ skipPin: false, mailer: { sendPinEmail: sendPin } });

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
      deps = createTestDeps({ skipPin: false, mailer: { sendPinEmail: sendPin } });

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

    it('rejects profile update when acting on another user', async () => {
      await deps.db.addDocument('profiles', 'owner', { username: 'owner', fullName: 'Owner', bio: '' });
      await expect(
        executeHandler(
          updateProfileHandler,
          makeContext({ params: { username: 'owner' }, body: { bio: 'Hack' }, user: fakeSession('other') })
        )
      ).rejects.toThrow('You can only edit your own profile');
    });

    it('returns updates sorted by timestamp', async () => {
      await deps.db.addLink('updates', 'alice', 'old', { id: 'old', timestamp: '2020-01-01T00:00:00Z' });
      await deps.db.addLink('updates', 'alice', 'new', { id: 'new', timestamp: '2024-01-01T00:00:00Z' });
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
      await deps.db.addLink('subscriptions', 'alice', 'bob', { subscriberUsername: 'bob' });
      await deps.db.addLink('subscriptions', 'carol', 'alice', { subscriberUsername: 'alice' });

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
  });
});
