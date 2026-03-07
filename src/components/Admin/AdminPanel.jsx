import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmt, fmtD } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const DEFAULT_PLANS = [
  { name: 'Trial', duration: 7, price: 0, maxLeads: 50, maxUsers: 1 },
  { name: 'Premium', duration: 30, price: 2999, maxLeads: 500, maxUsers: 5 },
  { name: 'START-UP', duration: 365, price: 24999, maxLeads: -1, maxUsers: 10 },
  { name: 'Premium Pro', duration: 365, price: 29999, maxLeads: -1, maxUsers: -1 },
];

export default function AdminPanel({ user }) {
  const [tab, setTab] = useState('users');
  const [couponModal, setCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: '', discount: 20, type: 'Percentage', maxUses: 100 });
  const toast = useToast();

  const { data, isLoading, error } = db.useQuery({
    userProfiles: {},
    coupons: { $: { where: { createdBy: user.id } } },
    transactions: {},
  });

  if (error) console.error("AdminPanel Query Error:", error);
  
  const users = data?.userProfiles || [];
  console.log("👥 AdminPanel Users Fetched:", users.length, users);
  const coupons = data?.coupons || [];
  const transactions = data?.transactions || [];

  const saveCoupon = async () => {
    if (!couponForm.code.trim()) { toast('Code required', 'error'); return; }
    await db.transact(db.tx.coupons[id()].update({ ...couponForm, createdBy: user.id, active: true, usedCount: 0 }));
    toast('Coupon created', 'success');
    setCouponModal(false);
  };

  const delCoupon = async (cid) => { await db.transact(db.tx.coupons[cid].delete()); toast('Deleted', 'error'); };

  const updateUserPlan = async (uid, planName) => {
    if (!window.confirm(`Are you sure you want to change this user's plan to ${planName}?`)) return;
    const planObj = DEFAULT_PLANS.find(p => p.name === planName);
    const duration = planObj?.duration || 7;
    const newExpiry = Date.now() + (duration * 24 * 60 * 60 * 1000);
    
    await db.transact(db.tx.userProfiles[uid].update({ 
      plan: planName,
      planExpiry: newExpiry 
    }));
    toast(`Plan updated to ${planName}`, 'success');
  };

  const banUser = async (uid, banned) => {
    await db.transact(db.tx.userProfiles[uid].update({ banned: !banned }));
    toast(!banned ? 'User banned' : 'User reinstated', !banned ? 'error' : 'success');
  };

  const toggleRole = async (uid, currentRole) => {
    const nextRole = currentRole === 'superadmin' ? 'user' : 'superadmin';
    await db.transact(db.tx.userProfiles[uid].update({ role: nextRole }));
    toast(`Role updated to ${nextRole}`, 'success');
  };

  const repairData = async () => {
    const txs = users.map(u => {
      const updates = {};
      // Repair Expiry
      if (!u.planExpiry) {
        const dur = DEFAULT_PLANS.find(p => p.name === (u.plan || 'Trial'))?.duration || 7;
        updates.planExpiry = Date.now() + (dur * 24 * 60 * 60 * 1000);
      }
      // Flag UUIDs
      if (u.id === u.email) {
        // If email is just the user id, it's definitely wrong
        // Note: We don't automatically clear it to avoid data loss, 
        // but the UI will show the input box now.
      }
      return Object.keys(updates).length ? db.tx.userProfiles[u.id].update(updates) : null;
    }).filter(Boolean);

    if (txs.length) {
      await db.transact(txs);
      toast(`Repaired ${txs.length} profiles`, 'success');
    } else {
      toast('All profiles look healthy', 'info');
    }
  };

  const updateEmail = async (uid, email) => {
    if (!email.includes('@')) return;
    await db.transact(db.tx.userProfiles[uid].update({ email: email.trim() }));
    toast('Email updated', 'success');
  };

  const updatePhone = async (uid, phone) => {
    if (!phone || !phone.trim()) return;
    await db.transact(db.tx.userProfiles[uid].update({ phone: phone.trim() }));
    toast('Phone updated', 'success');
  };

  const totalRevenue = transactions.filter(t => t.status === 'Success').reduce((s, t) => s + (t.amount || 0), 0);
  const activeUsers = users.filter(u => !u.banned).length;

  return (
    <div>
      <div className="sh">
        <div><h2>Admin Panel</h2><div className="sub" style={{ color: '#ef4444' }}>Platform management — restricted access</div></div>
      </div>

      {/* Overview Stats */}
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="stat-card sc-blue"><div className="lbl">Total Users</div><div className="val">{users.length}</div></div>
        <div className="stat-card sc-green"><div className="lbl">Active Users</div><div className="val">{activeUsers}</div></div>
        <div className="stat-card sc-yellow"><div className="lbl">Revenue</div><div className="val" style={{ fontSize: 16 }}>{fmt(totalRevenue)}</div></div>
        <div className="stat-card sc-purple"><div className="lbl">Coupons</div><div className="val">{coupons.length}</div></div>
      </div>

      <div className="tabs">
        {[['users', 'Users'], ['plans', 'Plans'], ['coupons', 'Coupons'], ['transactions', 'Transactions']].map(([t, l]) => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{l}</div>
        ))}
      </div>

      {tab === 'users' && (
        <div className="tw">
          <div className="tw-head">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3>All Registered Profiles ({users.length})</h3>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>
                Note: Users only appear here after their first successful login.
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={repairData}>🛠 Repair & Refresh All</button>
          </div>
          <table>
            <thead><tr><th>#</th><th>User Contact</th><th>Phone (P)</th><th>Business</th><th>Plan</th><th>Expiry</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No users yet</td></tr>
                : users.map((u, i) => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {u.fullName && <div style={{ fontSize: 13, fontWeight: 700 }}>{u.fullName}</div>}
                        {u.email && u.email.includes('@') ? <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}</div> 
                        : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input 
                            placeholder="Add Email..." 
                            defaultValue={u.email && !u.email.includes('@') ? '' : u.email}
                            onBlur={(e) => updateEmail(u.id, e.target.value)}
                            style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #fee2e2', background: '#fffafb', borderRadius: 6, width: 140 }}
                          />
                          <span title="Invalid or Missing Email" style={{ cursor: 'help' }}>⚠️</span>
                        </div>
                      )}
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {u.phone ? <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{u.phone}</span>
                      : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input 
                            placeholder="Add Phone..." 
                            defaultValue={u.phone}
                            onBlur={(e) => updatePhone(u.id, e.target.value)}
                            style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #fee2e2', background: '#fffafb', borderRadius: 6, width: 100 }}
                          />
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>{u.bizName || '-'}</td>
                    <td>
                      <select value={u.plan || 'Trial'} onChange={e => updateUserPlan(u.id, e.target.value)} style={{ padding: '4px 8px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit' }}>
                        {DEFAULT_PLANS.map(p => <option key={p.name}>{p.name}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: 11 }}>{u.planExpiry ? fmtD(u.planExpiry) : '-'}</td>
                    <td>
                      <button className={`badge ${u.role === 'superadmin' ? 'bg-purple' : 'bg-gray'}`} onClick={() => toggleRole(u.id, u.role || 'user')} style={{ border: 'none', cursor: 'pointer' }}>
                        {u.role || 'user'}
                      </button>
                    </td>
                    <td><span className={`badge ${u.banned ? 'bg-red' : 'bg-green'}`}>{u.banned ? 'Banned' : 'Active'}</span></td>
                    <td>
                      <button className="btn btn-sm" style={{ background: u.banned ? '#dcfce7' : '#fee2e2', color: u.banned ? '#166534' : '#991b1b' }} onClick={() => banUser(u.id, u.banned)}>
                        {u.banned ? '✓ Reinstate' : '⊘ Ban'}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'plans' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
          {DEFAULT_PLANS.map((p, i) => (
            <div key={p.name} className={`plan-card${i === 1 ? ' featured' : ''}`}>
              {i === 1 && <div className="plan-badge">Popular</div>}
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}>{p.name}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>
                {p.price === 0 ? 'Free' : `₹${p.price.toLocaleString()}`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>per {p.duration} days</div>
              <div style={{ fontSize: 12 }}>
                <div>Max Leads: {p.maxLeads === -1 ? 'Unlimited' : p.maxLeads}</div>
                <div>Max Users: {p.maxUsers === -1 ? 'Unlimited' : p.maxUsers}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'coupons' && (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setCouponForm({ code: '', discount: 20, type: 'Percentage', maxUses: 100 }); setCouponModal(true); }}>+ Create Coupon</button>
          </div>
          <div className="tw">
            <div className="tw-head"><h3>Discount Coupons ({coupons.length})</h3></div>
            <table>
              <thead><tr><th>Code</th><th>Type</th><th>Discount</th><th>Max Uses</th><th>Used</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {coupons.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No coupons</td></tr>
                  : coupons.map(c => (
                    <tr key={c.id}>
                      <td><strong style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '2px 7px', borderRadius: 5 }}>{c.code}</strong></td>
                      <td>{c.type}</td>
                      <td style={{ fontWeight: 700 }}>{c.type === 'Percentage' ? `${c.discount}%` : fmt(c.discount)}</td>
                      <td>{c.maxUses}</td>
                      <td>{c.usedCount || 0}</td>
                      <td><span className={`badge ${c.active ? 'bg-green' : 'bg-gray'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                      <td><button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => delCoupon(c.id)}>Del</button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="tw">
          <div className="tw-head"><h3>Transactions ({transactions.length})</h3></div>
          <table>
            <thead><tr><th>#</th><th>User</th><th>Plan</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {transactions.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No transactions yet</td></tr>
                : transactions.map((t, i) => (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ fontSize: 12 }}>{t.userEmail || t.userId || '-'}</td>
                    <td>{t.plan || '-'}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(t.amount)}</td>
                    <td><span className={`badge ${t.status === 'Success' ? 'bg-green' : t.status === 'Failed' ? 'bg-red' : 'bg-yellow'}`}>{t.status}</span></td>
                    <td style={{ fontSize: 12 }}>{fmtD(t.createdAt)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Coupon Modal */}
      {couponModal && (
        <div className="mo open" onClick={e => e.target === e.currentTarget && setCouponModal(false)}>
          <div className="mo-box">
            <div className="mo-head"><h3>Create Coupon</h3><button className="btn-icon" onClick={() => setCouponModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg span2"><label>Coupon Code</label><input value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. LAUNCH50" style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '.05em' }} /></div>
                <div className="fg"><label>Type</label><select value={couponForm.type} onChange={e => setCouponForm(p => ({ ...p, type: e.target.value }))}><option>Percentage</option><option>Fixed</option></select></div>
                <div className="fg"><label>Discount ({couponForm.type === 'Percentage' ? '%' : '₹'})</label><input type="number" value={couponForm.discount} onChange={e => setCouponForm(p => ({ ...p, discount: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="fg"><label>Max Uses</label><input type="number" value={couponForm.maxUses} onChange={e => setCouponForm(p => ({ ...p, maxUses: parseInt(e.target.value) || 1 }))} /></div>
              </div>
            </div>
            <div className="mo-foot"><button className="btn btn-secondary btn-sm" onClick={() => setCouponModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={saveCoupon}>Create Coupon</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
