import { init, tx, id } from '@instantdb/admin';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
    const { ownerId, ecomName, customer, items, total } = req.body;

    if (!ownerId || !customer || !items?.length) {
      return res.status(400).json({ error: 'Missing required fields: ownerId, customer, items' });
    }

    const orderId = id();
    const now = Date.now();

    // 1. Create the order
    const txs = [
      tx.orders[orderId].update({
        userId: ownerId,
        ecomName,
        customerName: customer.name,
        customerEmail: customer.email || '',
        customerPhone: customer.phone,
        address: customer.address || '',
        notes: customer.notes || '',
        items: JSON.stringify(items),
        total: total || 0,
        status: 'Pending',
        createdAt: now,
      })
    ];

    // 2. Auto-create Invoice with ecom tag
    const invoiceId = id();
    const invoiceNo = `ECOM/${new Date().getFullYear()}/${Math.floor(Math.random() * 9000) + 1000}`;
    txs.push(tx.invoices[invoiceId].update({
      userId: ownerId,
      no: invoiceNo,
      client: customer.name,
      clientEmail: customer.email || '',
      clientPhone: customer.phone,
      date: now,
      dueDate: now + 7 * 24 * 60 * 60 * 1000,
      items: JSON.stringify(items.map(i => ({ name: i.name, qty: i.qty, rate: i.rate, taxRate: i.tax || 0 }))),
      total: total || 0,
      status: 'Unpaid',
      tag: 'ecom',
      orderId,
      createdAt: now,
    }));

    // 3. Auto-add to Leads if not already a lead (by email or phone)
    if (customer.email || customer.phone) {
      const existing = await db.query({ leads: { $: { where: { userId: ownerId } } } });
      const matchLead = existing.leads?.find(l =>
        (customer.email && l.email === customer.email) ||
        (customer.phone && l.phone === customer.phone)
      );
      if (!matchLead) {
        txs.push(tx.leads[id()].update({
          userId: ownerId,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone,
          source: 'E-Commerce',
          stage: 'New',
          notes: `Ordered from e-com store: ${ecomName}`,
          createdAt: now,
        }));
      }
    }

    // 4. Link order ID back to invoice
    txs.push(tx.orders[orderId].update({ invoiceId }));

    await db.transact(txs);

    return res.status(200).json({ success: true, orderId, invoiceId, invoiceNo });
  } catch (err) {
    console.error('Checkout API Error:', err);
    return res.status(500).json({ error: err.message || 'Checkout failed' });
  }
}
