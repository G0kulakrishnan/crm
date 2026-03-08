import { init, tx, id } from '@instantdb/admin';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const env = req.env || process.env;
    const APP_ID = env.VITE_INSTANT_APP_ID;
    const ADMIN_TOKEN = env.INSTANT_ADMIN_TOKEN;

    if (!APP_ID || !ADMIN_TOKEN) {
      return res.status(500).json({ error: 'Missing InstantDB credentials' });
    }

    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
    const { email, password, ownerUserId, teamMemberId } = req.body || {};

    if (!email || !password || !ownerUserId || !teamMemberId) {
      return res.status(400).json({ error: 'email, password, ownerUserId, and teamMemberId are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the user already has credentials
    const existing = await db.query({
      userCredentials: { $: { where: { email: email.trim().toLowerCase() } } }
    });

    const credId = existing.userCredentials?.[0]?.id || id();

    await db.transact([
      tx.userCredentials[credId].update({
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        ownerUserId,
        teamMemberId,
        isTeamMember: true,
        updatedAt: Date.now(),
        ...(existing.userCredentials?.[0]?.id ? {} : { createdAt: Date.now() })
      })
    ]);

    return res.status(200).json({ success: true, message: 'Password set successfully' });
  } catch (err) {
    console.error('Set team password error:', err);
    return res.status(500).json({ error: err.message || 'Failed to set password' });
  }
}
