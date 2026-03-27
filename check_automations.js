import { init } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function check() {
  const { automations } = await db.query({ automations: {} });
  console.log('\n--- Active Automations ---');
  automations.forEach(a => {
    console.log(`[${a.name}] Trigger: ${a.trigger} | Recipients: ${JSON.stringify(a.recipients || [])}`);
  });
}

check();
