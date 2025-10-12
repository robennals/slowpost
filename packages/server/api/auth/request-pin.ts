import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthService } from '../../src/lib/get-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const authService = getAuthService();
    const { pin, requiresSignup } = await authService.requestPin(email);

    // In dev mode, return the PIN
    if (process.env.SKIP_PIN === 'true') {
      console.log(`PIN for ${email}: ${pin}`);
      return res.status(200).json({ success: true, requiresSignup, pin });
    }

    // TODO: Send email via Postmark
    console.log(`PIN for ${email}: ${pin} (email not configured yet)`);

    return res.status(200).json({ success: true, requiresSignup });
  } catch (error: any) {
    console.error('Error in request-pin:', error);
    return res.status(500).json({ error: error.message });
  }
}
