import { init, tx, id } from '@instantdb/admin';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

/**
 * Dedicated Call Logs API for Android App integration.
 * Supports batch sync of call logs from mobile devices.
 *
 * Endpoints:
 *   GET    /api/call-logs?ownerId=xxx                    - List all call logs
 *   GET    /api/call-logs?ownerId=xxx&since=timestamp    - Get logs after a timestamp (for sync)
 *   POST   /api/call-logs                                - Create single call log
 *   POST   /api/call-logs  (body: { batch: [...] })      - Batch create multiple call logs
 *   PATCH  /api/call-logs                                - Update a call log
 *   DELETE /api/call-logs                                - Delete a call log
 */
/** Derive call outcome from available data — don't blindly default to 'Connected' */
function deriveOutcome(entry) {
  // Trust explicit outcome from mobile/caller if present
  if (entry.outcome && entry.outcome !== '') return entry.outcome;
  // Derive from duration: if > 0 then connected
  if (entry.duration && Number(entry.duration) > 0) return 'Connected';
  // Missed calls
  if (entry.direction === 'Missed') return 'No Answer';
  // Default for outgoing/incoming with no duration
  return 'No Answer';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!APP_ID || !ADMIN_TOKEN) {
      return res.status(500).json({ error: 'Missing InstantDB configuration' });
    }

    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
    const { method } = req;
    const params = { ...req.query, ...(req.body || {}) };
    const { ownerId } = params;

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required' });
    }

    /* ── GET: List / Sync ── */
    if (method === 'GET') {
      const { callLogs, leads } = await db.query({
        callLogs: { $: { where: { userId: ownerId } } },
        leads: { $: { where: { userId: ownerId } } },
      });

      let logs = callLogs || [];

      // Filter by since timestamp for incremental sync
      const since = params.since ? Number(params.since) : null;
      if (since) {
        logs = logs.filter(l => (l.createdAt || 0) > since || (l.updatedAt || 0) > since);
      }

      // Enrich with lead info
      const leadMap = Object.fromEntries((leads || []).map(l => [l.phone?.replace(/\D/g, ''), l]));
      const enriched = logs.map(log => {
        const cleanPhone = log.phone?.replace(/\D/g, '') || '';
        const matchedLead = log.leadId
          ? (leads || []).find(l => l.id === log.leadId)
          : leadMap[cleanPhone] || null;
        return {
          ...log,
          matchedLeadName: matchedLead?.name || null,
          matchedLeadId: matchedLead?.id || null,
        };
      });

      return res.status(200).json({ success: true, data: enriched, count: enriched.length });
    }

    /* ── POST: Create (single or batch) ── */
    if (method === 'POST') {
      const { batch, ...singleData } = params;

      // Batch mode: array of call logs from Android app
      if (Array.isArray(batch) && batch.length > 0) {
        // Auto-match phones to leads
        const { leads } = await db.query({ leads: { $: { where: { userId: ownerId } } } });
        const leadMap = Object.fromEntries((leads || []).map(l => [l.phone?.replace(/\D/g, ''), l]));

        const txs = batch.map(entry => {
          const cleanPhone = entry.phone?.replace(/\D/g, '') || '';
          const matched = leadMap[cleanPhone] || null;
          return tx.callLogs[id()].update({
            phone: entry.phone || '',
            contactName: entry.contactName || matched?.name || '',
            direction: entry.direction || 'Incoming',
            outcome: deriveOutcome(entry),
            duration: entry.duration ? Number(entry.duration) : 0,
            notes: entry.notes || '',
            leadId: matched?.id || '',
            leadName: matched?.name || entry.contactName || '',
            staffEmail: entry.staffEmail || '',
            staffName: entry.staffName || '',
            userId: ownerId,
            actorId: entry.actorId || ownerId,
            createdAt: entry.createdAt || Date.now(),
            updatedAt: Date.now(),
            source: 'android',
          });
        });

        await db.transact(txs);
        return res.status(201).json({ success: true, created: batch.length });
      }

      // Single create
      const { leads } = await db.query({ leads: { $: { where: { userId: ownerId } } } });
      const cleanPhone = singleData.phone?.replace(/\D/g, '') || '';
      const matched = (leads || []).find(l => l.phone?.replace(/\D/g, '') === cleanPhone);

      const newId = id();
      await db.transact(tx.callLogs[newId].update({
        phone: singleData.phone || '',
        contactName: singleData.contactName || matched?.name || '',
        direction: singleData.direction || 'Outgoing',
        outcome: deriveOutcome(singleData),
        duration: singleData.duration ? Number(singleData.duration) : 0,
        notes: singleData.notes || '',
        leadId: singleData.leadId || matched?.id || '',
        leadName: matched?.name || singleData.contactName || '',
        staffEmail: singleData.staffEmail || '',
        staffName: singleData.staffName || '',
        userId: ownerId,
        actorId: singleData.actorId || ownerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        source: singleData.source || 'api',
      }));

      return res.status(201).json({ success: true, id: newId });
    }

    /* ── PATCH: Update ── */
    if (method === 'PATCH') {
      const { id: logId, ...updates } = params;
      if (!logId) return res.status(400).json({ error: 'id is required' });

      updates.updatedAt = Date.now();
      delete updates.ownerId;
      await db.transact(tx.callLogs[logId].update(updates));
      return res.status(200).json({ success: true });
    }

    /* ── DELETE ── */
    if (method === 'DELETE') {
      const logId = params.id;
      if (!logId) return res.status(400).json({ error: 'id is required' });
      await db.transact(tx.callLogs[logId].delete());
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Call Logs API Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
