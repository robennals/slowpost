import { ApiError, requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const addSubscriberByEmailHandler: Handler<
  { email?: string; fullName?: string },
  { username: string }
> = async (_req, ctx) => {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username } = ctx.params;
  if (user.username !== username) {
    throw new ApiError(403, 'You can only add subscribers to yourself');
  }

  const { email, fullName } = ctx.body ?? {};
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const authData = await db.getDocument<any>('auth', email);
  let subscriberUsername: string;

  if (authData?.username) {
    subscriberUsername = authData.username;
    const existing = await db.getChildLinks('subscriptions', username);
    if (existing.some((s: any) => s.subscriberUsername === subscriberUsername)) {
      throw new ApiError(400, 'This person is already a subscriber');
    }

    // Update profile with any missing data
    const profile = await db.getDocument<any>('profiles', subscriberUsername);
    if (profile) {
      const updates: any = {};
      if (fullName && !profile.fullName) {
        updates.fullName = fullName;
      }
      if (!profile.email) {
        updates.email = email;
      }
      if (Object.keys(updates).length > 0) {
        await db.updateDocument('profiles', subscriberUsername, updates);
      }
    }
  } else {
    if (!fullName) {
      throw new ApiError(400, 'Full name is required for new users');
    }

    // For pending subscribers (no account yet), use the email as the identifier
    // Don't create a profile or reserve a username - they'll choose their own when signing up
    subscriberUsername = `pending-${email}`;

    await db.addDocument('auth', email, {
      email,
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
    pendingEmail: authData?.username ? undefined : email,
    pendingFullName: authData?.username ? undefined : fullName,
  };

  await db.addLink('subscriptions', username, subscriberUsername, subscription);

  return success({ success: true, subscriberUsername });
};
