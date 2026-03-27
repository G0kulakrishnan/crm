import { init } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function check() {
  const { activityLogs } = await db.query({ 
    activityLogs: { $: { order: { serverCreatedAt: 'desc' }, limit: 1 } }
  });

  if (activityLogs.length > 0) {
    console.log('CORRECT_OWNER_ID:', activityLogs[0].userId);
  } else {
    console.log('No activity logs found.');
  }
}

check();
