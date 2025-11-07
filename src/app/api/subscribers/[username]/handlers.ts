import { ApiError, requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const getSubscribersHandler: Handler<unknown, { username: string }> = async (_req, { params }) => {
  const { db } = getHandlerDeps();
  const subscribers = await db.getChildLinks('subscriptions', params.username);
  return success(subscribers);
};

export const subscribeHandler: Handler<unknown, { username: string }> = async (_req, ctx) => {
  const { db, mailer } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username } = ctx.params;
  if (username === user.username) {
    throw new ApiError(400, 'You cannot subscribe to yourself');
  }

  const existing = await db.getChildLinks('subscriptions', username);
  if (existing.some((s: any) => s.subscriberUsername === user.username)) {
    throw new ApiError(400, 'Already subscribed to this user');
  }

  const subscription = {
    subscriberUsername: user.username,
    subscribedToUsername: username,
    isClose: false,
    addedBy: user.username,
    confirmed: true,
    timestamp: new Date().toISOString(),
  };

  await db.addLink('subscriptions', username, user.username, subscription);

  const updateId = `${Date.now()}-${user.username}-subscribed`;
  const update = {
    id: updateId,
    type: 'new_subscriber',
    username: user.username,
    timestamp: new Date().toISOString(),
  };
  await db.addLink('updates', username, updateId, update);

  // Send email notification to the user being subscribed to
  if (mailer) {
    try {
      const subscribedToProfile = await db.getDocument<any>('profiles', username);
      const subscriberProfile = await db.getDocument<any>('profiles', user.username);

      if (subscribedToProfile?.email && subscriberProfile?.fullName) {
        await mailer.sendNewSubscriberNotification(
          subscribedToProfile.email,
          user.username,
          subscriberProfile.fullName
        );
      }
    } catch (error) {
      console.error('Failed to send new subscriber notification email:', error);
      // Don't fail the subscription if email fails
    }
  }

  return success({ success: true, subscription });
};
