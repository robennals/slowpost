import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Clear the auth_token cookie
    res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error in logout:', error);
    return res.status(500).json({ error: error.message });
  }
}
