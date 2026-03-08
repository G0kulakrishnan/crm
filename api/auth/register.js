import { init, tx, id } from '@instantdb/admin';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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

    const PRIVATE_KEY = process.env.INSTANT_AUTH_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!PRIVATE_KEY) {
      return res.status(500).json({ error: 'Missing INSTANT_AUTH_PRIVATE_KEY' });
    }

    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
    const { email, password, fullName, bizName, phone, selectedPlan } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    const existing = await db.query({ userCredentials: { $: { where: { email: email.trim() } } } });
    if (existing.userCredentials && existing.userCredentials.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const credentialId = id();

    // Save the credentials and profile info in InstantDB
    await db.transact([
      tx.userCredentials[credentialId].update({
        email: email.trim(),
        password: hashedPassword,
        fullName: fullName || '',
        bizName: bizName || '',
        phone: phone || '',
        selectedPlan: selectedPlan || 'Trial',
        createdAt: Date.now()
      })
    ]);

    // Generate Custom JWT for InstantDB Custom Auth
    const token = jwt.sign({ email: email.trim() }, PRIVATE_KEY, { algorithm: 'RS256', expiresIn: '7d' });

    return res.status(200).json({ success: true, token, message: 'Registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err.message || 'Failed to register user' });
  }
}
