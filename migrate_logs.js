import { init, tx, id } from '@instantdb/admin';
import fs from 'fs';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function migrate() {
  const ownerId = '4fe042a3-118c-43b6-b321-7dc31646a1d7';
  
  // 1. Get all Activity Logs that are "Automations" but NOT in Outbox yet
  const { activityLogs, outbox } = await db.query({
    activityLogs: { $: { where: { userId: ownerId } } },
    outbox: { $: { where: { userId: ownerId } } }
  });

  const existingOutboxContents = new Set(outbox.map(o => `${o.recipient}-${o.sentAt}`));
  
  const autoLogs = activityLogs.filter(l => 
    l.text && l.text.includes('🤖 [Auto-Cron] Sent automation') &&
    l.createdAt > 1743015385000 // After 12:56 AM matching the last UI log
  );

  console.log(`Found ${autoLogs.length} missing logs to migrate.`);
  
  const txs = [];
  for (const log of autoLogs) {
    // Extract Flow Name if possible
    const flowName = log.text.split(': ')[1] || 'Automation';
    
    txs.push(tx.outbox[id()].update({
      userId: ownerId,
      recipient: 'Customer (Auto-Restored)',
      type: 'email',
      subject: `Re: ${flowName}`,
      content: log.text,
      status: 'Sent',
      sentAt: log.createdAt
    }));
  }

  if (txs.length > 0) {
    await db.transact(txs);
    console.log('✅ Migration Complete!');
  } else {
    console.log('No logs needed migration.');
  }
}

migrate().catch(console.error);
