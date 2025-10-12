import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthService } from '../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({ error: 'Email and PIN are required' });
    }

    const authService = getAuthService();
    const { token, user } = await authService.verifyPin(email, pin);

    // Set auth cookie
    res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`);

    return res.status(200).json({ success: true, user });
  } catch (error: any) {
    console.error('Error in login:', error);
    return res.status(401).json({ error: error.message });
  }
}
