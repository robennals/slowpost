import { ApiError, requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

interface AddSubscriberInput {
  email: string;
  fullName?: string;
}

export const addSubscriberByEmailHandler: Handler<
  { email?: string; fullName?: string; emails?: AddSubscriberInput[] },
  { username: string }
> = async (_req, ctx) => {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username } = ctx.params;
  if (user.username !== username) {
    throw new ApiError(403, 'You can only add subscribers to yourself');
  }

  const { email, fullName, emails } = ctx.body ?? {};

  // Support both single email (legacy) and multiple emails (new)
  const emailsToAdd: AddSubscriberInput[] = emails || (email ? [{ email, fullName }] : []);

  if (emailsToAdd.length === 0) {
    throw new ApiError(400, 'At least one email is required');
  }

  // Get existing subscribers to check for duplicates
  const existing = await db.getChildLinks('subscriptions', username);
  const existingEmails = new Set<string>();
  const existingUsernames = new Set<string>();

  for (const sub of existing) {
    const subData = sub as any;
    existingUsernames.add(subData.subscriberUsername);
    if (subData.pendingEmail) {
      existingEmails.add(subData.pendingEmail.toLowerCase());
    } else if (subData.subscriberUsername && !subData.subscriberUsername.startsWith('pending-')) {
      // For non-pending users, check their auth email
      const authData = await db.getDocument<any>('profiles', subData.subscriberUsername);
      if (authData?.email) {
        existingEmails.add(authData.email.toLowerCase());
      }
    }
  }

  const results = {
    added: [] as Array<{ email: string; subscriberUsername: string }>,
    skipped: [] as Array<{ email: string; reason: string }>,
  };

  for (const input of emailsToAdd) {
    const emailLower = input.email.toLowerCase();

    // Skip if already a subscriber
    if (existingEmails.has(emailLower)) {
      results.skipped.push({
        email: input.email,
        reason: 'Already a subscriber',
      });
      continue;
    }

    const authData = await db.getDocument<any>('auth', input.email);
    let subscriberUsername: string;

    if (authData?.username) {
      subscriberUsername = authData.username;

      // Double check if username is already subscribed
      if (existingUsernames.has(subscriberUsername)) {
        results.skipped.push({
          email: input.email,
          reason: 'Already a subscriber',
        });
        continue;
      }

      // Update profile with any missing data
      const profile = await db.getDocument<any>('profiles', subscriberUsername);
      if (profile) {
        const updates: any = {};
        if (input.fullName && !profile.fullName) {
          updates.fullName = input.fullName;
        }
        if (!profile.email) {
          updates.email = input.email;
        }
        if (Object.keys(updates).length > 0) {
          await db.updateDocument('profiles', subscriberUsername, updates);
        }
      }
    } else {
      const name = input.fullName;
      if (!name) {
        results.skipped.push({
          email: input.email,
          reason: 'Full name is required for new users',
        });
        continue;
      }

      // For pending subscribers (no account yet), use the email as the identifier
      subscriberUsername = `pending-${input.email}`;

      // Check if this pending user already exists
      if (existingUsernames.has(subscriberUsername)) {
        results.skipped.push({
          email: input.email,
          reason: 'Already a subscriber',
        });
        continue;
      }

      await db.addDocument('auth', input.email, {
        email: input.email,
        hasAccount: false,
      });
    }

    const subscription = {
      subscriberUsername,
      subscribedToUsername: username,
      isClose: false,
      addedBy: username,
      confirmed: false,
      timestamp: new Date().toISOString(),
      // For pending subscribers, store their info in the subscription
      pendingEmail: authData?.username ? undefined : input.email,
      pendingFullName: authData?.username ? undefined : input.fullName,
    };

    await db.addLink('subscriptions', username, subscriberUsername, subscription);

    results.added.push({
      email: input.email,
      subscriberUsername,
    });

    // Track this email as added for subsequent iterations
    existingEmails.add(emailLower);
    existingUsernames.add(subscriberUsername);
  }

  // For legacy single-email API, throw error if nothing was added
  if (!emails && results.added.length === 0 && results.skipped.length > 0) {
    throw new ApiError(400, results.skipped[0].reason);
  }

  return success({
    success: true,
    ...results,
    // For legacy single-email API compatibility
    subscriberUsername: results.added[0]?.subscriberUsername,
  });
};
