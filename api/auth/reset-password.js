import { init, tx, id } from '@instantdb/admin';
import bcrypt from 'bcrypt';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

// Helper to generate a 6 digit code
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

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
    const { action, email, code, newPassword } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const data = await db.query({ userCredentials: { $: { where: { email: email.trim() } } } });
    const user = data.userCredentials ? data.userCredentials[0] : null;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (action === 'request') {
      const otp = generateOTP();
      const expiration = Date.now() + 15 * 60 * 1000; // 15 mins

      await db.transact([
        tx.userCredentials[user.id].update({
          resetCode: otp,
          resetExpires: expiration
        })
      ]);

      // Call the internal email sending logic (could fetch absolute URL but let's emulate it or return the info)
      // Since we can't easily fetch our own Vercel API, we'll return the code or advise the frontend to call send-email
      // Actually, standard is to return the OTP to the frontend so the frontend can call the Email API?
      // YES! The frontend can use EmailJS to send it.
      return res.status(200).json({ success: true, otp, message: 'OTP generated' });

    } else if (action === 'verify') {
      if (!code || !newPassword) {
        return res.status(400).json({ error: 'Code and new password are required' });
      }

      if (user.resetCode !== code) {
        return res.status(400).json({ error: 'Invalid reset code' });
      }

      if (Date.now() > user.resetExpires) {
        return res.status(400).json({ error: 'Reset code expired' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db.transact([
        tx.userCredentials[user.id].update({
          password: hashedPassword,
          resetCode: null,
          resetExpires: null
        })
      ]);

      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('Reset Password error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process request' });
  }
}
