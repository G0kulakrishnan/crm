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
  'logs': 'activityLogs',
  'ecomSettings': 'ecomSettings',
  'orders': 'orders',
  'appointments': 'appointments',
  'appointmentSettings': 'appointmentSettings',
  'ecomCustomers': 'ecomCustomers',
  'memberStats': 'memberStats',
  'call-logs': 'callLogs',
  'callLogs': 'callLogs',
  'attendance': 'attendance',
};

// Normalize module keys to singular entity types for activity logs
const ENTITY_TYPE_MAP = {
  'leads': 'lead',
  'customers': 'customer',
  'quotations': 'quotation',
  'invoices': 'invoice',
  'amc': 'amc',
  'expenses': 'expense',
  'products': 'product',
  'vendors': 'vendor',
  'purchase-orders': 'purchaseOrder',
  'projects': 'project',
  'tasks': 'task',
  'teams': 'team',
  'subs': 'sub',
  'orders': 'order',
  'appointments': 'appointment',
  'call-logs': 'callLog',
  'callLogs': 'callLog',
  'attendance': 'attendance',
};

async function getStatsTx(db, ownerId, actorId, type) {
  const today = new Date().toISOString().split('T')[0];
  const { memberStats } = await db.query({ 
    memberStats: { $: { where: { userId: ownerId, memberId: actorId, date: today } } } 
  });
  
  let statsId;
  let current = { leadsWorked: 0, leadsWon: 0, tasksWorked: 0, tasksCompleted: 0, otherWorks: 0 };
  
  if (memberStats?.length > 0) {
    statsId = memberStats[0].id;
    current = memberStats[0];
  } else {
    statsId = id();
  }
  
  const updates = { 
    leadsWorked: current.leadsWorked || 0,
    leadsWon: current.leadsWon || 0,
    tasksWorked: current.tasksWorked || 0,
    tasksCompleted: current.tasksCompleted || 0,
    otherWorks: current.otherWorks || 0,
    [type]: (current[type] || 0) + 1, 
    updatedAt: Date.now() 
  };
  return tx.memberStats[statsId].update({
    ...updates,
    userId: ownerId,
    memberId: actorId,
    date: today
  });
}

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
    
    // Merge query and body params to support both URL rewrites and JSON bodies
    const params = { ...req.query, ...(req.body || {}) };
    const { module, ownerId, actorId, userName, projectId, logText, ...data } = params;

    if (!module || !COLLECTION_MAP[module]) {
      return res.status(400).json({ error: `Invalid or missing module. Received: ${module}. Allowed: ${Object.keys(COLLECTION_MAP).join(', ')}` });
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
      let payload = { ...data, userId: ownerId, actorId: actorId || ownerId, createdAt: Date.now() };

      // Handle Task Numbering
      if (module === 'tasks') {
        const { tasks } = await db.query({ tasks: { $: { where: { userId: ownerId } } } });
        const maxNum = tasks?.reduce((max, t) => Math.max(max, t.taskNumber || 0), 0) || 0;
        const nextNum = maxNum < 100 ? 101 : maxNum + 1;
        payload.taskNumber = nextNum;
      }
      
      const txs = [
        tx[collection][newId].update(payload),
        tx.activityLogs[id()].update({
          entityId: newId,
          entityType: ENTITY_TYPE_MAP[module] || module,
          text: (module === 'tasks' && !logText) ? `Task T-${payload.taskNumber} created: "${payload.title}"` : (logText || `Created new ${module} via API.`),
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

      const statsType = module === 'tasks' ? 'tasksWorked' : (module === 'leads' ? 'leadsWorked' : 'otherWorks');
      txs.push(await getStatsTx(db, ownerId, payload.actorId, statsType));

      await db.transact(txs);

      return res.status(200).json({ success: true, id: newId, message: 'Record created successfully' });
    }

    if (method === 'PATCH') {
      const { id: targetId, ...updates } = data;
      if (!targetId) return res.status(400).json({ error: 'Record ID is required for updates' });

      const txs = [
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
      ];

      // Update Stats for Completions/Wins
      if (module === 'tasks' && updates.status === 'Completed') {
        txs.push(await getStatsTx(db, ownerId, actorId || ownerId, 'tasksCompleted'));
      }
      if (module === 'leads' && (updates.stage === 'Won' || (updates.stage || '').toLowerCase().includes('won'))) {
        txs.push(await getStatsTx(db, ownerId, actorId || ownerId, 'leadsWon'));
      }

      await db.transact(txs);

      return res.status(200).json({ success: true, message: 'Record updated successfully' });
    }

    /* ──────────── DELETE (DELETE) ──────────── */
    if (method === 'DELETE') {
      const { id: targetId } = data;
      if (!targetId) return res.status(400).json({ error: 'Record ID is required for deletion' });

      const txs = [
        tx[collection][targetId].delete()
      ];

      // 1. Cascading delete for Projects (Delete tasks)
      if (module === 'projects') {
        const { tasks } = await db.query({ tasks: { $: { where: { projectId: targetId } } } });
        if (tasks && tasks.length > 0) {
          tasks.forEach(t => txs.push(tx.tasks[t.id].delete()));
        }
      }

      // 2. Universal Cascading delete for Activity Logs
      // Ensure all logs linked to this specific entity are purged
      const { activityLogs } = await db.query({ activityLogs: { $: { where: { entityId: targetId } } } });
      if (activityLogs && activityLogs.length > 0) {
        activityLogs.forEach(log => txs.push(tx.activityLogs[log.id].delete()));
      }

      // 3. Optional: Delete linked tasks for Leads/Customers
      if (module === 'leads' || module === 'customers') {
        const { tasks } = await db.query({ tasks: { $: { where: { entityId: targetId } } } });
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
