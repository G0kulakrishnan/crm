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
 * Logs a message to the Outbox collection (Simulated Delivery)
 */
const logToOutbox = async (userId, type, recipient, content, metadata = {}) => {
  const outboxId = id();
  await db.transact(db.tx.outbox[outboxId].update({
    userId,
    type, // 'email' | 'whatsapp'
    recipient,
    content,
    status: 'Sent', // Simulated as success
    sentAt: Date.now(),
    ...metadata
  })).catch(e => console.error("Outbox logging failed", e));
  
  console.log(`🚀 [Outbox] ${type.toUpperCase()} sent to ${recipient}:`, content);
};

export const sendEmailMock = async (userId, to, subject, body, metadata = {}) => {
  await logToOutbox(userId, 'email', to, `Subject: ${subject}\n\n${body}`, metadata);
};

export const sendWhatsAppMock = async (userId, to, body, metadata = {}) => {
  await logToOutbox(userId, 'whatsapp', to, body, metadata);
};
