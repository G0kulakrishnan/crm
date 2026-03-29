import { init, tx, id } from '@instantdb/admin';
import bcrypt from 'bcrypt';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!APP_ID || !ADMIN_TOKEN) {
      return res.status(500).json({ error: 'Missing InstantDB App ID or Admin Token in backend' });
    }

    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
    const { action, email, password, otp, fullName, bizName, phone, selectedPlan, newPassword, userId, code, ownerUserId, teamMemberId, partnerId, ownerId } = req.method === 'POST' ? req.body : req.query;

    if (!action) return res.status(400).json({ error: 'Action is required' });

    const cleanEmail = email?.trim().toLowerCase();

    /* ──────────── LOGIN ──────────── */
    if (action === 'login') {
      if (!cleanEmail || !password) return res.status(400).json({ error: 'Email and password are required' });
      const data = await db.query({ userCredentials: { $: { where: { email: cleanEmail } } } });
      const user = data.userCredentials?.[0];
      if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid email or password' });
      if (user.isVerified === false) return res.status(403).json({ error: 'Email verification pending', message: 'Please verify your email using the OTP sent during registration.' });
      
      const token = await db.auth.createToken({ email: cleanEmail });
      const isTeamMember = !!(user.isTeamMember && user.ownerUserId);
      const isPartner = !!(user.isPartner && user.ownerUserId);
      
      let role = 'Owner', perms = null, finalOwnerId = isTeamMember || isPartner ? user.ownerUserId : null, finalTeamId = isTeamMember ? user.teamMemberId : null, finalPartnerId = isPartner ? user.partnerId : null;

      if (isTeamMember) {
        const { teamMembers, userProfiles } = await db.query({
          teamMembers: { $: { where: { email: cleanEmail, userId: user.ownerUserId }, limit: 1 } },
          userProfiles: { $: { where: { userId: user.ownerUserId }, limit: 1 } }
        });
        const member = teamMembers?.[0];
        const profile = userProfiles?.[0];
        if (member && profile) {
          role = member.role;
          perms = (profile.roles || []).find(r => r.name === member.role)?.perms || {};
        }
      } else if (isPartner) {
        const { partnerApplications } = await db.query({
          partnerApplications: { $: { where: { id: user.partnerId }, limit: 1 } }
        });
        const partner = partnerApplications?.[0];
        if (partner) {
          role = partner.role; // 'Distributor' or 'Retailer'
          // Partners don't use the standard generic permissions system, their access is hardcoded by role
        }
      } else {
        const { userProfiles } = await db.query({ userProfiles: { $: { where: { email: cleanEmail }, limit: 1 } } });
        if (userProfiles?.[0]) {
          finalOwnerId = userProfiles[0].userId;
          role = userProfiles[0].role || 'Owner';
        }
      }
      return res.status(200).json({ success: true, token, isTeamMember, isPartner, role, perms, ownerUserId: finalOwnerId, teamMemberId: finalTeamId, partnerId: finalPartnerId });
    }

    /* ──────────── REGISTER ──────────── */
    if (action === 'register') {
      if (!cleanEmail || !password) return res.status(400).json({ error: 'Email and password are required' });
      const existing = await db.query({ userCredentials: { $: { where: { email: cleanEmail } } } });
      if (existing.userCredentials?.length > 0) return res.status(400).json({ error: 'User already exists' });
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await db.transact([tx.userCredentials[id()].update({ email: cleanEmail, password: hashedPassword, fullName: fullName || '', bizName: bizName || '', phone: phone || '', selectedPlan: selectedPlan || 'Trial', isVerified: false, otp: newOtp, createdAt: Date.now() })]);
      return res.status(200).json({ success: true, otp: newOtp, message: 'Registration successful. Verify OTP.' });
    }

    /* ──────────── VERIFY OTP ──────────── */
    if (action === 'verify-otp') {
      if (!cleanEmail || !otp) return res.status(400).json({ error: 'Email and OTP are required' });
      const data = await db.query({ userCredentials: { $: { where: { email: cleanEmail } } } });
      const user = data.userCredentials?.[0];
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.isVerified) return res.status(400).json({ error: 'Already verified' });
      if (user.otp !== otp) return res.status(401).json({ error: 'Invalid OTP' });
      
      await db.transact([tx.userCredentials[user.id].update({ isVerified: true, otp: null })]);
      const token = await db.auth.createToken({ email: cleanEmail });
      return res.status(200).json({ success: true, token, message: 'Verified and logged in' });
    }

    /* ──────────── ROLES ──────────── */
    if (action === 'roles') {
      if (!cleanEmail) return res.status(400).json({ error: 'Email is required' });
      const profileData = await db.query({ userProfiles: { $: { where: { email: cleanEmail } } } });
      const ownerProfile = profileData.userProfiles?.[0];
      if (ownerProfile) return res.status(200).json({ success: true, isOwner: true, isTeamMember: false, isPartner: false, role: 'Owner', perms: null, ownerUserId: ownerProfile.userId });

      const teamData = await db.query({ teamMembers: { $: { where: { email: cleanEmail } } } });
      const member = teamData.teamMembers?.[0];
      if (member) {
        const targetOwner = ownerId || member.userId;
        const { userProfiles } = await db.query({ userProfiles: { $: { where: { userId: targetOwner }, limit: 1 } } });
        const profile = userProfiles?.[0];
        if (!profile) return res.status(404).json({ error: 'Business profile not found' });
  
        const roleMatch = (profile.roles || []).find(r => r.name === member.role);
        return res.status(200).json({ success: true, isOwner: false, isTeamMember: true, isPartner: false, role: member.role, perms: roleMatch ? roleMatch.perms : {}, ownerUserId: profile.userId, teamMemberId: member.id, name: member.name });
      }

      const partnerData = await db.query({ partnerApplications: { $: { where: { email: cleanEmail, status: 'Approved' } } } });
      const partner = partnerData.partnerApplications?.[0];
      if (partner) {
        return res.status(200).json({ success: true, isOwner: false, isTeamMember: false, isPartner: true, role: partner.role, perms: null, ownerUserId: partner.userId, partnerId: partner.id, name: partner.name });
      }

      return res.status(404).json({ error: 'User not found in any business' });
    }

    /* ──────────── PASSWORD MANAGEMENT ──────────── */
    if (action === 'change-password') {
      if (!cleanEmail || !newPassword) return res.status(400).json({ error: 'Required fields missing' });
      const data = await db.query({ userCredentials: { $: { where: { email: cleanEmail } } } });
      const user = data.userCredentials?.[0];
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      if (!user) {
        if (!userId) return res.status(400).json({ error: 'userId required to create credentials' });
        await db.transact([tx.userCredentials[id()].update({ email: cleanEmail, password: hashedPassword, userId: userId })]);
      } else {
        await db.transact([tx.userCredentials[user.id].update({ password: hashedPassword, resetCode: null, resetExpires: null })]);
      }
      return res.status(200).json({ success: true, message: 'Password updated' });
    }

    if (action === 'reset-password-request') {
      if (!cleanEmail) return res.status(400).json({ error: 'Email required' });
      const data = await db.query({ userCredentials: { $: { where: { email: cleanEmail } } } });
      const user = data.userCredentials?.[0];
      let uidToUse = user ? user.userId : null, credId = user ? user.id : null;
      if (!user) {
        const profileData = await db.query({ userProfiles: { $: { where: { email: cleanEmail } } } });
        if (!profileData.userProfiles?.[0]) return res.status(404).json({ error: 'User not found' });
        uidToUse = profileData.userProfiles[0].userId;
        credId = id();
      }
      const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await db.transact([tx.userCredentials[credId].update({ userId: uidToUse, email: cleanEmail, ...(!user ? { password: '' } : {}), resetCode: resetOtp, resetExpires: Date.now() + 15 * 60 * 1000 })]);
      return res.status(200).json({ success: true, otp: resetOtp, message: 'OTP generated' });
    }

    if (action === 'reset-password-verify') {
      if (!cleanEmail || !code || !newPassword) return res.status(400).json({ error: 'Required fields missing' });
      const data = await db.query({ userCredentials: { $: { where: { email: cleanEmail } } } });
      const user = data.userCredentials?.[0];
      if (!user || user.resetCode !== code || Date.now() > user.resetExpires) return res.status(400).json({ error: 'Invalid or expired code' });
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.transact([tx.userCredentials[user.id].update({ password: hashedPassword, resetCode: null, resetExpires: null })]);
      return res.status(200).json({ success: true, message: 'Password updated' });
    }

    if (action === 'set-team-password') {
      if (!cleanEmail || !password || !ownerUserId || !teamMemberId) return res.status(400).json({ error: 'Required fields missing' });
      const hashedPassword = await bcrypt.hash(password, 10);
      const existing = await db.query({ userCredentials: { $: { where: { email: cleanEmail } } } });
      const credId = existing.userCredentials?.[0]?.id || id();
      await db.transact([tx.userCredentials[credId].update({ email: cleanEmail, password: hashedPassword, ownerUserId, teamMemberId, isTeamMember: true, updatedAt: Date.now(), ...(existing.userCredentials?.[0]?.id ? {} : { createdAt: Date.now() }) })]);
      return res.status(200).json({ success: true, message: 'Password set' });
    }

    if (action === 'set-partner-password') {
      if (!cleanEmail || !password || !ownerUserId || !partnerId) return res.status(400).json({ error: 'Required fields missing' });
      const hashedPassword = await bcrypt.hash(password, 10);
      const existing = await db.query({ userCredentials: { $: { where: { email: cleanEmail } } } });
      const credId = existing.userCredentials?.[0]?.id || id();
      await db.transact([tx.userCredentials[credId].update({ email: cleanEmail, password: hashedPassword, ownerUserId, partnerId, isPartner: true, updatedAt: Date.now(), ...(existing.userCredentials?.[0]?.id ? {} : { createdAt: Date.now() }) })]);
      return res.status(200).json({ success: true, message: 'Partner password set' });
    }

    return res.status(405).json({ error: 'Action not allowed' });
  } catch (err) {
    console.error('Auth API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
