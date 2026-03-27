import { init } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function check() {
  const ownerId = '4fe042a3-118c-43b6-b321-7dc31646a1d7';
  const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
  
  const { activityLogs, outbox } = await db.query({
    activityLogs: { $: { where: { userId: ownerId } } },
    outbox: { $: { where: { userId: ownerId } } }
  });

  const recentAL = activityLogs.filter(al => al.createdAt > fiveMinsAgo);
  const recentOB = outbox.filter(ob => ob.sentAt > fiveMinsAgo);

  console.log(`Recent Activity: ${recentAL.length}`);
  recentAL.forEach(l => console.log(`[AL] ${l.text}`));
  
  console.log(`Recent Outbox: ${recentOB.length}`);
  recentOB.forEach(o => console.log(`[OB] ${o.recipient} | ${o.subject}`));
}

check().catch(console.error);
