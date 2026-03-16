import { init } from '@instantdb/admin';
import { id } from '@instantdb/react';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const env = req.env || process.env;
    const APP_ID = env.VITE_INSTANT_APP_ID;
    const ADMIN_TOKEN = env.INSTANT_ADMIN_TOKEN;

    if (!APP_ID || !ADMIN_TOKEN) {
      return res.status(500).json({ error: 'Missing InstantDB App ID or Admin Token in backend' });
    }

    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
    const { cart, customer, payMode, userId, actorId } = req.body || {};

    if (!cart || !userId || !actorId) {
      return res.status(400).json({ error: 'Missing required checkout data' });
    }

    // 1. Calculate totals to ensure accuracy (backend validation)
    const sub = cart.reduce((s, it) => s + (it.qty * it.rate), 0);
    const taxAmt = cart.reduce((s, it) => s + (it.qty * it.rate * (it.tax || 0) / 100), 0);
    const total = Math.round(sub + taxAmt);

    const invNo = `POS-${Date.now().toString().slice(-6)}`;
    const invoiceId = id();

    const payload = {
      no: invNo,
      client: customer ? customer.name : 'Walk-in Customer',
      customerId: customer ? customer.id : null,
      date: new Date().toISOString().split('T')[0],
      items: cart.map(it => ({ name: it.name, qty: it.qty, rate: it.rate, taxRate: it.tax || 0 })),
      total,
      status: 'Paid',
      payMode,
      userId,
      actorId,
      createdAt: Date.now(),
      type: 'POS',
      taxAmt
    };

    const txs = [db.tx.invoices[invoiceId].update(payload)];

    // 2. Fetch profile for wonStage context
    const profileData = await db.query({ userProfiles: { $: { where: { userId } } } });
    const profile = profileData.userProfiles?.[0] || {};
    const wonStage = profile.wonStage || 'Won';

    // 3. Lead matching and conversion if customer is linked
    if (customer?.name) {
      const leadData = await db.query({ leads: { $: { where: { userId } } } });
      const lMatch = (leadData.leads || []).find(l => 
        (l.name || '').trim().toLowerCase() === (customer.name || '').trim().toLowerCase() && 
        l.stage !== wonStage
      );

      if (lMatch) {
        txs.push(db.tx.leads[lMatch.id].update({ 
          stage: wonStage,
          email: lMatch.email || customer.email || '',
          phone: lMatch.phone || customer.phone || '',
          stageChangedAt: Date.now()
        }));
        txs.push(db.tx.activityLogs[id()].update({
          entityId: lMatch.id, 
          entityType: 'lead', 
          text: `Lead converted to Customer. Stage changed to ${wonStage} (via POS Billing API).`,
          userId, 
          actorId, 
          userName: actorId, // We use actorId as a fallback for userName in backend
          createdAt: Date.now()
        }));
      }
    }

    await db.transact(txs);

    return res.status(200).json({
      success: true,
      invoice: { id: invoiceId, ...payload }
    });

  } catch (err) {
    console.error('POS Bill generation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate bill' });
  }
}
