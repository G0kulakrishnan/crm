import { useEffect, useRef } from 'react';
import db from '../instant';
import { id } from '@instantdb/react';
import { renderTemplate, sendEmailMock, sendWhatsAppMock, sendEmail } from '../utils/messaging';

/**
 * Calculates the delay offset in milliseconds from a delay config object.
 * Returns a NEGATIVE value when dir='before' so the engine fires early.
 * @param {{ value: number, unit: 'minutes'|'hours'|'days', dir?: 'immediately'|'after'|'before' }} delay
 */
const delayMs = (delay) => {
  if (!delay || !delay.value || delay.dir === 'immediately') return 0;
  const multipliers = { minutes: 60 * 1000, hours: 60 * 60 * 1000, days: 24 * 60 * 60 * 1000 };
  const ms = (delay.value || 0) * (multipliers[delay.unit] || 0);
  return delay.dir === 'before' ? -ms : ms;
};


/**
 * Resolves a lead field value for condition matching.
 * Supports nested custom fields via "custom.FieldName" notation.
 */
const getLeadField = (lead, fieldId) => {
  if (!lead || !fieldId) return '';
  if (fieldId.startsWith('custom.')) {
    const cfName = fieldId.replace('custom.', '');
    return (lead.custom || {})[cfName] || '';
  }
  return lead[fieldId] || '';
};

/**
 * Returns true if the lead matches ALL conditions defined on the automation.
 * Supports operators: 'is', 'is not', 'contains'.
 */
const matchesConditions = (flow, lead) => {
  if (!flow.conditions || flow.conditions.length === 0) return true;
  return flow.conditions.every(cond => {
    const fieldVal = (getLeadField(lead, cond.field) || '').toLowerCase();
    const condVal  = (cond.value || '').toLowerCase();
    if (cond.op === 'is')       return fieldVal === condVal;
    if (cond.op === 'is not')   return fieldVal !== condVal;
    if (cond.op === 'contains') return fieldVal.includes(condVal);
    return true;
  });
};


