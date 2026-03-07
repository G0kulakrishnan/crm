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
    const { to, subject, body, smtpHost, smtpPort, smtpUser, smtpPass, fromName } = req.body || {};

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return res.status(400).json({ error: 'Missing SMTP configuration (host, port, user, pass)' });
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
