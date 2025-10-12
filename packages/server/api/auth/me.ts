import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthService } from '../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = req.cookies.auth_token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const authService = getAuthService();
    const session = await authService.verifySession(token);

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    return res.status(200).json({
      username: session.username,
      fullName: session.fullName,
    });
  } catch (error: any) {
    console.error('Error in me:', error);
    return res.status(500).json({ error: error.message });
  }
}