export default function useAutomationEngine(user, ownerId) {
  const { data } = db.useQuery({
    leads: { $: { where: { userId: ownerId } } },
    amc:   { $: { where: { userId: ownerId } } },
    automations: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } },
    campaigns: { $: { where: { userId: ownerId } } },
  });

  const leads      = data?.leads      || [];
  const amc        = data?.amc        || [];
  const automations = data?.automations || [];
  const campaigns  = data?.campaigns  || [];
  const profile    = data?.userProfiles?.[0] || {};

  // Fallback reminders from profile settings (used for AMC days threshold)
  const reminders = profile.reminders || {
    amc:     { days: 30, msg: 'Hello {client}, your AMC contract is expiring on {date}.' },
    followup:{ days: 1,  msg: 'Reminder: Follow-up with {client} is scheduled on {date}.' },
  };

  // Track processed trigger+flow pairs to avoid re-firing
  const processedRef = useRef(new Set());

  // Poll every minute for time-based/delayed automations
  useEffect(() => {
    const interval = setInterval(() => {
      // Intentional: force re-evaluation every 60s without state mutation
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user || !ownerId || (!automations.length && !profile.id && !campaigns.length)) return;

    const activeFlows = automations.filter(a => a.active);
    const nowStamp   = Date.now();

    // ─── helpers ────────────────────────────────────────────────────────────────

    const logAutoActivity = async (entityId, entityType, text) => {
      await db.transact(db.tx.activityLogs[id()].update({
        entityId,
        entityType,
        text: `🤖 [Auto] ${text}`,
        userId: ownerId,
        userName: 'Automation Bot',
        createdAt: Date.now(),
      }));
    };

    const logWarning = (msg) => console.warn(`[Automation] ⚠️ ${msg}`);

    /**
     * Resolve recipients based on flow.recipient setting.
     * Returns an array of { to, toOwner } pairs to process.
     */
    const resolveRecipients = (flow, lead) => {
      // Prioritize the actual business email for notifications over the SMTP username
      const ownerEmail = profile.bizEmail || profile.email || profile.smtpUser || '';
      const targets = [];
      const rec = (flow.recipient || 'customer').toLowerCase();

      if (rec === 'customer' || rec === 'both') {
        if (lead?.email) targets.push({ email: lead.email, phone: lead.phone, isOwner: false });
      }
      if (rec === 'owner' || rec === 'both') {
        if (ownerEmail) targets.push({ email: ownerEmail, phone: ownerEmail, isOwner: true });
      }

      // De-duplicate: Ensure we don't send to the same email twice in one go
      const uniqueTags = [];
      const seen = new Set();
      for (const t of targets) {
        const key = `${t.email.toLowerCase()}_${t.isOwner}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueTags.push(t);
        }
      }

      console.log(`[Automation] 👥 Resolved recipients for "${rec}":`, uniqueTags.map(t => t.email));
      return uniqueTags;
    };

    /**
     * Execute all actions configured on an automation for a given lead.
     */
    const executeAction = async (flow, lead, amc_entry, logEntityId, logEntityType) => {
      const templateData = {
        name:        lead?.name    || amc_entry?.client || '',
        client:      lead?.name    || amc_entry?.client || '',
        email:       lead?.email   || '',
        phone:       lead?.phone   || '',
        stage:       lead?.stage   || '',
        source:      lead?.source  || '',
        assign:      lead?.assign  || '',
        assignee:    lead?.assign  || '',
        followup:    lead?.followup || '',
        followupDate:lead?.followup || '',
        bizName:     profile.bizName || '',
        date:        amc_entry?.endDate || new Date().toLocaleDateString('en-IN'),
        contractNo:  amc_entry?.contractNo || '',
        amount:      amc_entry?.amount || lead?.amount || '',
      };

      const body    = renderTemplate(flow.template || 'Hello {client}, this is an automated message from {bizName}.', templateData);
      const subject = renderTemplate(flow.subject  || `Message from ${profile.bizName || 'your CRM'}`, templateData);

      const recipients = resolveRecipients(flow, lead || { email: amc_entry?.email, phone: amc_entry?.phone, name: amc_entry?.client });

      // Support both new actions[] array and legacy action string
      const actionList = Array.isArray(flow.actions) && flow.actions.length > 0
        ? flow.actions
        : (flow.action ? [flow.action] : []);

      for (const actionId of actionList) {
        // Warn if no recipients resolved for messaging actions
        if (['act-email','act-wa','act-sms'].includes(actionId) && recipients.length === 0) {
          logWarning(`No recipients for action "${actionId}" on flow "${flow.name}". Lead may be missing email/phone.`);
          await logAutoActivity(logEntityId, logEntityType, `⚠️ Skipped "${actionId}": lead has no email/phone address.`);
        }

        for (const target of recipients) {
          try {
            if (actionId === 'act-email') {
              console.log(`[Automation] 📧 Sending email to ${target.email} for flow: ${flow.name}`);
              if (profile.smtpHost && profile.smtpUser) {
                await sendEmail(target.email, subject, body, ownerId, profile.bizName, ownerId);
              } else {
                await sendEmailMock(ownerId, target.email, subject, body, { entityId: logEntityId, entityType: logEntityType });
              }
              await logAutoActivity(logEntityId, logEntityType, `Sent email "${subject}" to ${target.email}`);
            }

            if (actionId === 'act-wa') {
              await sendWhatsAppMock(ownerId, target.phone, body, { entityId: logEntityId, entityType: logEntityType });
              await logAutoActivity(logEntityId, logEntityType, `Sent WhatsApp to ${target.phone}`);
            }

            if (actionId === 'act-sms') {
              await logAutoActivity(logEntityId, logEntityType, `SMS queued to ${target.phone}: ${body}`);
            }

            if (actionId === 'act-notif') {
              await logAutoActivity(logEntityId, logEntityType, body || `Notification: ${flow.name}`);
            }

            if (actionId === 'act-stage' && lead?.id && flow.targetStage) {
              // Automatically move lead to the configured target stage
              await db.transact(db.tx.leads[lead.id].update({
                stage: flow.targetStage,
                stageChangedAt: Date.now(),
              }));
              await logAutoActivity(logEntityId, logEntityType, `Stage updated to "${flow.targetStage}" by automation "${flow.name}"`);
            }
          } catch (err) {
            console.error(`[Automation] Action "${actionId}" failed for automation "${flow.name}":`, err);
          }
        }
      }
    };


    /**
     * Check if a delayed automation is ready to fire.
     * Fire only once per trigger+automation pair using a processedRef key.
     */
    const shouldFire = (flow, triggerKey, triggerTimestamp) => {
      const waitMs = delayMs(flow.delay);
      const fireAt = (triggerTimestamp || 0) + waitMs;
      const ready  = nowStamp >= fireAt;
      const key    = `${triggerKey}_${flow.id}`;

      if (ready && !processedRef.current.has(key)) {
        processedRef.current.add(key);
        return true;
      }
      return false;
    };

    // ─── 1. New Lead Trigger (trig-lead) ────────────────────────────────────────
    const leadFlows = activeFlows.filter(f => f.trigger === 'trig-lead');
    console.log(`[Automation] 🔍 Checking ${leadFlows.length} lead-creation flows against ${leads.length} leads`);
    leads.forEach(lead => {
      leadFlows.forEach(flow => {
        if (!matchesConditions(flow, lead)) return;
        if (shouldFire(flow, `lead-new-${lead.id}`, lead.createdAt)) {
          console.log(`[Automation] ⚡ Firing flow "${flow.name}" for lead: ${lead.name}`);
          executeAction(flow, lead, null, lead.id, 'lead');
        }
      });
    });

    // ─── 2. Stage Changed Trigger (trig-stage) ──────────────────────────────────
    // Fires when stageChangedAt is within 60 minutes.
    // Key uses stageChangedAt timestamp so every distinct change event fires.
    const stageFlows = activeFlows.filter(f => f.trigger === 'trig-stage');
    console.log(`[Automation] 🔍 Checking ${stageFlows.length} stage-change flows against ${leads.length} leads`);
    leads.forEach(lead => {
      if (!lead.stageChangedAt) return;
      const isRecent = nowStamp - lead.stageChangedAt < 60 * 60 * 1000; // extended to 60 minutes
      if (!isRecent) return;
      stageFlows.forEach(flow => {
        if (!matchesConditions(flow, lead)) return;
        // Use stageChangedAt timestamp in key so each real change event fires once
        if (shouldFire(flow, `lead-stage-${lead.id}-${lead.stageChangedAt}`, lead.stageChangedAt)) {
          console.log(`[Automation] ⚡ Stage-change flow "${flow.name}" firing for: ${lead.name} → ${lead.stage}`);
          logAutoActivity(lead.id, 'lead', `Automation "${flow.name}" triggered by stage change to "${lead.stage}"`);
          executeAction(flow, lead, null, lead.id, 'lead');
        }
      });
    });


    // ─── 3. Follow-Up Due Trigger (trig-followup) ───────────────────────────────
    const followupFlows = activeFlows.filter(f => f.trigger === 'trig-followup');
    leads.forEach(lead => {
      if (!lead.followup) return;
      const followupDate = new Date(lead.followup).setHours(0, 0, 0, 0);
      const today        = new Date().setHours(0, 0, 0, 0);
      if (followupDate !== today) return;
      followupFlows.forEach(flow => {
        if (!matchesConditions(flow, lead)) return;
        if (shouldFire(flow, `lead-followup-${lead.id}-${lead.followup}`, today)) {
          executeAction(flow, lead, null, lead.id, 'lead');
        }
      });
    });

    // ─── 4. AMC Expiring Trigger (trig-amc) ─────────────────────────────────────
    const amcFlows = activeFlows.filter(f => f.trigger === 'trig-amc');
    amc.forEach(entry => {
      const daysLeft = Math.ceil((new Date(entry.endDate) - nowStamp) / (1000 * 60 * 60 * 24));
      if (daysLeft !== reminders.amc.days) return;
      amcFlows.forEach(flow => {
        if (shouldFire(flow, `amc-exp-${entry.id}-${daysLeft}`, nowStamp)) {
          // Use AMC entry as the "lead" context for templates
          const amcAsLead = { name: entry.client, email: entry.email, phone: entry.phone };
          executeAction(flow, amcAsLead, entry, entry.id, 'amc');
        }
      });
    });

    // ─── 5. Payment Due Trigger (trig-payment) ──────────────────────────────────
    const paymentFlows = activeFlows.filter(f => f.trigger === 'trig-payment');
    leads.forEach(lead => {
      if (!lead.paymentDue) return;
      const payDueDate = new Date(lead.paymentDue).setHours(0, 0, 0, 0);
      const today      = new Date().setHours(0, 0, 0, 0);
      if (payDueDate !== today) return;
      paymentFlows.forEach(flow => {
        if (!matchesConditions(flow, lead)) return;
        if (shouldFire(flow, `lead-payment-${lead.id}-${lead.paymentDue}`, today)) {
          executeAction(flow, lead, null, lead.id, 'lead');
        }
      });
    });

    // ─── 6. Scheduled Campaigns ─────────────────────────────────────────────────
    const runScheduledCampaigns = async () => {
      const dueCampaigns = campaigns.filter(c => c.status === 'Scheduled' && c.scheduledFor && c.scheduledFor <= nowStamp);

      for (const camp of dueCampaigns) {
        if (processedRef.current.has('camp-' + camp.id)) continue;
        processedRef.current.add('camp-' + camp.id);

        console.log(`[Automation] Triggering scheduled campaign: ${camp.name}`);
        await db.transact(db.tx.campaigns[camp.id].update({ status: 'Sending...' }));

        const activeStages  = new Set(camp.filters?.stages  || []);
        const activeSources = new Set(camp.filters?.sources || []);
        const activeLabels  = new Set(camp.filters?.labels  || []);

        const targetAudience = leads.filter(l => {
          if (camp.channel === 'email'    && !l.email) return false;
          if (camp.channel === 'whatsapp' && !l.phone) return false;
          const stgMatch = activeStages.size  === 0 || activeStages.has(l.stage);
          const srcMatch = activeSources.size === 0 || activeSources.has(l.source);
          const lblMatch = activeLabels.size  === 0 || activeLabels.has(l.label);
          return stgMatch && srcMatch && lblMatch;
        });

        let sentCount = 0;
        for (const lead of targetAudience) {
          try {
            const isEmail = camp.channel === 'email';
            const pSubj   = (camp.subject || '').replace(/{{name}}/g, lead.name || 'Friend').replace(/{{email}}/g, lead.email || '');
            const pBody   = (camp.body   || '').replace(/{{name}}/g, lead.name || 'Friend').replace(/{{email}}/g, lead.email || '');
            const logText = isEmail
              ? `Received scheduled email campaign: "${camp.name}"\nSubject: ${pSubj}`
              : `Received scheduled WhatsApp campaign: "${camp.name}"`;

            if (isEmail) {
              await sendEmail(lead.email, pSubj, pBody, ownerId, profile?.bizName, ownerId);
            } else {
              await sendWhatsAppMock(ownerId, lead.phone, pBody, { entityId: lead.id, entityType: 'lead' });
            }

            await db.transact(db.tx.activityLogs[id()].update({
              entityId: lead.id, entityType: 'lead',
              text: logText, userId: ownerId,
              userName: 'System (Campaign)', createdAt: Date.now(),
            }));
            sentCount++;
          } catch (err) {
            console.error(`[Campaign] Failed for ${lead.email || lead.phone}:`, err);
          }
          await new Promise(r => setTimeout(r, 1500));
        }

        await db.transact(db.tx.campaigns[camp.id].update({ status: 'Completed', sentCount }));
      }
    };

    runScheduledCampaigns();

  }, [leads, amc, automations, campaigns, user, profile, reminders]);
}
