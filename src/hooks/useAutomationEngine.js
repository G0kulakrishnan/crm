import { useEffect, useRef } from 'react';
import db from '../instant';
import { id } from '@instantdb/react';
import { renderTemplate, sendEmailMock, sendWhatsAppMock, sendEmail } from '../utils/messaging';

export default function useAutomationEngine(user, ownerId) {
  const { data } = db.useQuery({
    leads: { $: { where: { userId: ownerId } } },
    amc: { $: { where: { userId: ownerId } } },
    automations: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } },
    campaigns: { $: { where: { userId: ownerId } } }
  });

  const leads = data?.leads || [];
  const amc = data?.amc || [];
  const automations = data?.automations || [];
  const campaigns = data?.campaigns || [];
  const profile = data?.userProfiles?.[0] || {};
  const reminders = profile.reminders || {
    amc: { days: 30, msg: 'Hello {client}, your AMC contract is expiring on {date}.' },
    followup: { days: 1, msg: 'Reminder: Follow-up with {client} is scheduled for {date}.' }
  };

  // Track processed entities to avoid double-firing
  const processedRef = useRef(new Set());

  // Force evaluation every minute to catch scheduled campaigns/events precisely
  useEffect(() => {
    const interval = setInterval(() => {
      // Small dummy state update or just relying on natural component re-renders
      // since InstantDB sockets are mostly push-driven, but we need time-driven checks too.
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user || !ownerId || (!automations.length && !profile.id && !campaigns.length)) return;

    const activeFlows = automations.filter(a => a.active);
    const nowStamp = Date.now();

    // Helper to log automated activity
    const logAutoActivity = async (entityId, entityType, text) => {
      const logId = id();
      await db.transact(db.tx.activityLogs[logId].update({
        entityId,
        entityType,
        text: `🤖 [Auto] ${text}`,
        userId: ownerId,
        userName: 'Automation Bot',
        createdAt: Date.now()
      }));
    };

    // 1. New Lead Trigger (trig-lead)
    const leadFlows = activeFlows.filter(f => f.trigger === 'trig-lead');
    leads.forEach(l => {
      const key = `lead-new-${l.id}`;
      const isNew = Date.now() - (l.createdAt || 0) < 5 * 60 * 1000;
      if (isNew && !processedRef.current.has(key)) {
        processedRef.current.add(key);
        leadFlows.forEach(async (f) => {
          const body = renderTemplate(f.template || "Hello {client}, thanks for choosing us!", { client: l.name, bizName: profile.bizName });
          if (f.action === 'act-email') {
            await sendEmailMock(ownerId, l.email, 'Welcome to ' + (profile.bizName || 'TechCRM'), body, { entityId: l.id, entityType: 'lead' });
            logAutoActivity(l.id, 'lead', `Sent welcome email to ${l.email}`);
          }
          if (f.action === 'act-wa') {
            await sendWhatsAppMock(ownerId, l.phone, body, { entityId: l.id, entityType: 'lead' });
            logAutoActivity(l.id, 'lead', `Sent welcome WhatsApp to ${l.phone}`);
          }
          if (f.action === 'act-notif') logAutoActivity(l.id, 'lead', `New lead notification sent to team`);
        });
      }
    });

    // 2. AMC Expiring Trigger
    amc.forEach(a => {
      const diff = Math.ceil((new Date(a.endDate) - Date.now()) / (1000 * 60 * 60 * 24));
      const key = `amc-exp-${a.id}-${diff}`; // Key includes diff to fire once at the threshold
      if (diff === reminders.amc.days && !processedRef.current.has(key)) {
        processedRef.current.add(key);
        const body = renderTemplate(reminders.amc.msg, { client: a.client, date: a.endDate, bizName: profile.bizName, contractNo: a.contractNo });
        sendEmailMock(ownerId, a.email || 'client@example.com', 'AMC Renewal Reminder', body, { entityId: a.id, entityType: 'amc' });
        logAutoActivity(a.id, 'amc', `Auto-sent renewal reminder to ${a.client}`);
      }
    });

    // 4. Scheduled Campaigns Processor
    const runScheduledCampaigns = async () => {
      const dueCampaigns = campaigns.filter(c => c.status === 'Scheduled' && c.scheduledFor && c.scheduledFor <= nowStamp);
      
      for (const camp of dueCampaigns) {
        if (processedRef.current.has('camp-' + camp.id)) continue;
        processedRef.current.add('camp-' + camp.id);

        console.log(`[Automation] Triggering scheduled campaign: ${camp.name}`);
        
        // 4a. Mark as sending
        await db.transact(db.tx.campaigns[camp.id].update({ status: 'Sending...' }));

        // 4b. Filter the leads that match the saved campaign filters
        const activeStages = new Set(camp.filters?.stages || []);
        const activeSources = new Set(camp.filters?.sources || []);
        const activeLabels = new Set(camp.filters?.labels || []);

        const targetAudience = leads.filter(l => {
          if (camp.channel === 'email' && !l.email) return false;
          if (camp.channel === 'whatsapp' && !l.phone) return false;
          
          const stgMatch = activeStages.size === 0 || activeStages.has(l.stage);
          const srcMatch = activeSources.size === 0 || activeSources.has(l.source);
          const lblMatch = activeLabels.size === 0 || activeLabels.has(l.label);
          return stgMatch && srcMatch && lblMatch;
        });

        // 4c. Process emails/whatsapp
        let sentCount = 0;
        for (let i = 0; i < targetAudience.length; i++) {
          const lead = targetAudience[i];
          try {
            const isEmail = camp.channel === 'email';
            const logText = isEmail 
              ? `Received scheduled email campaign: "${camp.name}"\nSubject: ${camp.subject}`
              : `Received scheduled WhatsApp campaign: "${camp.name}"`;

            if (isEmail) {
              const pSubj = camp.subject.replace(/{{name}}/g, lead.name || 'Friend').replace(/{{email}}/g, lead.email || '');
              const pBody = camp.body.replace(/{{name}}/g, lead.name || 'Friend').replace(/{{email}}/g, lead.email || '');
              await sendEmail(lead.email, pSubj, pBody, profile, ownerId);
            } else {
              const pBody = camp.body.replace(/{{name}}/g, lead.name || 'Friend').replace(/{{email}}/g, lead.email || '');
              await sendWhatsAppMock(ownerId, lead.phone, pBody, { entityId: lead.id, entityType: 'lead' });
            }
            
            await db.transact(db.tx.activityLogs[id()].update({
              entityId: lead.id,
              entityType: 'lead',
              text: logText,
              userId: ownerId,
              userName: 'System (Campaign)',
              createdAt: Date.now()
            }));
            sentCount++;
          } catch (err) {
            console.error(`Failed scheduled campaign to ${lead.email || lead.phone}:`, err);
          }
          await new Promise(r => setTimeout(r, 1500)); 
        }

        // 4d. Mark as Completed
        await db.transact(db.tx.campaigns[camp.id].update({
          status: 'Completed',
          sentCount: sentCount
        }));
      }
    };

    runScheduledCampaigns();

  }, [leads, amc, automations, campaigns, user, profile, reminders]);
}
