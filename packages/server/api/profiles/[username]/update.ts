import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, getAuthService } from '../../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

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

    // Only allow users to edit their own profile
    if (session.username !== username) {
      return res.status(403).json({ error: 'You can only edit your own profile' });
    }

    const { fullName, bio, photoUrl } = req.body;
    const updates: any = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (bio !== undefined) updates.bio = bio;
    if (photoUrl !== undefined) updates.photoUrl = photoUrl;

    const db = getDb();
    await db.updateDocument('profiles', username, updates);

    const updatedProfile = await db.getDocument('profiles', username);
    return res.status(200).json(updatedProfile);
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: error.message });
  }
}
