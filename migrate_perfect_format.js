import { init, tx, id } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function migrate() {
  const ownerId = '4fe042a3-118c-43b6-b321-7dc31646a1d7';
  
  const { outbox } = await db.query({
    outbox: { $: { where: { userId: ownerId }, limit: 200 } }
  });

  console.log(`Auditing ${outbox.length} records...`);
  
  const txs = [];
  for (const log of outbox) {
     const hasEmoji = log.content && log.content.includes('🤖');
     const hasSubjectPrefix = log.subject && log.subject.includes('Subject:');
     
     if (hasEmoji || hasSubjectPrefix) {
        let cleanSubject = (log.subject || 'Notification').replace('Subject: ', '').replace('Subject:', '').trim();
        
        txs.push(tx.outbox[log.id].update({
          subject: cleanSubject,
          content: `Subject: ${cleanSubject}\n\n${(log.content || '').replace(/🤖 \[Auto-Cron\] /g, '')}`
        }));
     }
  }

  if (txs.length > 0) {
    await db.transact(txs);
    console.log(`✅ Refined ${txs.length} logs to Perfect Format.`);
  }
}

migrate().catch(console.error);
