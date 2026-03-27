import { init } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function verify() {
  const ownerId = '4fe042a3-118c-43b6-b321-7dc31646a1d7';
  const { outbox } = await db.query({
    outbox: { $: { where: { userId: ownerId }, limit: 10, order: { serverCreatedAt: 'desc' } } }
  });

  outbox.forEach(o => {
    console.log(`[${new Date(o.sentAt).toLocaleTimeString()}] TO: ${o.recipient} | SUB: ${o.subject}`);
    console.log(`CONTENT: ${o.content.substring(0, 50)}...`);
    console.log('---');
  });
}

verify().catch(console.error);
