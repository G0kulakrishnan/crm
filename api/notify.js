import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');

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
    const { type, to, subject, body, message, ownerId, fromName, smtpConfig } = req.body || {};

    if (!to || (!body && !message) || !ownerId) return res.status(400).json({ error: 'Missing required fields' });

    const { init } = require('@instantdb/admin');
    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
    const profile = (await db.query({ userProfiles: { $: { where: { userId: ownerId }, limit: 1 } } })).userProfiles?.[0];

    if (type === 'whatsapp') {
      const waToken = profile?.waToken;
      const waPhoneNumberId = profile?.waPhoneNumberId;
      if (!waToken || !waPhoneNumberId) return res.status(400).json({ error: 'WhatsApp not configured' });
      const cleanToken = waToken.trim().replace(/^Bearer\s+/i, '');
      const phone = to.replace(/\D/g, '');
      const response = await fetch(`https://graph.facebook.com/v21.0/${waPhoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cleanToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'text', text: { body: message || body } })
      });
      const data = await response.json();
      if (response.ok) return res.status(200).json({ success: true, messageId: data.messages?.[0]?.id });
      return res.status(400).json({ error: data.error?.message || 'WhatsApp fail', details: data });
    }

    // Default: Email
    let host = smtpConfig?.smtpHost || profile?.smtpHost;
    let port = parseInt(smtpConfig?.smtpPort || profile?.smtpPort || '587');
    let user = smtpConfig?.smtpUser || profile?.smtpUser;
    let pass = smtpConfig?.smtpPass || profile?.smtpPass;
    let biz = smtpConfig?.bizName || profile?.bizName || fromName || '';

    if (!host || !user || !pass) return res.status(400).json({ error: 'SMTP not configured' });

    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, tls: { rejectUnauthorized: false } });
    const info = await transporter.sendMail({ from: biz ? `"${biz}" <${user}>` : user, to, subject: subject || 'Notification', text: body || message, html: (body || message).replace(/\n/g, '<br/>') });
    return res.status(200).json({ success: true, messageId: info.messageId });

  } catch (err) {
    console.error('Notify API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
