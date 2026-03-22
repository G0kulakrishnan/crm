import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmt, fmtD } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const FALLBACK_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const STATUS_COLORS = {
  Pending: { bg: '#fef3c7', color: '#92400e' },
  Confirmed: { bg: '#dbeafe', color: '#1e40af' },
  Processing: { bg: '#ede9fe', color: '#5b21b6' },
  Shipped: { bg: '#d1fae5', color: '#065f46' },
  Delivered: { bg: '#dcfce7', color: '#166534' },
  Cancelled: { bg: '#fee2e2', color: '#991b1b' },
};

export default function EcomOrders({ ownerId, perms }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data } = db.useQuery({
    orders: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } },
    customers: { $: { where: { userId: ownerId } } },
    leads: { $: { where: { userId: ownerId } } },
  });

  const orders = data?.orders || [];
  const customers = data?.customers || [];
  const leads = data?.leads || [];
  const orderStatuses = data?.userProfiles?.[0]?.orderStatuses || FALLBACK_STATUSES;

  const filtered = useMemo(() => {
    let list = [...orders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (statusFilter !== 'All') list = list.filter(o => o.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o => [o.customerName, o.customerEmail, o.customerPhone, o.id].some(v => String(v || '').toLowerCase().includes(q)));
    }
    return list;
  }, [orders, statusFilter, search]);

  const updateStatus = async (orderId, status) => {
    const order = orders.find(o => o.id === orderId);
    if (!window.confirm(`Are you sure you want to change this order's status to ${status}?`)) return;
    
    const txs = [db.tx.orders[orderId].update({ status, updatedAt: Date.now() })];

    if (status === 'Delivered') {
      const existingCustomer = customers.find(c => c.phone === order.customerPhone || (c.email && c.email === order.customerEmail));
      if (!existingCustomer && order.customerPhone) {
        const newCustomerId = id();
        txs.push(db.tx.customers[newCustomerId].update({
          userId: ownerId,
          name: order.customerName || 'Unknown',
          phone: order.customerPhone || '',
          email: order.customerEmail || '',
          address: order.customerAddress || '',
          createdAt: Date.now()
        }));
        
        txs.push(db.tx.activityLogs[id()].update({
          entityId: newCustomerId, entityType: 'customer', text: `Auto-converted from E-commerce order (${order.id.slice(0,8)}) upon delivery.`,
          userId: ownerId, createdAt: Date.now()
        }));
      }
      
      // Update Lead to Converted
      const existingLead = leads.find(l => l.phone === order.customerPhone || (l.email && l.email === order.customerEmail));
      if (existingLead && existingLead.stage !== 'Converted') {
        txs.push(db.tx.leads[existingLead.id].update({ stage: 'Converted', updatedAt: Date.now() }));
      }
    }
    
    await db.transact(txs);
    toast(`Order status updated to ${status}`, 'success');

    if (order && order.customerEmail) {
      if (window.confirm(`Would you like to email ${order.customerName} about this status update?`)) {
        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'email',
              to: order.customerEmail,
              subject: `Update on your order - ${order.ecomName || 'Store'}`,
              body: `Hi ${order.customerName},\n\nThe status of your order (${orderId.slice(0, 8).toUpperCase()}) has been updated to: ${status}.\n\nThank you for shopping with us!`,
              ownerId
            })
          });
          toast('Notification sent', 'success');
        } catch (err) {
          toast('Failed to send notification', 'error');
        }
      }
    }
  };

  const totalRevenue = orders.filter(o => o.status === 'Delivered').reduce((s, o) => s + (o.total || 0), 0);
  const pending = orders.filter(o => o.status === 'Pending').length;

  return (
    <div>
      <div className="sh">
        <div>
          <h2>🛒 E-Commerce Orders</h2>
          <div className="sub">Manage orders from your public store</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="stat-card sc-blue"><div className="lbl">Total Orders</div><div className="val">{orders.length}</div></div>
        <div className="stat-card sc-yellow"><div className="lbl">Pending</div><div className="val">{pending}</div></div>
        <div className="stat-card sc-green"><div className="lbl">Revenue (Delivered)</div><div className="val" style={{ fontSize: 16 }}>{fmt(totalRevenue)}</div></div>
        <div className="stat-card sc-purple"><div className="lbl">Delivered</div><div className="val">{orders.filter(o => o.status === 'Delivered').length}</div></div>
      </div>

      <div className="tw">
        <div className="tw-head">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <h3>Orders ({filtered.length})</h3>
            {['All', ...orderStatuses].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 11, padding: '3px 10px' }}>
                {s}
              </button>
            ))}
          </div>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="si" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="tw-scroll">
          <table>
            <thead><tr>
              <th>#</th><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No orders yet. Orders from your store will appear here.</td></tr>
              )}
              {filtered.map((o, i) => {
                const items = Array.isArray(o.items) ? o.items : (o.items ? JSON.parse(o.items) : []);
                const sc = STATUS_COLORS[o.status] || STATUS_COLORS.Pending;
                return (
                  <tr key={o.id}>
                    <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                    <td><code style={{ fontSize: 10, background: 'var(--bg-soft)', padding: '2px 6px', borderRadius: 4 }}>{o.id?.slice(0, 8)}...</code></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.customerName || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{o.customerPhone}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {items.slice(0, 2).map((it, j) => <div key={j}>{it.name} × {it.qty}</div>)}
                      {items.length > 2 && <div style={{ color: 'var(--muted)', fontSize: 10 }}>+{items.length - 2} more</div>}
                    </td>
                    <td style={{ fontWeight: 700 }}>{fmt(o.total)}</td>
                    <td>
                      <select
                        value={o.status || 'Pending'}
                        onChange={e => {
                          const val = e.target.value;
                          if (val !== o.status) updateStatus(o.id, val);
                        }}
                        style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1.5px solid', borderColor: sc.color || '#3b82f6', background: sc.bg || '#eff6ff', color: sc.color || '#1d4ed8', fontWeight: 700 }}>
                        {orderStatuses.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: 11 }}>{o.createdAt ? fmtD(o.createdAt) : '—'}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOrder(o)}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="mo open">
          <div className="mo-box" style={{ maxWidth: 540 }}>
            <div className="mo-head">
              <h3>Order Details</h3>
              <button className="btn-icon" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>
            <div className="mo-body" style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  ['Customer', selectedOrder.customerName],
                  ['Phone', selectedOrder.customerPhone],
                  ['Email', selectedOrder.customerEmail],
                  ['Date', selectedOrder.createdAt ? fmtD(selectedOrder.createdAt) : '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: 'var(--bg-soft)', padding: '10px 14px', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontWeight: 600, marginTop: 2 }}>{val || '—'}</div>
                  </div>
                ))}
              </div>
              {selectedOrder.address && (
                <div style={{ background: 'var(--bg-soft)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Delivery Address</div>
                  <div style={{ fontSize: 13 }}>{selectedOrder.address}</div>
                </div>
              )}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: '8px 14px', background: 'var(--bg-soft)', fontWeight: 700, fontSize: 12 }}>Items Ordered</div>
                {(Array.isArray(selectedOrder.items) ? selectedOrder.items : JSON.parse(selectedOrder.items || '[]')).map((it, j) => (
                  <div key={j} style={{ padding: '9px 14px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                    <span>{it.name} × {it.qty}</span>
                    <strong>{fmt(it.rate * it.qty)}</strong>
                  </div>
                ))}
                <div style={{ padding: '10px 14px', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Total</span><span>{fmt(selectedOrder.total)}</span>
                </div>
              </div>
              {selectedOrder.notes && (
                <div style={{ background: '#fefce8', padding: '10px 14px', borderRadius: 8, border: '1px solid #fef08a', fontSize: 12 }}>
                  <strong>Notes:</strong> {selectedOrder.notes}
                </div>
              )}
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
