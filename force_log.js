import { init, id, tx } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function forceLog() {
  const ownerId = '4fe042a3-118c-43b6-b321-7dc31646a1d7';
  
  console.log('Forcing a log entry for owner:', ownerId);
  
  await db.transact(tx.outbox[id()].update({
    userId: ownerId,
    recipient: 'verified@diagnostic.com',
    type: 'email',
    subject: 'Verified UI Test',
    content: 'If you see this, your Messaging Logs UI is definitely working!',
    status: 'Sent',
    sentAt: Date.now()
  }));
  
  console.log('✅ Force log committed.');
}

forceLog().catch(console.error);
