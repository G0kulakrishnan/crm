import { init, id, tx } from '@instantdb/admin';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!APP_ID || !ADMIN_TOKEN) {
  throw new Error('Missing environment variables: VITE_INSTANT_APP_ID or INSTANT_ADMIN_TOKEN');
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const generateId = () => crypto.randomUUID();

export default async function handler(req, res) {
  // --- MASTER SERVER SHIELD ---
  if (process.env.VITE_BLOCK_AUTOMATIONS === 'true') {
    console.log('[CRON] 🛡️ Automations are BLOCKED on this environment.');
    return res.status(200).json({ success: true, message: 'Automations blocked' });
  }

  // --- AUTOMATION TRIGGERS ---
  const { userProfiles, automations, leads, amcProfiles, appointments, ecommerceOrders } = await db.query({
    userProfiles: { $: { where: { role: 'owner' } } },
    automations: { $: { where: { active: true } } },
    leads: { $: { where: { type: 'trig-stage' } } },
    amcProfiles: { $: { where: { type: 'trig-amc' } } },
    appointments: { $: { where: { type: 'trig-appt' } } },
    ecommerceOrders: { $: { where: { type: 'trig-ecom' } } }
  });

  const txs = [];
  console.log(`[CRON] Processing ${automations.length} active automations...`);

  for (const profile of userProfiles) {
    const ownerId = profile.userId;
    const biz = profile.businessName;
    const user = profile.emailUser;
    const pass = profile.emailPass;
    const host = profile.emailHost;
    const port = parseInt(profile.emailPort);

    if (!user || !pass || !host) continue;

    const myAutomations = automations.filter(a => a.userId === ownerId);
    if (!myAutomations.length) continue;

    const transporter = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    for (const flow of myAutomations) {
      let entities = [];
      if (flow.triggerType === 'stage-change') entities = leads.filter(l => l.userId === ownerId && l.stageId === flow.triggerValue).map(e => ({ ...e, _table: 'leads' }));
      else if (flow.triggerType === 'amc-expiry') entities = amcProfiles.filter(p => p.userId === ownerId && p.daysToExpiry <= (flow.triggerValue || 0)).map(e => ({ ...e, _table: 'amcs' }));
      else if (flow.triggerType === 'new-appt') entities = appointments.filter(a => a.userId === ownerId && a.status === 'scheduled').map(e => ({ ...e, _table: 'appointments' }));
      else if (flow.triggerType === 'ecom-order') entities = ecommerceOrders.filter(o => o.userId === ownerId && o.status === 'confirmed').map(e => ({ ...e, _table: 'ecommerceOrders' }));

      for (const entity of entities) {
        const dedupeId = `${flow.id}-${entity.id}`;
        if (entity.processedAutomations?.includes(flow.id)) continue;

        try {
          // --- SEND EMAIL ---
          const recipientEmail = entity.email;
          if (!recipientEmail) continue;

          const subject = flow.subject.replace('{{name}}', entity.name);
          const body = flow.body.replace('{{name}}', entity.name);

          await transporter.sendMail({
            from: biz ? `"${biz}" <${user}>` : user,
            to: recipientEmail,
            subject,
            html: body.replace(/\n/g, '<br/>')
          });

          // --- LOGS (Unified Messaging Logs - Old Format Style) ---
          // Format based on User Screenshot Step 998 & Ground Truth Logs:
          // 🤖 [Auto] 🔄 Name has moved to stage: Stage. Assigned to: .
          const detail = `🔄 ${entity.name || 'Entity'} has moved to stage: ${flow.triggerValue}. Assigned to: ${entity.assignedTo || '.'}`;
          const cleanSubject = `Status Changed: ${entity.name || 'Entity'}`;

          txs.push(tx.outbox[id()].update({
            userId: ownerId,
            recipient: recipientEmail,
            type: 'email',
            subject: cleanSubject, 
            content: `Subject: ${cleanSubject}\n\n${detail}`,
            status: 'Sent',
            sentAt: Date.now()
          }));

          // Mark as processed
          const currentProcessed = entity.processedAutomations || [];
          txs.push(tx[entity._table][entity.id].update({
            processedAutomations: [...currentProcessed, flow.id]
          }));

          txs.push(tx.activityLogs[id()].update({
            userId: ownerId,
            text: `🤖 [Auto-Cron] Processed automation: ${flow.name} for ${entity.name}`,
            createdAt: Date.now()
          }));

        } catch (err) {
          console.error(`[CRON] Workflow failure (${flow.name}):`, err);
        }
      }
    }
  }

  if (txs.length > 0) await db.transact(txs);
  return res.status(200).json({ success: true, processed: txs.length });
}
