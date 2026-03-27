import { init } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function check() {
  const { activityLogs, outbox } = await db.query({ 
    activityLogs: { $: { order: { serverCreatedAt: 'desc' }, limit: 10 } },
    outbox: { $: { order: { serverCreatedAt: 'desc' }, limit: 10 } }
  });

  console.log('\n--- Recent Activity Logs ---');
  activityLogs.forEach(e => {
    console.log(`[${new Date(e.createdAt).toLocaleString()}] ${e.text}`);
  });

  console.log('\n--- Recent Outbox Logs ---');
  outbox.forEach(o => {
    console.log(`[${new Date(o.sentAt).toLocaleString()}] To: ${o.recipient} | Status: ${o.status}`);
  });
}

check();
