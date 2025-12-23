import { requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const checkExistingSubscribersHandler: Handler<
  { emails?: string[] },
  { username: string }
> = async (_req, ctx) => {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username } = ctx.params;
  if (user.username !== username) {
    throw new Error('You can only check subscribers for yourself');
  }

  const { emails = [] } = ctx.body ?? {};

  // Get existing subscribers
  const existing = await db.getChildLinks('subscriptions', username);
  const existingEmails = new Set<string>();
  const existingEmailMap = new Map<string, { name: string; email: string }>();

  for (const sub of existing) {
    const subData = sub as any;
    let email: string | null = null;
    let name: string | null = null;

    if (subData.pendingEmail) {
      // Pending subscriber
      email = subData.pendingEmail;
      name = subData.pendingFullName || subData.pendingEmail.split('@')[0];
    } else if (subData.subscriberUsername && !subData.subscriberUsername.startsWith('pending-')) {
      // Real user - check their profile
      const profile = await db.getDocument<any>('profiles', subData.subscriberUsername);
      if (profile?.email) {
        email = profile.email;
        name = profile.fullName || profile.email.split('@')[0];
      }
    }

    if (email) {
      const emailLower = email.toLowerCase();
      existingEmails.add(emailLower);
      existingEmailMap.set(emailLower, { name: name || email, email });
    }
  }

  // Check which of the provided emails already exist
  const results = emails.map(email => {
    const emailLower = email.toLowerCase();
    const isExisting = existingEmails.has(emailLower);
    const existingData = existingEmailMap.get(emailLower);

    return {
      email,
      exists: isExisting,
      existingName: existingData?.name,
    };
  });

  return success({ results });
};
