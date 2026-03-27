import { init } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function check() {
  const { activityLogs, executedAutomations } = await db.query({ 
    activityLogs: { $: { order: { serverCreatedAt: 'desc' }, limit: 100 } },
    executedAutomations: { $: { order: { serverCreatedAt: 'desc' }, limit: 100 } }
  });

  console.log('--- Activity Logs around 11:46 PM ---');
  activityLogs.filter(e => new Date(e.createdAt).getHours() === 23 && new Date(e.createdAt).getMinutes() >= 40).forEach(e => {
    console.log(`[${new Date(e.createdAt).toLocaleString()}] ${e.userName}: ${e.text}`);
  });

  console.log('\n--- Executions around 11:46 PM ---');
  executedAutomations.filter(e => new Date(e.createdAt).getHours() === 23 && new Date(e.createdAt).getMinutes() >= 40).forEach(e => {
    console.log(`ID: ${e.id} | Key: ${e.key} | CreatedAt: ${new Date(e.createdAt).toLocaleString()}`);
  });
}

check();
