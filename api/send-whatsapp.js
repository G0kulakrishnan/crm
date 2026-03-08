export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { to, message, waToken, waPhoneNumberId } = req.body || {};

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }
    if (!waToken || !waPhoneNumberId) {
      return res.status(400).json({ error: 'Missing WhatsApp configuration (waToken, waPhoneNumberId)' });
    }

    // Sanitize Token: trim and remove duplicate "Bearer " if present
    const cleanToken = waToken.trim().replace(/^Bearer\s+/i, '');
    
    // Normalize phone number — remove ALL non-digit characters (including +)
    // Meta Cloud API expects digits only for the 'to' field.
    const phone = to.replace(/\D/g, '');

    const apiUrl = `https://graph.facebook.com/v21.0/${waPhoneNumberId}/messages`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    });

    const data = await response.json();

    if (response.ok && data.messages) {
      return res.status(200).json({ success: true, messageId: data.messages[0]?.id });
    } else {
      const errMsg = data?.error?.message || 'Failed to send WhatsApp message';
      return res.status(400).json({ error: errMsg, details: data });
    }
  } catch (err) {
    console.error('WhatsApp Send Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
