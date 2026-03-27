import { init } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function audit() {
  const ownerId = '4fe042a3-118c-43b6-b321-7dc31646a1d7';
  const { activityLogs } = await db.query({
    activityLogs: { $: { where: { userId: ownerId }, limit: 100 } }
  });

  const movedLogs = activityLogs.filter(l => l.text.includes('has moved to stage'));
  movedLogs.forEach(l => {
    console.log(`${new Date(l.createdAt).toLocaleTimeString()} | ${l.text}`);
  });
}

audit().catch(console.error);
