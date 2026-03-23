import { init } from '@instantdb/admin';
import 'dotenv/config';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function check() {
  const profile = (await db.query({ 
    userProfiles: { $: { where: { email: 'santhanam.gokul@gmail.com' } } }
  })).userProfiles[0];
  
  if (!profile) return console.log('No profile found');
  
  const data = await db.query({ 
    leads: { $: { where: { userId: profile.userId } } }
  });
  
  console.log(`Total leads for ${profile.email}: ${data.leads.length}`);
  const wonLeads = data.leads.filter(l => l.stage === (profile.wonStage || 'Won'));
  console.log(`Leads in "Won" stage: ${wonLeads.length}`);
  if (wonLeads.length > 0) {
    console.log('Sample Won lead:', wonLeads[0].name);
  }
}

check();
