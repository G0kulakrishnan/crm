import { init } from '@instantdb/admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

/**
 * Calculates the delay offset in milliseconds from a delay config object.
 */
const delayMs = (delay) => {
  if (!delay || !delay.value || delay.dir === 'immediately') return 0;
  const multipliers = { minutes: 60 * 1000, hours: 60 * 60 * 1000, days: 24 * 60 * 60 * 1000 };
  const ms = (delay.value || 0) * (multipliers[delay.unit] || 0);
  return delay.dir === 'before' ? -ms : ms;
};

/**
 * Replaces placeholders in a template string with actual data.
 */
const renderTemplate = (template, data = {}) => {
  if (!template) return '';
  let msg = template;
  const placeholders = {
    '{client}': data.client || data.name || 'Customer',
    '{date}': data.date || new Date().toLocaleDateString('en-IN'),
    '{amount}': data.amount ? `₹${data.amount.toLocaleString()}` : '',
    '{bizName}': data.bizName || '',
    '{invoiceNo}': data.invoiceNo || '',
    '{contractNo}': data.contractNo || '',
    '{email}': data.email || '',
    '{phone}': data.phone || '',
    '{stage}': data.stage || '',
    '{source}': data.source || '',
    '{assignee}': data.assignee || data.assign || '',
    '{followupDate}': data.followupDate || data.followup || '',
  };

  Object.entries(placeholders).forEach(([key, val]) => {
    msg = msg.replaceAll(key, String(val));
  });

  return msg;
};

/**
 * Returns true if the lead matches ALL conditions defined on the automation.
 */
const matchesConditions = (flow, lead) => {
  if (!flow.conditions || flow.conditions.length === 0) return true;
  return flow.conditions.every(cond => {
    const fieldVal = (lead[cond.field] || '').toLowerCase();
    const condVal  = (cond.value || '').toLowerCase();
    if (cond.op === 'is')       return fieldVal === condVal;
    if (cond.op === 'is not')   return fieldVal !== condVal;
    if (cond.op === 'contains') return fieldVal.includes(condVal);
    return true;
  });
};

