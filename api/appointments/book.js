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
    const { ownerId, ecomName, service, date, time, customer } = req.body;

    if (!ownerId || !date || !time || !customer?.name || !customer?.phone) {
      return res.status(400).json({ error: 'Missing required fields: ownerId, date, time, customer.name, customer.phone' });
    }

    // Check slot availability
    const existing = await db.query({
      appointments: { $: { where: { userId: ownerId, date, time } } },
      appointmentSettings: { $: { where: { userId: ownerId } } },
    });

    const settings = existing.appointmentSettings?.[0];
    const maxPerSlot = settings?.maxPerSlot || 1;
    const currentCount = existing.appointments?.length || 0;

    if (currentCount >= maxPerSlot) {
      return res.status(409).json({ error: `This time slot is fully booked (max ${maxPerSlot} per slot)` });
    }

    const appointmentId = id();
    const now = Date.now();

    await db.transact([
      tx.appointments[appointmentId].update({
        userId: ownerId,
        ecomName: ecomName || '',
        service: service || 'General Appointment',
        date,
        time,
        customerName: customer.name,
        customerEmail: customer.email || '',
        customerPhone: customer.phone,
        notes: customer.notes || '',
        status: 'Pending',
        createdAt: now,
      })
    ]);

    return res.status(200).json({ success: true, appointmentId });
  } catch (err) {
    console.error('Appointment Book API Error:', err);
    return res.status(500).json({ error: err.message || 'Booking failed' });
  }
}
