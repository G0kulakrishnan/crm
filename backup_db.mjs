import 'dotenv/config';
import { init } from '@instantdb/admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!APP_ID || !ADMIN_TOKEN) {
  console.error('❌ Error: VITE_INSTANT_APP_ID or INSTANT_ADMIN_TOKEN not found in .env');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function runBackup() {
  console.log('📦 Starting T2GCRM Database Backup...');
  
  try {
    // 1. Fetch all data
    const data = await db.query({
      customers: {},
      leads: {},
      projects: {},
      quotes: {},
      invoices: {},
      tasks: {},
      activityLogs: {},
      amc: {},
      userProfiles: {},
      finance_settings: {},
      pos_orders: {},
      appointments: {}
    });

    // 2. Prepare backup folder
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    // 3. Save as JSON
    const date = new Date().toISOString().split('T')[0];
    const fileName = `backup_${date}.json`;
    const filePath = path.join(backupDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Backup successful: ${filePath}`);
    
    // 4. Cleanup old backups (Keep last 30 days)
    const files = fs.readdirSync(backupDir);
    if (files.length > 30) {
      files.sort().slice(0, files.length - 30).forEach(f => {
        fs.unlinkSync(path.join(backupDir, f));
        console.log(`🧹 Deleted old backup: ${f}`);
      });
    }

  } catch (err) {
    console.error('❌ Backup failed:', err.message);
  }
}

runBackup();
