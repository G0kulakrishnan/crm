import { init, tx, id } from '@instantdb/admin';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function cleanup() {
  console.log('Fetching leads and customers...');
  const { leads = [], customers = [] } = await db.query({
    leads: {},
    customers: {}
  });

  const all = [
    ...leads.map(l => ({ ...l, type: 'lead' })),
    ...customers.map(c => ({ ...c, type: 'customer' }))
  ];

  console.log(`Analyzing ${all.length} total entries...`);

  const groups = new Map();

  all.forEach(e => {
    const email = e.email?.toLowerCase().trim() || null;
    const phone = e.phone?.trim() || null;
    const ownerId = e.userId;

    // Use a composite key
    const keys = [];
    if (email) keys.push(`email:${ownerId}:${email}`);
    if (phone) keys.push(`phone:${ownerId}:${phone}`);

    keys.forEach(key => {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    });
  });

  const toDelete = new Set();
  const keep = new Set();

  for (const [key, results] of groups.entries()) {
    if (results.length > 1) {
      // Sort by completeness (has both email and phone) then by age (createdAt)
      const sorted = results.sort((a, b) => {
        const aScore = (a.email ? 1 : 0) + (a.phone ? 1 : 0);
        const bScore = (b.email ? 1 : 0) + (b.phone ? 1 : 0);
        if (aScore !== bScore) return bScore - aScore;
        return (a.createdAt || 0) - (b.createdAt || 0);
      });

      const winner = sorted[0];
      keep.add(winner.id);
      
      for (let i = 1; i < sorted.length; i++) {
        const loser = sorted[i];
        if (!keep.has(loser.id)) {
          toDelete.add(JSON.stringify({ id: loser.id, type: loser.type, name: loser.name }));
        }
      }
    }
  }

  const deleteList = Array.from(toDelete).map(s => JSON.parse(s));
  console.log(`Found ${deleteList.length} duplicate entries to remove.`);

  if (deleteList.length > 0) {
    const txs = deleteList.map(item => {
      console.log(`- Removing duplicate ${item.type}: ${item.name} (${item.id})`);
      return tx[item.type + 's'][item.id].delete();
    });

    // InstantDB transactions are capped at 500 ops usually, but we'll do batches
    const batchSize = 100;
    for (let i = 0; i < txs.length; i += batchSize) {
      await db.transact(txs.slice(i, i + batchSize));
    }
    console.log('Cleanup complete!');
  } else {
    console.log('No duplicates found.');
  }
}

cleanup().catch(console.error);
