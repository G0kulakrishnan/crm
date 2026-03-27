import { init } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function check() {
  try {
    const { automations, userProfiles } = await db.query({ 
      automations: {},
      userProfiles: {}
    });

    console.log('--- User Profiles ---');
    userProfiles.forEach(p => console.log(`${p.userId}: ${p.email || p.bizEmail}`));

    console.log('\n--- Active Automations ---');
    const active = (automations || []).filter(f => f.active !== false);
    active.forEach(f => {
      console.log(`[${f.userId}] Flow: ${f.name} | Trigger: ${f.trigger} | Action: ${JSON.stringify(f.actions || f.action)}`);
    });
  } catch (err) {
    console.error(err);
  }
}

check();
