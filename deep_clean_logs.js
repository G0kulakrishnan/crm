import { init, tx, id } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function migrate() {
  const ownerId = '4fe042a3-118c-43b6-b321-7dc31646a1d7';
  
  const { outbox, activityLogs, leads } = await db.query({
    outbox: { $: { where: { userId: ownerId }, limit: 200 } },
    activityLogs: { $: { where: { userId: ownerId }, limit: 200 } },
    leads: { $: { where: { userId: ownerId } } }
  });

  console.log(`Deep cleaning ${outbox.length} records.`);
  
  const txs = [];
  for (const log of outbox) {
     let update = {};
     
     // 1. Fix Recipient
     if (!log.recipient || log.recipient === 'Customer' || log.recipient.includes('Stage changed')) {
        // Try to find the lead by looking at the activity log at the same time
        const nearbyLogs = activityLogs.filter(al => 
          al.createdAt > log.sentAt - 5000 && 
          al.createdAt < log.sentAt + 5000 &&
          al.text.includes('moved to stage')
        );
        
        if (nearbyLogs.length > 0) {
           // Parse the name from log text: "SUDARSANAM R has moved to stage..."
           const text = nearbyLogs[0].text;
           const name = text.split(' has moved to stage')[0];
           const lead = leads.find(l => l.name === name);
           update.recipient = lead ? lead.email : name;
        } else {
           update.recipient = 'tech_verified@customer.com'; // fallback
        }
     }

     // 2. Fix Subject & Content (Strip ALL 🤖 and [Auto-Cron])
     if (log.subject || log.content) {
        let cleanSubject = (log.subject || '').replace(/🤖 /g, '').replace(/\[Auto-Cron\] /g, '').replace('Sent automation: ', '').replace('Subject: ', '').replace('Subject:', '').trim();
        let cleanContent = (log.content || '').replace(/🤖 /g, '').replace(/\[Auto-Cron\] /g, '').replace('Sent automation: ', '').replace('Subject: ', '').replace('Subject:', '').trim();
        
        // Remove the double Subject: lines if they exists
        if (cleanContent.startsWith(cleanSubject)) {
           cleanContent = cleanContent.replace(cleanSubject, '').trim();
        }

        update.subject = `Lead Status Changed: ${cleanSubject}`;
        update.content = `Subject: Lead Status Changed: ${cleanSubject}\n\n${cleanContent}`;
     }
     
     if (Object.keys(update).length > 0) {
        txs.push(tx.outbox[log.id].update(update));
     }
  }

  if (txs.length > 0) {
    await db.transact(txs);
    console.log(`✅ Deep cleaned ${txs.length} logs.`);
  }
}

migrate().catch(console.error);
