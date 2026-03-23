import { init, id } from '@instantdb/admin';
import 'dotenv/config';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!APP_ID || !ADMIN_TOKEN) {
  console.error('Missing credentials');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function migrate() {
  console.log('Fetching appointments and profiles...');
  const data = await db.query({
    appointments: {},
    userProfiles: {}
  });

  const appointments = data.appointments || [];
  const profiles = data.userProfiles || [];
  const profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.userId]: p.slug }), {});

  console.log(`Found ${appointments.length} appointments.`);
  const txs = [];

  for (const appt of appointments) {
    const slug = profileMap[appt.userId];
    if (slug && (!appt.slug)) {
      console.log(`Updating appointment ${appt.id} with slug: ${slug}`);
      txs.push(db.tx.appointments[appt.id].update({ slug }));
    }
  }

  if (txs.length > 0) {
    console.log(`Executing ${txs.length} updates...`);
    await db.transact(txs);
    console.log('Migration complete!');
  } else {
    console.log('No updates needed.');
  }
}

migrate().catch(console.error);
