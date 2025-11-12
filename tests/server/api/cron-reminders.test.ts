import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendRemindersHandler } from '../../../src/app/api/cron/send-reminders/handler';
import { createTestDeps, executeHandler } from '../helpers/handlerTestUtils';

// Set CRON_SECRET for testing
process.env.CRON_SECRET = 'test-secret-123';

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

describe('Cron: Send Reminders Handler', () => {
  let deps = createTestDeps();
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const monthIndex = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ].indexOf(currentMonth);
  const nextMonth = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ][(monthIndex + 1) % 12];
  const lastMonth = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ][(monthIndex - 1 + 12) % 12];

  beforeEach(() => {
    deps = createTestDeps();
  });

  describe('Authentication', () => {
    it('rejects requests without authorization header', async () => {
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: vi.fn(),
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      await expect(
        executeHandler(sendRemindersHandler, makeContext({
          request: { headers: {} }
        }))
      ).rejects.toThrow('Unauthorized');
    });

    it('rejects requests with wrong secret', async () => {
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: vi.fn(),
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      await expect(
        executeHandler(sendRemindersHandler, makeContext({
          request: { headers: { authorization: 'Bearer wrong-secret' } }
        }))
      ).rejects.toThrow('Unauthorized');
    });

    it('allows requests with correct secret', async () => {
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: vi.fn(),
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({ sent: 0, errors: 0 });
    });
  });

  describe('Mailer not configured', () => {
    it('returns gracefully when mailer is not configured', async () => {
      deps = createTestDeps({ mailer: undefined });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        message: 'Mailer not configured',
        sent: 0,
        errors: 0
      });
    });
  });

  describe('Initial reminder emails', () => {
    it('sends reminder to user in their expected send month with subscribers', async () => {
      const sendReminder = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: sendReminder,
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      // Create user with expected send month = current month
      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: currentMonth,
      });

      // Add a subscriber
      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.status).toBe(200);
      expect(result.body.sent).toBe(1);
      expect(result.body.errors).toBe(0);
      expect(sendReminder).toHaveBeenCalledWith(
        'alice@example.com',
        'Alice',
        'alice',
        1,
        currentMonth
      );
    });

    it('does not send reminder to user without subscribers', async () => {
      const sendReminder = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: sendReminder,
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: currentMonth,
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.body.sent).toBe(0);
      expect(sendReminder).not.toHaveBeenCalled();
    });

    it('does not send reminder to user without email', async () => {
      const sendReminder = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: sendReminder,
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        expectedSendMonth: currentMonth,
      });

      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.body.sent).toBe(0);
      expect(sendReminder).not.toHaveBeenCalled();
    });

    it('does not send reminder to user without expected send month', async () => {
      const sendReminder = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: sendReminder,
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
      });

      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.body.sent).toBe(0);
      expect(sendReminder).not.toHaveBeenCalled();
    });

    it('does not send reminder if not their expected send month', async () => {
      const sendReminder = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: sendReminder,
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: nextMonth, // Different month
      });

      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.body.sent).toBe(0);
      expect(sendReminder).not.toHaveBeenCalled();
    });

    it('does not send reminder if they sent recently (within 6 months)', async () => {
      const sendReminder = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: sendReminder,
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: currentMonth,
        lastSentDate: twoMonthsAgo.toISOString(),
      });

      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.body.sent).toBe(0);
      expect(sendReminder).not.toHaveBeenCalled();
    });

    it('sends reminder if they sent more than 6 months ago', async () => {
      const sendReminder = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: sendReminder,
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: currentMonth,
        lastSentDate: sevenMonthsAgo.toISOString(),
      });

      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.body.sent).toBe(1);
      expect(sendReminder).toHaveBeenCalledOnce();
    });

    it('includes correct subscriber count in email', async () => {
      const sendReminder = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: sendReminder,
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: currentMonth,
      });

      // Add 3 subscribers
      await deps.db.addLink('subscriptions', 'alice', 'bob', { subscriberUsername: 'bob' });
      await deps.db.addLink('subscriptions', 'alice', 'charlie', { subscriberUsername: 'charlie' });
      await deps.db.addLink('subscriptions', 'alice', 'dave', { subscriberUsername: 'dave' });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.body.sent).toBe(1);
      expect(sendReminder).toHaveBeenCalledWith(
        'alice@example.com',
        'Alice',
        'alice',
        3, // subscriber count
        currentMonth
      );
    });
  });

  describe('Duplicate prevention', () => {
    it('does not send reminder if already sent this month', async () => {
      const sendReminder = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: sendReminder,
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      const thisMonth = new Date();

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: currentMonth,
        lastReminderSentDate: thisMonth.toISOString(), // Already sent this month
      });

      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.body.sent).toBe(0);
      expect(sendReminder).not.toHaveBeenCalled();
    });

    it('sends reminder if last reminder was sent in a previous month', async () => {
      const sendReminder = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: sendReminder,
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: currentMonth,
        lastReminderSentDate: lastMonth.toISOString(), // Sent last month
      });

      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.body.sent).toBe(1);
      expect(sendReminder).toHaveBeenCalledOnce();
    });

    it('updates lastReminderSentDate after sending', async () => {
      const sendReminder = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: sendReminder,
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: currentMonth,
      });

      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      const profile = await deps.db.getDocument<any>('profiles', 'alice');
      expect(profile?.lastReminderSentDate).toBeDefined();
      expect(new Date(profile?.lastReminderSentDate).getMonth()).toBe(new Date().getMonth());
    });
  });

  describe('Follow-up reminder emails', () => {
    it('sends follow-up one month after expected send month', async () => {
      const sendFollowUp = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: vi.fn(),
          sendAnnualLetterFollowUp: sendFollowUp,
        },
      });

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: lastMonth, // Expected send was last month
      });

      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.body.sent).toBe(1);
      expect(sendFollowUp).toHaveBeenCalledWith(
        'alice@example.com',
        'Alice',
        'alice',
        1,
        lastMonth
      );
    });

    it('does not send follow-up if they already sent recently', async () => {
      const sendFollowUp = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: vi.fn(),
          sendAnnualLetterFollowUp: sendFollowUp,
        },
      });

      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: lastMonth,
        lastSentDate: twoMonthsAgo.toISOString(),
      });

      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.body.sent).toBe(0);
      expect(sendFollowUp).not.toHaveBeenCalled();
    });

    it('does not send follow-up if already sent this month', async () => {
      const sendFollowUp = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: vi.fn(),
          sendAnnualLetterFollowUp: sendFollowUp,
        },
      });

      const thisMonth = new Date();

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: lastMonth,
        lastFollowUpSentDate: thisMonth.toISOString(),
      });

      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.body.sent).toBe(0);
      expect(sendFollowUp).not.toHaveBeenCalled();
    });

    it('updates lastFollowUpSentDate after sending', async () => {
      const sendFollowUp = vi.fn().mockResolvedValue(undefined);
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: vi.fn(),
          sendAnnualLetterFollowUp: sendFollowUp,
        },
      });

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: lastMonth,
      });

      await deps.db.addLink('subscriptions', 'alice', 'bob', {
        subscriberUsername: 'bob',
        subscribedToUsername: 'alice',
      });

      await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      const profile = await deps.db.getDocument<any>('profiles', 'alice');
      expect(profile?.lastFollowUpSentDate).toBeDefined();
      expect(new Date(profile?.lastFollowUpSentDate).getMonth()).toBe(new Date().getMonth());
    });
  });

  describe('Error handling', () => {
    it('continues processing other users if one fails', async () => {
      const sendReminder = vi.fn()
        .mockRejectedValueOnce(new Error('Email service down'))
        .mockResolvedValueOnce(undefined);

      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: sendReminder,
          sendAnnualLetterFollowUp: vi.fn(),
        },
      });

      // User 1 - will fail
      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: currentMonth,
      });
      await deps.db.addLink('subscriptions', 'alice', 'sub1', { subscriberUsername: 'sub1' });

      // User 2 - will succeed
      await deps.db.addDocument('profiles', 'bob', {
        username: 'bob',
        fullName: 'Bob',
        bio: 'Writer',
        email: 'bob@example.com',
        expectedSendMonth: currentMonth,
      });
      await deps.db.addLink('subscriptions', 'bob', 'sub2', { subscriberUsername: 'sub2' });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.status).toBe(200);
      expect(result.body.sent).toBe(1);
      expect(result.body.errors).toBe(1);
    });
  });

  describe('Response format', () => {
    it('returns correct summary', async () => {
      deps = createTestDeps({
        mailer: {
          sendPinEmail: vi.fn(),
          sendNewSubscriberNotification: vi.fn(),
          sendGroupJoinRequestNotification: vi.fn(),
          sendAnnualLetterReminder: vi.fn().mockResolvedValue(undefined),
          sendAnnualLetterFollowUp: vi.fn().mockResolvedValue(undefined),
        },
      });

      await deps.db.addDocument('profiles', 'alice', {
        username: 'alice',
        fullName: 'Alice',
        bio: 'Writer',
        email: 'alice@example.com',
        expectedSendMonth: currentMonth,
      });
      await deps.db.addLink('subscriptions', 'alice', 'bob', { subscriberUsername: 'bob' });

      const result = await executeHandler(sendRemindersHandler, makeContext({
        request: { headers: { authorization: 'Bearer test-secret-123' } }
      }));

      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        message: 'Sent 1 reminders with 0 errors',
        sent: 1,
        errors: 0,
        currentMonth,
      });
    });
  });
});
