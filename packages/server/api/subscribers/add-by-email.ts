import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, getAuthService } from '../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Authenticate user
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const authService = getAuthService();
    const session = await authService.verifySession(token);

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const username = session.username;
    const { email, fullName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = getDb();

    // Find existing user by email
    const authData = await db.getDocument<any>('auth', email);
    let subscriberUsername: string;

    if (authData && authData.username) {
      // User already exists
      subscriberUsername = authData.username;

      // Check if already subscribed
      const existing = await db.getChildLinks('subscriptions', username);
      if (existing.some((s: any) => s.subscriberUsername === subscriberUsername)) {
        return res.status(400).json({ error: 'This person is already a subscriber' });
      }

      // Optionally update their name if provided and they don't have one
      if (fullName) {
        const profile = await db.getDocument<any>('profiles', subscriberUsername);
        if (profile && !profile.fullName) {
          await db.updateDocument<any>('profiles', subscriberUsername, { fullName });
        }
      }
    } else {
      // Create new user account
      if (!fullName) {
        return res.status(400).json({ error: 'Full name is required for new users' });
      }

      // Generate a username from email (before @)
      const baseUsername = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
      let newUsername = baseUsername;
      let counter = 1;

      // Ensure username is unique
      while (await db.getDocument<any>('profiles', newUsername)) {
        newUsername = `${baseUsername}${counter}`;
        counter++;
      }

      subscriberUsername = newUsername;

      // Create auth record
      await db.addDocument<any>('auth', email, {
        email,
        username: subscriberUsername,
        hasAccount: false, // They haven't logged in yet
      });

      // Create profile
      await db.addDocument<any>('profiles', subscriberUsername, {
        username: subscriberUsername,
        fullName,
        bio: '',
      });
    }

    // Create the subscription
    const subscription = {
      subscriberUsername,
      subscribedToUsername: username,
      isClose: false,
      addedBy: username, // The subscribedTo user added this person
      confirmed: false, // Not yet confirmed by subscriber
      timestamp: new Date().toISOString(),
    };

    await db.addLink('subscriptions', username, subscriberUsername, subscription);

    return res.status(200).json({ success: true, subscriberUsername });
  } catch (error: any) {
    console.error('Error adding subscriber by email:', error);
    return res.status(500).json({ error: error.message });
  }
}
