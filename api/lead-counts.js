import { init } from '@instantdb/admin';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

// Returns lightweight lead metadata (id, createdAt, followup, assign) for the
// whole workspace — used by the Leads tab bar to show real counts across the
// full dataset, independent of the 500-record subscription cap.
//
// Bucketing is intentionally done on the CLIENT (not here) because:
//   1. "Today" depends on the user's local timezone — server timezone can
//      differ (e.g. prod UTC vs client IST) and cause off-by-one-day counts.
//   2. `followup` is often stored as a timezone-less string like
//      "2026-04-21T14:39"; only the client knows how to interpret it.
//
// POST /api/lead-counts
// Body: { ownerId, userEmail?, myName?, teamCanSeeAllLeads?, isOwner? }
// Response: { items: [{ id, createdAt, followup, assign }], total }
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
    const {
      ownerId,
      userEmail,
      myName,
      teamCanSeeAllLeads = true,
      isOwner = true,
    } = req.body || {};

    if (!ownerId) return res.status(400).json({ error: 'ownerId required' });

    // Pull full leads server-side via HTTP — this path never hits the websocket
    // handle-receive timeout that the browser subscription would at 9k+ scale.
    const result = await db.query({
      leads: { $: { where: { userId: ownerId } } },
    });
    let all = result.leads || [];

    // Apply the same team-member visibility filter the client applies
    if (!isOwner && !teamCanSeeAllLeads) {
      all = all.filter(l => !l.assign || l.assign === userEmail || l.assign === myName);
    }

    // Strip to only the fields the count logic needs so the payload stays small
    // (~80 bytes per lead × 9000 = ~720KB, easily handled over HTTP).
    const items = all.map(l => ({
      id: l.id,
      createdAt: l.createdAt || 0,
      followup: l.followup || '',
      assign: l.assign || '',
    }));

    return res.status(200).json({ items, total: items.length });
  } catch (err) {
    console.error('lead-counts error:', err);
    return res.status(500).json({ error: err.message });
  }
}
