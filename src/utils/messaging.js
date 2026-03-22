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
    '{date}': data.date || new Date().toLocaleDateString('en-IN'),
    '{amount}': data.amount ? `₹${data.amount.toLocaleString()}` : '',
    '{bizName}': data.bizName || '',
    '{invoiceNo}': data.invoiceNo || '',
    '{contractNo}': data.contractNo || '',
    '{email}': data.email || '',
    '{phone}': data.phone || '',
    '{stage}': data.stage || '',
    '{source}': data.source || '',
    '{assignee}': data.assignee || data.assign || '',
    '{followupDate}': data.followupDate || data.followup || '',
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
 * @param {string} to - recipient email
 * @param {string} subject
 * @param {string} body
 * @param {string} ownerId - used to fetch SMTP config from DB when no smtpConfig is provided
 * @param {string} bizName
 * @param {string} userId - for outbox logging
 * @param {object} [smtpConfig] - optional: pass raw SMTP creds to skip DB lookup (e.g. for "Test Connection")
 */
export const sendEmail = async (to, subject, body, ownerId, bizName, userId, smtpConfig = null) => {
  if (!ownerId && !smtpConfig) {
    throw new Error("Missing ownerId or smtpConfig for email sending.");
  }

  try {
    const payload = { to, subject, body, fromName: bizName || '' };
    if (smtpConfig) {
      payload.smtpConfig = smtpConfig; // bypass DB lookup
    } else {
      payload.ownerId = ownerId;
    }

    const resp = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, type: 'email' })
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

/**
 * Sends a WhatsApp message via Meta Cloud API through /api/send-whatsapp.
 * Signature updated to use ownerId for server-side token fetching.
 */
export const sendWhatsApp = async (to, message, ownerId, userId) => {
  if (!ownerId) {
    throw new Error("Missing ownerId for WhatsApp message.");
  }

  try {
    const resp = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message, ownerId, type: 'whatsapp' })
    });

    const data = await resp.json();

    if (resp.ok && data.success) {
      if (userId) await logToOutbox(userId, 'whatsapp', to, message, { status: 'Sent' });
      return 'OK';
    } else {
      throw new Error(data.error || 'Failed to send WhatsApp message');
    }
  } catch (err) {
    const errMsg = err.message || JSON.stringify(err);
    if (userId) await logToOutbox(userId, 'whatsapp', to, message, { status: 'Failed', error: errMsg });
    throw new Error(errMsg);
  }
};

export const sendWhatsAppMock = async (userId, to, body, metadata = {}) => {
  await logToOutbox(userId, 'whatsapp', to, body, metadata);
};
