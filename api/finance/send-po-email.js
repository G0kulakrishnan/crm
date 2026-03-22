// Thin wrapper — delegates to the main send-email API handler
// This allows the frontend to call /api/finance/send-po-email for PO sending
import sendEmailHandler from '../send-email.js';

export default async function handler(req, res) {
  // Re-use the same SMTP handler, just add a PO-specific prefix to the subject if needed
  return sendEmailHandler(req, res);
}
