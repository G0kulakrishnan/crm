import { init } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function diagnose() {
  const ownerId = '4fe042a3-118c-43b6-b321-7dc31646a1d7';
  const { activityLogs, outbox } = await db.query({
    activityLogs: { $: { where: { userId: ownerId }, limit: 10 } },
    outbox: { $: { where: { userId: ownerId }, limit: 10 } }
  });

  console.log('--- LATEST ACTIVITY ---');
  activityLogs.forEach(l => console.log(`[${new Date(l.createdAt).toLocaleTimeString()}] ${l.text}`));
  
  console.log('\n--- LATEST OUTBOX ---');
  outbox.forEach(o => console.log(`[${new Date(o.sentAt).toLocaleTimeString()}] TO: ${o.recipient} | SUB: ${o.subject}`));
}

diagnose().catch(console.error);
