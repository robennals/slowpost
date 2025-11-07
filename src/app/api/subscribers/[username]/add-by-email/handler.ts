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

    const baseUsername = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
    let newUsername = baseUsername;
    let counter = 1;

    while (await db.getDocument('profiles', newUsername)) {
      newUsername = `${baseUsername}${counter}`;
      counter += 1;
    }

    subscriberUsername = newUsername;

    await db.addDocument('auth', email, {
      email,
      username: subscriberUsername,
      hasAccount: false,
    });

    await db.addDocument('profiles', subscriberUsername, {
      username: subscriberUsername,
      fullName,
      bio: '',
      email, // Store email in profile for easier lookup
    });
  }

  const subscription = {
    subscriberUsername,
    subscribedToUsername: username,
    isClose: false,
    addedBy: username,
    confirmed: false,
    timestamp: new Date().toISOString(),
  };

  await db.addLink('subscriptions', username, subscriberUsername, subscription);

  return success({ success: true, subscriberUsername });
};
