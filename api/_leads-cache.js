import { init } from '@instantdb/admin';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

// Shared per-owner lead cache. Both /api/leads-page and /api/dashboard-stats
// read the full lead set for an owner and derive aggregates from it — sharing
// this cache means a dashboard hit and a leads-page hit within 15s only costs
// one underlying admin query.
const cache = new Map(); // ownerId -> { leads, ts }
const TTL = 15 * 1000;

let _db = null;
function getDb() {
  if (!_db) _db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
  return _db;
}

export async function getLeadsForOwner(ownerId) {
  const hit = cache.get(ownerId);
  if (hit && Date.now() - hit.ts < TTL) return hit.leads;
  const db = getDb();
  const result = await db.query({
    leads: { $: { where: { userId: ownerId } } },
  });
  const leads = result.leads || [];
  cache.set(ownerId, { leads, ts: Date.now() });
  return leads;
}

export function invalidateLeadsCache(ownerId) {
  if (ownerId) cache.delete(ownerId);
  else cache.clear();
}
