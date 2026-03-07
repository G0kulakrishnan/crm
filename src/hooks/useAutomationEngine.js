import { useEffect, useRef } from 'react';
import db from '../instant';
import { id } from '@instantdb/react';
import { renderTemplate, sendEmailMock, sendWhatsAppMock } from '../utils/messaging';

export default function useAutomationEngine(user) {
  const { data } = db.useQuery({
    leads: { $: { where: { userId: user.id } } },
    amc: { $: { where: { userId: user.id } } },
    subs: { $: { where: { userId: user.id } } },
    automations: { $: { where: { userId: user.id } } },
    userProfiles: { $: { where: { userId: user.id } } },
  });

  const leads = data?.leads || [];
  const amc = data?.amc || [];
  const subs = data?.subs || [];
  const automations = data?.automations || [];
  const profile = data?.userProfiles?.[0] || {};
  const reminders = profile.reminders || {
    amc: { days: 30, msg: 'Hello {client}, your AMC contract is expiring on {date}.' },
    sub: { days: 7, msg: 'Hello {client}, your subscription payment of {amount} is due on {date}.' },
    followup: { days: 1, msg: 'Reminder: Follow-up with {client} is scheduled for {date}.' }
  };

  // Track processed entities to avoid double-firing
  const processedRef = useRef(new Set());

  useEffect(() => {
    if (!user || (!automations.length && !profile.id)) return;

    const activeFlows = automations.filter(a => a.active);

    // Helper to log automated activity
    const logAutoActivity = async (entityId, entityType, text) => {
      const logId = id();
      await db.transact(db.tx.activityLogs[logId].update({
        entityId,
        entityType,
        text: `🤖 [Auto] ${text}`,
        userId: user.id,
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
            await sendEmailMock(user.id, l.email, 'Welcome to ' + (profile.bizName || 'TechCRM'), body, { entityId: l.id, entityType: 'lead' });
            logAutoActivity(l.id, 'lead', `Sent welcome email to ${l.email}`);
          }
          if (f.action === 'act-wa') {
            await sendWhatsAppMock(user.id, l.phone, body, { entityId: l.id, entityType: 'lead' });
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
        sendEmailMock(user.id, a.email || 'client@example.com', 'AMC Renewal Reminder', body, { entityId: a.id, entityType: 'amc' });
        logAutoActivity(a.id, 'amc', `Auto-sent renewal reminder to ${a.client}`);
      }
    });

    // 3. Subscription Payment Due Trigger
    subs.forEach(s => {
      const diff = Math.ceil((new Date(s.nextPayment) - Date.now()) / (1000 * 60 * 60 * 24));
      const key = `sub-due-${s.id}-${diff}`;
      if (diff === reminders.sub.days && !processedRef.current.has(key)) {
        processedRef.current.add(key);
        const body = renderTemplate(reminders.sub.msg, { client: s.client, date: s.nextPayment, amount: s.amount, bizName: profile.bizName });
        sendWhatsAppMock(user.id, s.phone || '0000000000', body, { entityId: s.id, entityType: 'sub' });
        logAutoActivity(s.id, 'sub', `Auto-sent payment reminder for ${s.plan}`);
      }
    });

  }, [leads, amc, subs, automations, user, profile, reminders]);
}
