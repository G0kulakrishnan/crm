import { getLeadsForOwner } from './_leads-cache.js';
import { init } from '@instantdb/admin';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

let _db = null;
function getDb() {
  if (!_db) _db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
  return _db;
}

// POST /api/lead-lookup
// Point-lookup for a lead and/or customer by phone or email.
// Used by Appointments, EcomOrders, and other modules that previously
// subscribed to the full 11k+ leads collection just to do a .find().
//
// Body: { ownerId, phone?, email? }
// Returns: { lead: {...} | null, customer: {...} | null }
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { ownerId, phone, email } = req.body || {};
    if (!ownerId) return res.status(400).json({ error: 'ownerId required' });
    if (!phone && !email) return res.status(400).json({ error: 'phone or email required' });

    const normalPhone = (phone || '').trim().toLowerCase();
    const normalEmail = (email || '').trim().toLowerCase();

    // Use shared lead cache (same cache as dashboard-stats / leads-page)
    const leads = await getLeadsForOwner(ownerId);

    // Fetch customers directly (typically a much smaller dataset)
    const db = getDb();
    const customerResult = await db.query({
      customers: { $: { where: { userId: ownerId } } },
    });
    const customers = customerResult.customers || [];

    // Find matching lead
    const matchingLead = leads.find(l => {
      if (normalPhone && (l.phone || '').trim().toLowerCase() === normalPhone) return true;
      if (normalEmail && (l.email || '').trim().toLowerCase() === normalEmail) return true;
      return false;
    }) || null;

    // Find matching customer
    const matchingCustomer = customers.find(c => {
      if (normalPhone && (c.phone || '').trim().toLowerCase() === normalPhone) return true;
      if (normalEmail && (c.email || '').trim().toLowerCase() === normalEmail) return true;
      return false;
    }) || null;

    return res.status(200).json({
      lead: matchingLead,
      customer: matchingCustomer,
    });
  } catch (err) {
    console.error('lead-lookup error:', err);
    return res.status(500).json({ error: err.message });
  }
}
