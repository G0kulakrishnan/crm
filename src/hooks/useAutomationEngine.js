import { useEffect, useRef } from 'react';
import db from '../instant';
import { id } from '@instantdb/react';

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

  // Track processed entities to avoid double-firing
  // In a real app, this would be stored in DB per automation run
  const processedRef = useRef(new Set());

  useEffect(() => {
    if (!user || !automations.length) return;

    const activeFlows = automations.filter(a => a.active);
    if (!activeFlows.length) return;

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
      // Only trigger for leads created in the last 5 minutes (to avoid mass back-firing)
      const isNew = Date.now() - (l.createdAt || 0) < 5 * 60 * 1000;
      if (isNew && !processedRef.current.has(key)) {
        processedRef.current.add(key);
        leadFlows.forEach(f => {
          let actionText = '';
          if (f.action === 'act-email') actionText = `Sent welcome email to ${l.email}`;
          if (f.action === 'act-wa') actionText = `Sent welcome WhatsApp to ${l.phone}`;
          if (f.action === 'act-notif') actionText = `New lead notification sent to team`;
          if (actionText) logAutoActivity(l.id, 'lead', actionText);
        });
      }
    });

    // 2. AMC Expiring Trigger (trig-amc)
    const amcFlows = activeFlows.filter(f => f.trigger === 'trig-amc');
    amc.forEach(a => {
      const diff = Math.ceil((new Date(a.endDate) - Date.now()) / (1000 * 60 * 60 * 24));
      const key = `amc-exp-${a.id}`;
      if (diff <= 30 && diff > 0 && !processedRef.current.has(key)) {
        processedRef.current.add(key);
        amcFlows.forEach(f => {
          let actionText = '';
          if (f.action === 'act-email') actionText = `Sent AMC renewal email to ${a.client}`;
          if (f.action === 'act-wa') actionText = `Sent AMC renewal WhatsApp to ${a.client}`;
          if (actionText) logAutoActivity(a.id, 'amc', actionText);
        });
      }
    });

    // 3. Payment Due Trigger (trig-payment)
    const subFlows = activeFlows.filter(f => f.trigger === 'trig-payment');
    subs.forEach(s => {
      const diff = Math.ceil((new Date(s.nextPayment) - Date.now()) / (1000 * 60 * 60 * 24));
      const key = `sub-due-${s.id}`;
      if (diff <= 7 && diff > 0 && !processedRef.current.has(key)) {
        processedRef.current.add(key);
        subFlows.forEach(f => {
          let actionText = '';
          if (f.action === 'act-wa') actionText = `Sent payment reminder WhatsApp for ${s.plan}`;
          if (f.action === 'act-email') actionText = `Sent payment reminder email for ${s.plan}`;
          if (actionText) logAutoActivity(s.id, 'sub', actionText);
        });
      }
    });

  }, [leads, amc, subs, automations, user]);
}
