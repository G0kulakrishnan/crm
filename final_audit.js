import { init } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function check() {
  const { automations } = await db.query({ 
    automations: { $: { where: { userId: '4fe042a3-118c-43b6-b321-7dc31646a1d7' } } } 
  });

  console.log('--- Automations for Main User ---');
  automations.forEach(f => {
    console.log(`ID: ${f.id} | Name: ${f.name} | Trigger: ${f.trigger} | Active: ${f.active}`);
  });
}

check();
