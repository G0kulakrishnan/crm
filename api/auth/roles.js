import { init } from '@instantdb/admin';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const env = req.env || process.env;
    const APP_ID = env.VITE_INSTANT_APP_ID;
    const ADMIN_TOKEN = env.INSTANT_ADMIN_TOKEN;

    if (!APP_ID || !ADMIN_TOKEN) {
      return res.status(500).json({ error: 'Missing InstantDB App ID or Admin Token' });
    }

    const { email, ownerId } = req.method === 'POST' ? req.body : req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

    // 1. Check if owner
    const profileData = await db.query({ 
      userProfiles: { $: { where: { email: email.trim().toLowerCase() } } } 
    });
    const ownerProfile = profileData.userProfiles?.[0];

    if (ownerProfile) {
      return res.status(200).json({
        success: true,
        isOwner: true,
        role: 'Owner',
        perms: null, // Full access
        ownerUserId: ownerProfile.userId
      });
    }

    // 2. Check if team member
    const query = { 
      teamMembers: { $: { where: { email: email.trim().toLowerCase() } } } 
    };
    const teamData = await db.query(query);
    const member = teamData.teamMembers?.[0];

    if (!member) {
      return res.status(404).json({ error: 'User not found in any business' });
    }

    // Fetch the owner's profile for permissions
    const ownerIdToUse = ownerId || member.userId;
    const { userProfiles } = await db.query({
      userProfiles: { $: { where: { userId: ownerIdToUse }, limit: 1 } }
    });
    const profile = userProfiles?.[0];

    if (!profile) {
      return res.status(404).json({ error: 'Business profile not found' });
    }

    const roles = profile.roles || [];
    const roleMatch = roles.find(r => r.name === member.role);

    return res.status(200).json({
      success: true,
      isOwner: false,
      role: member.role,
      perms: roleMatch ? roleMatch.perms : {},
      ownerUserId: profile.userId,
      teamMemberId: member.id,
      name: member.name
    });

  } catch (err) {
    console.error('Roles check error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
