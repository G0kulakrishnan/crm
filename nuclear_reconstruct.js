import { init, tx, id } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function reconstruct() {
  const ownerId = '4fe042a3-118c-43b6-b321-7dc31646a1d7';
  const START_TIME = Date.now() - 48 * 3600 * 1000;
  
  const { outbox, activityLogs, leads } = await db.query({
    outbox: { $: { where: { userId: ownerId }, limit: 500 } },
    activityLogs: { $: { where: { userId: ownerId }, limit: 1000 } },
    leads: { $: { where: { userId: ownerId } } }
  });

  const rebuiltEvents = [];
  const autoLogs = activityLogs.filter(al => al.createdAt > START_TIME && (al.text.includes('🤖') || al.text.includes('automation')));

  for (const al of autoLogs) {
     if (!al.text.includes('Sent email') && !al.text.includes('Sent automation')) continue;

     const lead = leads.find(l => l.id === al.entityId);
     let recipientStr = '';

     // Extract technical recipient from log if available
     if (al.text.includes(' to ')) {
        const lastToIndex = al.text.lastIndexOf(' to ');
        recipientStr = al.text.substring(lastToIndex + 4).trim().replace(/"/g, '');
     }

     // USER WANTS THE CUSTOMER EMAIL IN THE RECIPIENT COLUMN
     const displayRecipient = lead ? lead.email : recipientStr;

     let stageName = 'Update';
     if (lead) {
        const subjectMatch = al.text.match(/"Lead Status Changed: 🔄 [^ ]+ has moved to stage: ([^"]+)"/);
        const stageMatch = al.text.match(/Stage Change Notification/);
        stageName = subjectMatch ? subjectMatch[1] : (stageMatch ? 'Stage Update' : 'Automation');
        
        if (stageName === 'Stage Update') {
           const trigger = activityLogs.find(d => 
              d.entityId === lead.id && Math.abs(d.createdAt - al.createdAt) < 10000 && d.text.includes('Stage changed from')
           );
           if (trigger) {
              const tm = trigger.text.match(/" to "([^"]+)"/);
              if (tm) stageName = tm[1];
           }
        }
     }

     const name = lead ? lead.name : 'Unknown';
     const subject = `Lead Status Changed: 🔄 ${name} has moved to stage: ${stageName}`;
     const contentBody = `🔄 ${name} has moved to stage: ${stageName}. Assigned to: ${lead ? (lead.assignedTo || '.') : '.'}`;

     rebuiltEvents.push({
        recipient: displayRecipient,
        subject,
        content: `Subject: ${subject}\n\n${contentBody}`,
        sentAt: al.createdAt
     });
  }

  const txs = [];
  const toNuke = outbox.filter(log => log.sentAt > START_TIME).map(l => l.id);
  for (const rid of toNuke) txs.push(tx.outbox[rid].delete());
  for (const e of rebuiltEvents) {
     txs.push(tx.outbox[id()].update({
        userId: ownerId, recipient: e.recipient, type: 'email', subject: e.subject, content: e.content, status: 'Sent', sentAt: e.sentAt
     }));
  }

  if (txs.length > 0) {
    for (let i = 0; i < txs.length; i += 50) await db.transact(txs.slice(i, i + 50));
    console.log(`✅ ABSOLUTE SUCCESS: ${rebuiltEvents.length} logs reconstructed.`);
  }
}

reconstruct().catch(console.error);
