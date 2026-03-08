import { init } from '@instantdb/admin';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  // CORS headers
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
      return res.status(500).json({ error: 'Missing InstantDB App ID or Admin Token in backend' });
    }

    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find the user by email
    const data = await db.query({ userCredentials: { $: { where: { email: email.trim() } } } });
    const user = data.userCredentials ? data.userCredentials[0] : null;

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token securely through InstantDB
    const token = await db.auth.createToken({ email: email.trim() });

    return res.status(200).json({ success: true, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Failed to login' });
  }
}
