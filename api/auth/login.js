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
    const data = await db.query({ userCredentials: { $: { where: { email: email.trim().toLowerCase() } } } });
    const user = data.userCredentials ? data.userCredentials[0] : null;

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // NEW: Check if email is verified
    // Business owners have an isVerified flag, team members are assumed verified by the owner
    if (user.isVerified === false) {
      return res.status(403).json({ 
        error: 'Email verification pending', 
        message: 'Please verify your email using the OTP sent during registration.' 
      });
    }

    // Generate token securely through InstantDB
    const token = await db.auth.createToken({ email: email.trim().toLowerCase() });

    // Check if this is a team member login
    const isTeamMember = !!(user.isTeamMember && user.ownerUserId);
    let role = 'Owner';
    let perms = null;
    let ownerUserId = isTeamMember ? user.ownerUserId : null;
    let teamMemberId = isTeamMember ? user.teamMemberId : null;

    if (isTeamMember) {
      // Fetch permissions for the team member
      const { teamMembers, userProfiles } = await db.query({
        teamMembers: { $: { where: { email: email.trim().toLowerCase(), userId: user.ownerUserId }, limit: 1 } },
        userProfiles: { $: { where: { userId: user.ownerUserId }, limit: 1 } }
      });

      const member = teamMembers?.[0];
      const profile = userProfiles?.[0];

      if (member && profile) {
        role = member.role;
        const roleMatch = (profile.roles || []).find(r => r.name === member.role);
        perms = roleMatch ? roleMatch.perms : {};
      }
    } else {
      // Fetch owner's profile to get their userId
      const { userProfiles } = await db.query({
        userProfiles: { $: { where: { email: email.trim().toLowerCase() }, limit: 1 } }
      });
      if (userProfiles?.[0]) {
        ownerUserId = userProfiles[0].userId;
        role = userProfiles[0].role || 'Owner';
      }
    }
    
    return res.status(200).json({
      success: true,
      token,
      isTeamMember,
      role,
      perms,
      ownerUserId,
      teamMemberId
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Failed to login' });
  }
}
