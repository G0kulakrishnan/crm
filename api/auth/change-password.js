import { init, tx, id } from '@instantdb/admin';
import bcrypt from 'bcrypt';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!APP_ID || !ADMIN_TOKEN) {
      return res.status(500).json({ error: 'Missing InstantDB App ID or Admin Token in backend' });
    }

    console.log("CHANGING PASSWORD REQ BODY:", req.body);
    const { email, newPassword, userId } = req.body || {};
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
    
    // Find user
    const data = await db.query({ userCredentials: { $: { where: { email: email.trim() } } } });
    const user = data.userCredentials ? data.userCredentials[0] : null;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (!user) {
      if (!userId) {
        return res.status(404).json({ error: `User credentials not found and no userId provided to create one. Received body: ${JSON.stringify(req.body)}` });
      }
      
      // Create new credentials for users who only used Magic Link previously
      await db.transact([
        tx.userCredentials[id()].update({
          email: email.trim(),
          password: hashedPassword,
          userId: userId
        })
      ]);
    } else {
      // Update existing credentials
      await db.transact([
        tx.userCredentials[user.id].update({
          password: hashedPassword,
          resetCode: null,
          resetExpires: null
        })
      ]);
    }

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change Password error:', err);
    return res.status(500).json({ error: err.message || 'Failed to change password' });
  }
}
