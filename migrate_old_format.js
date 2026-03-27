import { init, tx, id } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function migrate() {
  const ownerId = '4fe042a3-118c-43b6-b321-7dc31646a1d7';
  
  // 1. Get recent activity logs
  const { activityLogs, leads } = await db.query({
    activityLogs: { $: { where: { userId: ownerId }, order: { serverCreatedAt: 'desc' }, limit: 50 } },
    leads: { $: { where: { userId: ownerId } } }
  });

  // Helper to find lead name from log text or list
  const findLead = (text) => {
    return leads.find(l => text.includes(l.email) || text.includes(l.name)) || { name: 'Customer', email: 'verified@customer.com' };
  };

  const autoLogs = activityLogs.filter(l => 
    l.text && l.text.includes('🤖 [Auto-Cron] Sent automation') &&
    l.createdAt > 1743015385000 
  );

  console.log(`Refining and Migrating ${autoLogs.length} logs to OLD FORMAT.`);
  
  const txs = [];
  for (const log of autoLogs) {
    // Attempt to reconstruct the old subject
    let subject = "Automation Notification";
    let recipient = "Customer";
    
    if (log.text.includes('Stage Change')) {
      // Find the preceding lead change log (they usually come in pairs)
      const leadChange = activityLogs.find(al => 
        al.createdAt < log.createdAt && 
        al.createdAt > log.createdAt - 5000 &&
        al.text.includes('Stage changed from')
      );
      
      if (leadChange) {
        const parts = leadChange.text.split(': ');
        recipient = leadChange.recipient || parts[0]; // recipient field is sometimes null in manual logs
        const detail = parts[1];
        subject = `Subject: Lead Status Changed: ${detail}`;
      } else {
        subject = `Subject: Stage Change Notification`;
      }
    } else {
      subject = `Subject: ${log.text.split(': ')[1] || 'Notification'}`;
    }

    txs.push(tx.outbox[id()].update({
      userId: ownerId,
      recipient: recipient, 
      type: 'email',
      subject: subject,
      content: log.text,
      status: 'Sent',
      sentAt: log.createdAt
    }));
  }

  if (txs.length > 0) {
    await db.transact(txs);
    console.log('✅ Migration Complete!');
  }
}

migrate().catch(console.error);
