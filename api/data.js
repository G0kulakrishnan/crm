import { init, tx, id } from '@instantdb/admin';

const APP_ID = process.env.VITE_INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

// Mapping of module keys to InstantDB collection names
const COLLECTION_MAP = {
  'leads': 'leads',
  'customers': 'customers',
  'quotations': 'quotations',
  'invoices': 'invoices',
  'amc': 'amc',
  'expenses': 'expenses',
  'products': 'products',
  'vendors': 'vendors',
  'purchase-orders': 'purchaseOrders',
  'projects': 'projects',
  'tasks': 'tasks',
  'teams': 'teamMembers',
  'subs': 'subs',
  'logs': 'activityLogs'
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!APP_ID || !ADMIN_TOKEN) {
      return res.status(500).json({ error: 'Missing InstantDB configuration in backend' });
    }

    const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
    const { method } = req;
    const { module, ownerId, actorId, userName, projectId, logText, ...data } = method === 'GET' || method === 'DELETE' ? req.query : req.body;

    if (!module || !COLLECTION_MAP[module]) {
      return res.status(400).json({ error: `Invalid or missing module. Allowed: ${Object.keys(COLLECTION_MAP).join(', ')}` });
    }

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required to identify the workspace context' });
    }

    const collection = COLLECTION_MAP[module];

    /* ──────────── READ (GET) ──────────── */
    if (method === 'GET') {
      const query = { [collection]: { $: { where: { userId: ownerId } } } };
      const result = await db.query(query);
      return res.status(200).json({ success: true, data: result[collection] || [] });
    }

    /* ──────────── CREATE (POST) ──────────── */
    if (method === 'POST') {
      const newId = id();
      const payload = { ...data, userId: ownerId, actorId: actorId || ownerId, createdAt: Date.now() };
      
      const txs = [
        tx[collection][newId].update(payload),
        tx.activityLogs[id()].update({
          entityId: newId,
          entityType: module,
          text: logText || `Created new ${module} via API.`,
          userId: ownerId,
          actorId: actorId || ownerId,
          userName: userName || 'API System',
          projectId: projectId || null,
          createdAt: Date.now()
        })
      ];

      // Auto-won lead conversion for projects
      if (module === 'projects') {
        const profileQuery = await db.query({ userProfiles: { $: { where: { userId: ownerId } } } });
        const wonStage = profileQuery.userProfiles?.[0]?.wonStage || 'Won';
        const { leads } = await db.query({ leads: { $: { where: { userId: ownerId } } } });
        const lMatch = leads?.find(l => (l.name || '').trim().toLowerCase() === (data.client || '').trim().toLowerCase() && l.stage !== wonStage);
        if (lMatch) {
          txs.push(tx.leads[lMatch.id].update({ stage: wonStage }));
          txs.push(tx.activityLogs[id()].update({
            entityId: lMatch.id, entityType: 'lead', text: `Project "${data.name}" started. Lead automatically marked as Won.`,
            userId: ownerId, actorId: actorId || ownerId, userName: userName || 'API System', createdAt: Date.now()
          }));
        }
      }

      await db.transact(txs);

      return res.status(200).json({ success: true, id: newId, message: 'Record created successfully' });
    }

    /* ──────────── UPDATE (PATCH) ──────────── */
    if (method === 'PATCH') {
      const { id: targetId, ...updates } = data;
      if (!targetId) return res.status(400).json({ error: 'Record ID is required for updates' });

      await db.transact([
        tx[collection][targetId].update(updates),
        tx.activityLogs[id()].update({
          entityId: targetId,
          entityType: module,
          text: logText || `Updated ${module} via API.`,
          userId: ownerId,
          actorId: actorId || ownerId,
          userName: userName || 'API System',
          projectId: projectId || null,
          createdAt: Date.now()
        })
      ]);

      return res.status(200).json({ success: true, message: 'Record updated successfully' });
    }

    /* ──────────── DELETE (DELETE) ──────────── */
    if (method === 'DELETE') {
      const { id: targetId } = data;
      if (!targetId) return res.status(400).json({ error: 'Record ID is required for deletion' });

      const txs = [
        tx[collection][targetId].delete(),
        tx.activityLogs[id()].update({
          entityId: targetId,
          entityType: module,
          text: logText || `Deleted ${module} via API.`,
          userId: ownerId,
          actorId: actorId || ownerId,
          userName: userName || 'API System',
          projectId: projectId || null,
          createdAt: Date.now()
        })
      ];

      // Cascading delete for projects
      if (module === 'projects') {
        const { tasks } = await db.query({ tasks: { $: { where: { projectId: targetId } } } });
        if (tasks && tasks.length > 0) {
          tasks.forEach(t => txs.push(tx.tasks[t.id].delete()));
        }
      }

      await db.transact(txs);

      return res.status(200).json({ success: true, message: 'Record deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error(`API Error [${req.method} ${req.query.module}]:`, err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
