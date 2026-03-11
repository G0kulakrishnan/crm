import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');

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

    const { to, subject, body, ownerId, fromName } = req.body || {};

    if (!to || !subject || !body || !ownerId) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body, ownerId' });
    }

    const { init } = require('@instantdb/admin');
    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

    // Fetch owner profile for SMTP
    const { userProfiles } = await db.query({
      userProfiles: { $: { where: { userId: ownerId }, limit: 1 } }
    });

    const profile = userProfiles?.[0];
    const smtpHost = profile?.smtpHost;
    const smtpPort = profile?.smtpPort;
    const smtpUser = profile?.smtpUser;
    const smtpPass = profile?.smtpPass;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return res.status(400).json({ error: 'SMTP configuration not found for this business' });
    }

    const port = parseInt(smtpPort);
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: port,
      secure: port === 465, // true for 465, STARTTLS for 587
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false // Accept self-signed certs (common for shared hosting)
      }
    });

    const info = await transporter.sendMail({
      from: fromName ? `"${fromName}" <${smtpUser}>` : smtpUser,
      to: to,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br/>'),
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('SMTP Send Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send email' });
  }
}
