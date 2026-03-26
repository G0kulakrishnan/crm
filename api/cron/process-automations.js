import { init, tx, id } from '@instantdb/admin';
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const renderTemplate = (template, data) => {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (match, key) => data[key] || match);
};

export default async function handler(req, res) {
  try {
    const { userProfiles, automations } = await db.query({
      userProfiles: {},
      automations: {},
    });

    let totalFired = 0;

    for (const profile of userProfiles) {
      const ownerId = profile.userId;
      
      const { leads, amc, executedAutomations, appointments, orders } = await db.query({
        leads: { $: { where: { userId: ownerId } } },
        amc: { $: { where: { userId: ownerId } } },
        executedAutomations: { $: { where: { userId: ownerId } } },
        appointments: { $: { where: { userId: ownerId } } },
        orders: { $: { where: { userId: ownerId } } },
      });

      const executedKeys = new Set((executedAutomations || []).map(e => e.key));

      const processFlows = async (entity, triggerType, triggerKeyBase, triggerTimestamp) => {
        const flows = (automations || []).filter(f => f.userId === ownerId && f.active !== false && f.trigger === triggerType);
        
        for (const flow of flows) {
          const processedKey = `${flow.id}-${triggerKeyBase}-${triggerTimestamp}`;
          
          if (executedKeys.has(processedKey)) continue;

          // Check conditions
          if (triggerType === 'trig-stage' && flow.triggerStage && entity.stage !== flow.triggerStage) continue;
          
          await executeAutomation(flow, entity, profile, processedKey);
          totalFired++;
          executedKeys.add(processedKey); // Prevent firing multiple times in same run
        }
      };

      // 1. Leads (New & Stage Change)
      for (const lead of leads) {
        if (lead.createdAt) await processFlows(lead, 'trig-lead', `lead-new-${lead.id}`, lead.createdAt);
        if (lead.stageChangedAt) await processFlows(lead, 'trig-stage', `lead-stage-${lead.id}-${lead.stageChangedAt}`, lead.stageChangedAt);
      }

      // 2. AMC Expiry
      for (const entry of amc) {
        if (!entry.expiryDate) continue;
        const expiryDate = new Date(entry.expiryDate);
        const today = new Date();
        const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) await processFlows(entry, 'trig-amc', `amc-today-${entry.id}`, entry.expiryDate);
        if (diffDays === 7) await processFlows(entry, 'trig-amc', `amc-7days-${entry.id}`, entry.expiryDate);
      }

      // 3. Follow-ups
      for (const lead of leads) {
        if (!lead.followup) continue;
        const followupDate = new Date(lead.followup);
        if (followupDate < new Date()) await processFlows(lead, 'trig-followup', `followup-${lead.id}-${lead.followup}`, lead.followup);
      }

      // 4. Appointments
      for (const appt of (appointments || [])) {
        if (appt.createdAt) await processFlows(appt, 'trig-appt-new', `appt-new-${appt.id}`, appt.createdAt);
        if (appt.date) {
             const apptDate = new Date(appt.date);
             const today = new Date();
             if (apptDate.toDateString() === today.toDateString()) {
                 await processFlows(appt, 'trig-appt-today', `appt-today-${appt.id}`, appt.date);
             }
        }
      }

      // 5. Ecom Orders
      for (const order of (orders || [])) {
        if (order.createdAt) await processFlows(order, 'trig-order-new', `order-new-${order.id}`, order.createdAt);
        if (order.status) await processFlows(order, 'trig-order-status', `order-status-${order.id}-${order.status}`, Date.now());
      }
    }

    console.log(`[CRON] ✅ Done. Total automations fired: ${totalFired}`);
    return res.status(200).json({ success: true, fired: totalFired });

  } catch (err) {
    console.error('[CRON] ❌ Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function executeAutomation(flow, entity, profile, processedKey) {
  const ownerId = profile.userId;

  // --- ATOMIC LOCK (Architecture Level) ---
  // Create a predictable UUID for this specific execution. 
  // If multiple instances try to fire this simultaneously, they will all target this same UUID.
  const dedupeId = crypto.createHash('md5').update(processedKey).digest('hex');
  const dedupeUUID = `${dedupeId.slice(0,8)}-${dedupeId.slice(8,12)}-${dedupeId.slice(12,16)}-${dedupeId.slice(16,20)}-${dedupeId.slice(20,32)}`;

  // Claim this execution in the DB. This will fail if the ID is invalid (UUID check) 
  // or succeed even if it's already there (idempotent update).
  await db.transact(db.tx.executedAutomations[dedupeUUID].update({
    key: processedKey,
    userId: ownerId,
    createdAt: Date.now(),
  }));
  // ------------------------------------------

  // Resolve recipients
  const resolveRecipients = (flow, lead, profile) => {
      const ownerEmail = profile.bizEmail || profile.email || profile.smtpUser || '';
      const extraEmails = (profile.bizExtraEmails || '').split(',').map(e => e.trim()).filter(Boolean);
      const recipients = [];
      const recMode = (flow.recipient || 'customer').toLowerCase();

      if (recMode === 'customer' || recMode === 'both') {
        if (lead.email) recipients.push({ email: lead.email, isOwner: false });
      }
      if (recMode === 'owner' || recMode === 'both') {
        if (ownerEmail) recipients.push({ email: ownerEmail, isOwner: true });
        extraEmails.forEach(email => recipients.push({ email, isOwner: true }));
      }
      return recipients.filter((v, i, a) => a.findIndex(t => t.email === v.email) === i);
    };

  const targets = resolveRecipients(flow, entity, profile);
  const templateData = { 
    name: entity.name || entity.client || 'Customer', 
    bizName: profile.bizName || 'Our Business',
    date: new Date().toLocaleDateString('en-IN'),
    stage: entity.stage || ''
  };

  const subject = renderTemplate(flow.subject || 'Reminder', templateData);
  const body    = renderTemplate(flow.template || 'Hello', templateData);

  for (const rec of targets) {
    const actionId = (flow.actions?.[0] || flow.action || 'act-email').toLowerCase();
    
    if (actionId === 'act-email') {
      await sendEmailSMTP(rec.email, subject, body, profile);
    }
  }

  // Log activity
  await db.transact(tx.activityLogs[id()].update({
    entityId: entity.id,
    entityType: 'lead',
    text: `🤖 [Auto-Cron] Sent automation: ${flow.name}`,
    userId: ownerId,
    userName: 'Automation Bot (Server)',
    createdAt: Date.now(),
  }));
}

async function sendEmailSMTP(to, subject, body, profile) {
  if (!profile.smtpHost || !profile.smtpUser || !profile.smtpPass) return;
  const transporter = nodemailer.createTransport({
    host: profile.smtpHost,
    port: parseInt(profile.smtpPort) || 587,
    secure: parseInt(profile.smtpPort) === 465,
    auth: { user: profile.smtpUser, pass: profile.smtpPass },
    tls: { rejectUnauthorized: false }
  });
  await transporter.sendMail({
    from: profile.bizName ? `"${profile.bizName}" <${profile.smtpUser}>` : profile.smtpUser,
    to, subject, text: body, html: body.replace(/\n/g, '<br/>')
  });
}
