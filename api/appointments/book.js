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

    const txs = [
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
    ];

    // Check if customer is already a lead
    if (customer.email || customer.phone) {
      const existingLeads = await db.query({ leads: { $: { where: { userId: ownerId } } } });
      const matchLead = existingLeads.leads?.find(l =>
        (customer.email && l.email === customer.email) ||
        (customer.phone && l.phone === customer.phone)
      );
      if (!matchLead) {
        txs.push(tx.leads[id()].update({
          userId: ownerId,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone,
          source: 'appointment',
          stage: 'New Enquiry',
          notes: `Booked appointment for: ${service || 'General'} on ${date} at ${time}`,
          createdAt: now,
        }));
      } else {
        // Update existing lead with new name and new note
        const oldNotes = matchLead.notes || '';
        const timestampedNote = `[${new Date().toLocaleDateString('en-IN')}] Booked appointment for: ${service || 'General'} on ${date} at ${time}`;
        const newNotes = oldNotes ? `${oldNotes}\n${timestampedNote}` : timestampedNote;
        
        txs.push(tx.leads[matchLead.id].update({
          name: customer.name, // Update to the newly provided name
          notes: newNotes,
          updatedAt: now,
        }));
      }
    }

    await db.transact(txs);

    // Send confirmation email
    if (customer.email) {
      try {
        const port = process.env.PORT || 3000;
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = req.headers.host || `localhost:${port}`;
        const notifyUrl = `${protocol}://${host}/api/notify`;
        
        await fetch(notifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'email',
            to: customer.email,
            subject: `Appointment Confirmation - ${service || 'General'}`,
            body: `Hi ${customer.name},\n\nYour appointment request has been received!\n\nDetails:\nService: ${service || 'General Appointment'}\nDate: ${date}\nTime: ${time}\n\nWe will contact you shortly to confirm.\n\nThanks,\n${ecomName || 'Our Team'}`,
            ownerId
          })
        });
      } catch (e) {
        console.error('Failed to send appointment confirmation email:', e);
      }
    }

    return res.status(200).json({ success: true, appointmentId });
  } catch (err) {
    console.error('Appointment Book API Error:', err);
    return res.status(500).json({ error: err.message || 'Booking failed' });
  }
}
