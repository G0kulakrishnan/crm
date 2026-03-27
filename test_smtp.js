import { init } from '@instantdb/admin';
import nodemailer from 'nodemailer';

const APP_ID = '19c240f7-1ba0-486a-95b4-adb651f63cfd';
const ADMIN_TOKEN = 'f9a421cf-f8cc-48cc-a1c3-02cf958991cf';
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function test() {
  const { userProfiles } = await db.query({ userProfiles: {} });
  const profile = userProfiles[0];
  
  console.log('Testing SMTP for:', profile.smtpUser);
  
  const transporter = nodemailer.createTransport({
    host: profile.smtpHost,
    port: parseInt(profile.smtpPort) || 587,
    secure: parseInt(profile.smtpPort) === 465,
    auth: { user: profile.smtpUser, pass: profile.smtpPass },
    tls: { rejectUnauthorized: false }
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP Connection Verified');
    
    const info = await transporter.sendMail({
      from: `"${profile.bizName}" <${profile.smtpUser}>`,
      to: 'santhanam.gokul@gmail.com',
      subject: 'Diagnostic Test',
      text: 'This is a test from the diagnostic script.'
    });
    console.log('✅ Email Sent:', info.messageId);
  } catch (err) {
    console.error('❌ SMTP Error:', err);
  }
}

test();
