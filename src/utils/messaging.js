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
import emailjs from '@emailjs/browser';

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

export const sendEmail = async (to, subject, body, config, userId) => {
  const { serviceId, templateId, publicKey, userEmail } = config;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error("EmailJS configuration is incomplete.");
  }

  // Parameters for the EmailJS template
  // Advise user to use {{subject}}, {{to_email}}, {{message}}, {{reply_to}} in their template
  const templateParams = {
    to_email: to,
    subject: subject,
    message: body,
    reply_to: userEmail || ''
  };

  try {
    const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);
    
    if (response.status === 200) {
      if (userId) await logToOutbox(userId, 'email', to, `Subject: ${subject}\n\n${body}`, { status: 'Sent' });
      return 'OK';
    } else {
      throw new Error(response.text || "Failed to send via EmailJS");
    }
  } catch (err) {
    const errMsg = err.text || err.message || JSON.stringify(err);
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
