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

    const { init, tx, id: generateId } = require('@instantdb/admin');
    const crypto = require('crypto');
    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

    // --- DEDUPLICATION GUARD (Architecture level) ---
    // Generate a stable key for this specific message in a 1-minute window.
    const minuteWindow = Math.floor(Date.now() / (60 * 1000));
    const contentBody = body || message || '';
    const dedupeHash = crypto.createHash('sha256').update(`${to}|${subject}|${contentBody}`).digest('hex').slice(0, 16);
    const dedupeKeyString = `notify-dedupe-${ownerId}-${dedupeHash}-${minuteWindow}`;
    
    // InstantDB requires IDs to be UUIDs. We hash our key string into a stable UUID format.
    const dedupeId = crypto.createHash('md5').update(dedupeKeyString).digest('hex');
    const dedupeUUID = `${dedupeId.slice(0,8)}-${dedupeId.slice(8,12)}-${dedupeId.slice(12,16)}-${dedupeId.slice(16,20)}-${dedupeId.slice(20,32)}`;

    // Check if this exact message was already sent in this minute
    const { executedAutomations } = await db.query({ 
      executedAutomations: { $: { where: { id: dedupeUUID } } } 
    });

    if (executedAutomations?.length > 0) {
      console.log(`[NOTIFY] 🛡️ Dedupe: Skipping duplicate notification (ID: ${dedupeUUID})`);
      return res.status(200).json({ success: true, skipped: true, message: 'Duplicate blocked by server-side guard' });
    }
    
    // ATOMIC LOCK: We reserve this notification ID BEFORE sending.
    // This is the "Defense in Depth" that stops race conditions from browser tabs.
    await db.transact(tx.executedAutomations[dedupeUUID].update({
      key: dedupeKeyString,
      userId: ownerId,
      createdAt: Date.now()
    }));
    // ------------------------------------------------

    const profile = (await db.query({ userProfiles: { $: { where: { userId: ownerId }, limit: 1 } } })).userProfiles?.[0];

    if (type === 'whatsapp') {
      const waApiToken = profile?.waApiToken;
      const waPhoneId = profile?.waPhoneId;
      const { templateId, variables } = req.body || {};

      if (!waApiToken || !waPhoneId) return res.status(400).json({ error: 'WhatsApp not configured' });
      
      const phone = to.replace(/\D/g, '');
      const formattedPhone = phone.startsWith('91') ? `+${phone}` : phone.length === 10 ? `+91${phone}` : `+${phone}`;

      if (templateId) {
        const formData = new URLSearchParams();
        formData.append('apiToken', waApiToken);
        formData.append('phone_number_id', waPhoneId);
        formData.append('template_id', templateId);
        formData.append('phone_number', formattedPhone);
        
        if (variables && Array.isArray(variables)) {
          variables.forEach(v => {
            formData.append(`templateVariable-${v.field}-${v.index}`, v.value || '');
          });
        }

        const response = await fetch('https://portal.waprochat.in/api/v1/whatsapp/send/template', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        if (response.ok && data.status === 'success') return res.status(200).json({ success: true, messageId: data.message_id });
        return res.status(400).json({ error: data.message || 'Waprochat template fail' });
      } else {
        return res.status(400).json({ error: 'Template ID required for WhatsApp' });
      }
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