export default async function handler(req, res) {
  // CORS (optional for CRON but good to have)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET');

  try {
    console.log('[CRON] 🚀 Starting automation processing...');
    
    // 1. Fetch all user profiles to iterate through users
    const { userProfiles } = await db.query({ userProfiles: {} });
    console.log(`[CRON] 👥 Found ${userProfiles.length} user profiles.`);

    let totalFired = 0;

    for (const profile of userProfiles) {
      const ownerId = profile.userId;
      const ownerEmail = profile.bizEmail || profile.email || 'N/A';
      
      console.log(`[CRON] 👤 Processing User: ${ownerEmail} (${ownerId})`);
      const { leads, amc, automations, executedAutomations, appointments, orders } = await db.query({
        leads: { $: { where: { userId: ownerId } } },
        amc:   { $: { where: { userId: ownerId } } },
        automations: { $: { where: { userId: ownerId } } },
        executedAutomations: { $: { where: { userId: ownerId } } },
        appointments: { $: { where: { userId: ownerId } } },
        orders: { $: { where: { userId: ownerId } } },
      });

      const activeFlows = (automations || []).filter(f => f.active !== false);
      if (activeFlows.length === 0) continue;

      const nowStamp = Date.now();
      const executedKeys = new Set((executedAutomations || []).map(e => e.key));

      console.log(`[CRON] 👤 User: ${ownerId} | Leads: ${leads.length} | Active Automations: ${activeFlows.length}`);

      // ─── Trigger Logic ────────────────────────────────────────────────────────
      
      const processFlows = async (entity, triggerType, triggerKeyBase, triggerTimestamp) => {
        const flows = activeFlows.filter(f => f.trigger === triggerType);
        for (const flow of flows) {
          if (!matchesConditions(flow, entity)) continue;
          
          const waitMs = delayMs(flow.delay);
          const fireAt = (triggerTimestamp || 0) + waitMs;
          
          const processedKey = `${flow.id}-${triggerKeyBase}-${triggerTimestamp}`;
          const isExecuted = executedKeys.has(processedKey);

          const STALE_THRESHOLD = 6 * 60 * 60 * 1000; // Skip if due more than 6h ago
          const isStale = (nowStamp - fireAt) > STALE_THRESHOLD;

          console.log(`[CRON]     → Flow "${flow.name}": Now=${new Date(nowStamp).toLocaleTimeString()} | FireAt=${new Date(fireAt).toLocaleTimeString()} | Exists=${isExecuted} | Stale=${isStale}`);

          if (nowStamp < fireAt) {
            continue;
          }

          if (isExecuted || isStale) {
            continue;
          }

          // FIRE ACTION!
          console.log(`[CRON] ⚡ Firing automation "${flow.name}" for entity: ${entity.name || entity.id}`);
          await executeAutomation(flow, entity, profile, processedKey);
          totalFired++;
        }
      };

      // 1. New Lead (trig-lead)
      for (const lead of leads) {
        await processFlows(lead, 'trig-lead', `lead-new-${lead.id}`, lead.createdAt);
      }

      // 2. Follow-up Due (trig-followup)
      for (const lead of leads) {
        if (!lead.followup) continue;
        
        // Skip if lead is in a terminal stage (Won/Lost)
        const isTerminal = ['Won', 'Lost', (profile.wonStage || 'Won'), (profile.lostStage || 'Lost')].includes(lead.stage);
        if (isTerminal) continue;

        const followupTs = new Date(lead.followup).getTime();
        const dateKey = String(lead.followup).split('T')[0];
        console.log(`[CRON]   🔎 Lead "${lead.name}": Follow-up ${lead.followup} | TS: ${followupTs}`);
        await processFlows(lead, 'trig-followup', `lead-followup-${lead.id}-${dateKey}`, followupTs);
      }

      // 3. AMC Expiring (trig-amc)
      for (const entry of amc) {
        const daysLeft = Math.ceil((new Date(entry.endDate) - nowStamp) / (1000 * 60 * 60 * 24));
        const reminders = profile.reminders || { amc: { days: 30 } };
        if (daysLeft === (reminders.amc?.days || 30)) {
           await processFlows({ ...entry, name: entry.client }, 'trig-amc', `amc-exp-${entry.id}-${daysLeft}`, nowStamp);
        }
      }

      // 4. Payment Due (trig-payment)
      for (const lead of leads) {
        if (!lead.paymentDue) continue;
        const payTs = new Date(lead.paymentDue).getTime();
        await processFlows(lead, 'trig-payment', `lead-payment-${lead.id}-${payTs}`, payTs);
      }

      // 5. Stage Changed (trig-stage)
      for (const lead of leads) {
        if (!lead.stageChangedAt) continue;
        const isRecent = (nowStamp - lead.stageChangedAt) < 60 * 60 * 1000; // 1h threshold
        if (!isRecent) continue;
        await processFlows(lead, 'trig-stage', `lead-stage-${lead.id}-${lead.stageChangedAt}`, lead.stageChangedAt);
      }

      // 6. Appointments (trig-appt-*)
      for (const appt of (appointments || [])) {
        // trig-appt-new
        await processFlows(appt, 'trig-appt-new', `appt-new-${appt.id}`, appt.createdAt);
        // trig-appt-status
        if (appt.updatedAt) {
          const isRecent = (nowStamp - appt.updatedAt) < 60 * 60 * 1000;
          if (isRecent) {
             await processFlows(appt, 'trig-appt-status', `appt-status-${appt.id}-${appt.status}-${appt.updatedAt}`, appt.updatedAt);
          }
        }
      }

      // 7. Orders (trig-order-*)
      for (const order of (orders || [])) {
        // trig-order-new
        await processFlows(order, 'trig-order-new', `order-new-${order.id}`, order.createdAt);
        // trig-order-status
        if (order.updatedAt) {
          const isRecent = (nowStamp - order.updatedAt) < 60 * 60 * 1000;
          if (isRecent) {
             await processFlows(order, 'trig-order-status', `order-status-${order.id}-${order.status}-${order.updatedAt}`, order.updatedAt);
          }
        }
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

  // Resolve recipients
  const resolveRecipients = (flow, lead, amc_entry, profile) => {
      const ownerEmail = profile.bizEmail || profile.email || profile.smtpUser || '';
      const extraEmails = (profile.bizExtraEmails || '').split(',').map(e => e.trim()).filter(Boolean);
      const recipients = [];
      const recMode = (flow.recipient || 'customer').toLowerCase();

      if (recMode === 'customer' || recMode === 'both') {
        if (lead.email) recipients.push({ email: lead.email, isOwner: false });
        else if (amc_entry?.email) recipients.push({ email: amc_entry.email, isOwner: false });
      }
      if (recMode === 'owner' || recMode === 'both') {
        if (ownerEmail) recipients.push({ email: ownerEmail, isOwner: true });
        // Add additional notification emails
        extraEmails.forEach(email => {
          recipients.push({ email, isOwner: true });
        });
      }
      
      // Deduplicate by email address
      return recipients.filter((v, i, a) => a.findIndex(t => t.email === v.email) === i);
    };
  const targets = resolveRecipients(flow, entity, entity, profile);

  const templateData = {
    client:      entity.name || entity.client || '',
    name:        entity.name || entity.client || '',
    email:       entity.email || '',
    phone:       entity.phone || '',
    stage:       entity.stage || '',
    source:      entity.source || '',
    assignee:    entity.assign || '',
    followupDate:entity.followup || '',
    bizName:     profile.bizName || '',
    date:        new Date().toLocaleDateString('en-IN'),
    contractNo:  entity.contractNo || '',
    amount:      entity.amount || '',
    // Appointment/Order fields if available
    service:     entity.service || '',
    orderId:     entity.id?.slice(0, 8) || '',
  };

  const subject = renderTemplate(flow.subject || 'Reminder', templateData);
  const body    = renderTemplate(flow.template || 'Hello', templateData);

  const actionList = Array.isArray(flow.actions) ? flow.actions : [flow.action];

  for (const actionId of actionList) {
    if (actionId === 'act-email' && profile.smtpHost && profile.smtpUser) {
      for (const target of targets) {
        try {
          console.log(`[CRON]     📧 Attempting email to ${target.email}...`);
          await sendEmailSMTP(target.email, subject, body, profile);
          console.log(`[CRON]     ✅ Email sent successfully to ${target.email}`);
        } catch (err) {
          console.error(`[CRON]     ❌ SMTP Error for ${target.email}:`, err);
        }
      }
    }

    if (actionId === 'act-wa' && profile.waApiToken && profile.waPhoneId) {
      for (const target of targets) {
        try {
          const phone = target.phone || entity.phone || '';
          if (!phone) continue;
          const cleanPhone = phone.replace(/\D/g, '');
          const formattedPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;
          
          const selectedTemplate = profile.whatsappTemplates?.find(t => t.id === flow.whatsappTemplateId);
          console.log(`[CRON]     📱 Attempting WhatsApp to ${formattedPhone} (Template: ${selectedTemplate?.name || 'Manual'})...`);

          if (selectedTemplate) {
            const formData = new URLSearchParams();
            formData.append('apiToken', profile.waApiToken);
            formData.append('phone_number_id', profile.waPhoneId);
            formData.append('template_id', selectedTemplate.templateId);
            formData.append('phone_number', formattedPhone);
            
            if (selectedTemplate.variables) {
              selectedTemplate.variables.forEach(v => {
                formData.append(`templateVariable-${v.field}-${v.index}`, templateData[v.field] || '');
              });
            }

            const response = await fetch('https://portal.waprochat.in/api/v1/whatsapp/send/template', {
              method: 'POST',
              body: formData
            });
            const data = await response.json();
            if (response.ok && data.status === 'success') {
              console.log(`[CRON]     ✅ WhatsApp sent via Waprochat: ${data.message_id}`);
            } else {
              console.error(`[CRON]     ❌ WhatsApp Fail: ${data.message}`, data);
            }
          } else {
            console.warn(`[CRON]     ⚠️ WhatsApp skipped: No template ID found for automation "${flow.name}"`);
          }
        } catch (err) {
          console.error(`[CRON]     ❌ WhatsApp Error:`, err);
        }
      }
    }

    // Handle other actions (stage, notif, etc.) if needed on server
    if (actionId === 'act-stage' && entity.id && flow.targetStage) {
      await db.transact(db.tx.leads[entity.id].update({ stage: flow.targetStage, stageChangedAt: Date.now() }));
    }
  }

  // 1. Log activity
  await db.transact(db.tx.activityLogs[crypto.randomUUID()].update({
    entityId: entity.id,
    entityType: 'lead',
    text: `🤖 [Auto-Cron] Sent automation: ${flow.name}`,
    userId: ownerId,
    userName: 'Automation Bot (Server)',
    createdAt: Date.now(),
  }));

  // 2. Persist execution
  await db.transact(db.tx.executedAutomations[processedKey].update({
    key: processedKey, // Keep the key field for easier querying/migration if needed
    userId: ownerId,
    createdAt: Date.now(),
  }));
}

async function sendEmailSMTP(to, subject, body, profile) {
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
