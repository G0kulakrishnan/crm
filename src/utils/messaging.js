import db from '../instant';
import { id } from '@instantdb/react';

/**
 * Replaces placeholders in a template string with actual data.
 * @param {string} template - e.g. "Hello {client}, your bill for {amount} is due on {date}"
 * @param {object} data - { client, date, amount, bizName, ... }
 */
export const renderTemplate = (template, data = {}) => {
  if (!template) return '';
  let msg = template;
  const placeholders = {
    '{client}': data.client || data.name || 'Customer',
    '{date}': data.date || '',
    '{amount}': data.amount ? `₹${data.amount.toLocaleString()}` : '',
    '{bizName}': data.bizName || '',
    '{invoiceNo}': data.invoiceNo || '',
    '{contractNo}': data.contractNo || '',
  };

  Object.entries(placeholders).forEach(([key, val]) => {
    msg = msg.replaceAll(key, val);
  });

  return msg;
};

/**
 * Logs a message to the Outbox collection
 */
const logToOutbox = async (userId, type, recipient, content, metadata = {}) => {
  const outboxId = id();
  await db.transact(db.tx.outbox[outboxId].update({
    userId,
    type, // 'email' | 'whatsapp'
    recipient,
    content,
    status: metadata.status || 'Sent',
    sentAt: Date.now(),
    ...metadata
  })).catch(e => console.error("Outbox logging failed", e));
  
  console.log(`🚀 [Outbox] ${type.toUpperCase()} sent to ${recipient}:`, content);
};

/**
 * Sends an email via the Nodemailer serverless function at /api/send-email.
 * Config object should have: { smtpHost, smtpPort, smtpUser, smtpPass, bizName }
 */
export const sendEmail = async (to, subject, body, config, userId) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass, bizName } = config;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    throw new Error("SMTP configuration is incomplete. Please fill in all SMTP fields in Settings.");
  }

  try {
    const resp = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body, smtpHost, smtpPort, smtpUser, smtpPass, fromName: bizName || '' })
    });

    const data = await resp.json();

    if (resp.ok && data.success) {
      if (userId) await logToOutbox(userId, 'email', to, `Subject: ${subject}\n\n${body}`, { status: 'Sent' });
      return 'OK';
    } else {
      throw new Error(data.error || 'Failed to send email');
    }
  } catch (err) {
    const errMsg = err.message || JSON.stringify(err);
    if (userId) await logToOutbox(userId, 'email', to, `Subject: ${subject}\n\n${body}`, { status: 'Failed', error: errMsg });
    throw new Error(errMsg);
  }
};

export const sendEmailMock = async (userId, to, subject, body, metadata = {}) => {
  await logToOutbox(userId, 'email', to, `Subject: ${subject}\n\n${body}`, metadata);
};

export const sendWhatsAppMock = async (userId, to, body, metadata = {}) => {
  await logToOutbox(userId, 'whatsapp', to, body, metadata);
};
