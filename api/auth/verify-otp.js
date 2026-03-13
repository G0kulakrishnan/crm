import { init, tx } from '@instantdb/admin';
import dotenv from 'dotenv';
dotenv.config();

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

    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find the user credentials
    const data = await db.query({ 
      userCredentials: { $: { where: { email: email.trim().toLowerCase() } } } 
    });
    const user = data.userCredentials ? data.userCredentials[0] : null;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Account is already verified' });
    }

    if (user.otp !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    // Update isVerified to true and clear the OTP
    await db.transact([
      tx.userCredentials[user.id].update({
        isVerified: true,
        otp: null
      })
    ]);

    // Generate token securely through InstantDB
    const token = await db.auth.createToken({ email: email.trim().toLowerCase() });

    return res.status(200).json({ 
      success: true, 
      token, 
      message: 'Email verified successfully. You are now logged in.' 
    });
  } catch (err) {
    console.error('OTP Verification error:', err);
    return res.status(500).json({ error: err.message || 'Failed to verify OTP' });
  }
}
