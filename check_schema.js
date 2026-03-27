import { init } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function check() {
  const { activityLogs } = await db.query({
    activityLogs: { $: { limit: 10 } }
  });
  console.log(JSON.stringify(activityLogs[0], null, 2));
}

check().catch(console.error);
