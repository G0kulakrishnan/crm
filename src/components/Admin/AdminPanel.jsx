import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmt, fmtD } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const FALLBACK_PLANS = [
  { id: 'trial', name: 'Trial', duration: 7, price: 0, maxLeads: 50, maxUsers: 1, features: 'Leads, Quotations' },
  { id: 'premium', name: 'Premium', duration: 30, price: 2999, maxLeads: 500, maxUsers: 5, features: 'Leads, Quotations, Invoices, Projects' },
  { id: 'startup', name: 'START-UP', duration: 365, price: 24999, maxLeads: -1, maxUsers: 10, features: 'All Features' },
  { id: 'pro', name: 'Premium Pro', duration: 365, price: 29999, maxLeads: -1, maxUsers: -1, features: 'All Features + Priority Support' },
];

const ALL_MODULES = [
  { key: 'leads', label: 'Leads', hasLimit: true, limitKey: 'maxLeads', defaultLimit: 10000 },
  { key: 'customers', label: 'Customers', hasLimit: true, limitKey: 'maxCustomers', defaultLimit: 10000 },
  { key: 'quotations', label: 'Quotations', hasLimit: false },
  { key: 'invoices', label: 'Invoices', hasLimit: true, limitKey: 'maxInvoices', defaultLimit: -1 },
  { key: 'pos', label: 'POS Billing', hasLimit: false },
  { key: 'amc', label: 'AMC', hasLimit: false },
  { key: 'expenses', label: 'Expenses', hasLimit: false },
  { key: 'products', label: 'Products', hasLimit: true, limitKey: 'maxProducts', defaultLimit: -1 },
  { key: 'vendors', label: 'Vendors', hasLimit: false },
  { key: 'purchaseOrders', label: 'Purchase Orders', hasLimit: false },
  { key: 'projects', label: 'Projects', hasLimit: true, limitKey: 'maxProjects', defaultLimit: 10 },
  { key: 'tasks', label: 'Tasks', hasLimit: true, limitKey: 'maxTasks', defaultLimit: 500 },
  { key: 'teams', label: 'Teams', hasLimit: true, limitKey: 'maxUsers', defaultLimit: 5 },
  { key: 'campaigns', label: 'Campaigns / Marketing', hasLimit: false },
  { key: 'reports', label: 'Reports', hasLimit: false },
  { key: 'automation', label: 'Automation', hasLimit: false },
  { key: 'ecommerce', label: 'E-Commerce Store', hasLimit: false },
  { key: 'appointments', label: 'Appointments', hasLimit: false },
  { key: 'integrations', label: 'Integrations', hasLimit: false },
  { key: 'messagingLogs', label: 'Messaging Logs', hasLimit: false },
  { key: 'distributors', label: 'Distributors & Retailers', hasLimit: false },
];

const DEFAULT_MODULES = Object.fromEntries(ALL_MODULES.map(m => [m.key, true]));
const DEFAULT_LIMITS = Object.fromEntries(ALL_MODULES.filter(m => m.hasLimit).map(m => [m.limitKey, m.defaultLimit]));

const EMPTY_PLAN = { name: '', duration: 30, price: 0, features: '', modules: { ...DEFAULT_MODULES }, limits: { ...DEFAULT_LIMITS } };



export default function AdminPanel({ user }) {
  const [tab, setTab] = useState('users');
  const [couponModal, setCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: '', discount: 20, type: 'Percentage', maxUses: 100 });
  const [settingsForm, setSettingsForm] = useState({ brandName: '', brandShort: '', brandLogo: '', title: '', favicon: '', crmDomain: '', showBranding: true });
  const [planModal, setPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);
  const [editPlanIdx, setEditPlanIdx] = useState(null);
  const [editUserModal, setEditUserModal] = useState(false);
  const [editUserData, setEditUserData] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ newPassword: '', expiry: '', role: '' });
  const [editUserLoading, setEditUserLoading] = useState(false);
  const hasSettingsLoaded = React.useRef(false); // Robust flag to prevent overwriting user typing
  const toast = useToast();

  const { data, error } = db.useQuery({
    userProfiles: {},
    coupons: { $: { where: { createdBy: user.id } } },
    transactions: {},
    globalSettings: {},
  });

  if (error) console.error('AdminPanel Query Error:', error);

  const users = data?.userProfiles || [];
  const coupons = data?.coupons || [];
  const transactions = data?.transactions || [];
  const globalSettings = data?.globalSettings?.[0] || {};
  // SINGLETON ID: Always use a valid UUID to ensure we update a single record
  const settingsId = globalSettings.id || '73f6063d-4c3d-4d51-9f93-111111111111';
  const plans = globalSettings.plans ? JSON.parse(globalSettings.plans) : FALLBACK_PLANS;

  React.useEffect(() => {
    // Only initialize the form ONCE when the query returns data
    if (data?.globalSettings?.[0] && !hasSettingsLoaded.current) {
        hasSettingsLoaded.current = true;
        const s = data.globalSettings[0];
        setSettingsForm({
          brandName: s.brandName || '',
          brandShort: s.brandShort || '',
          brandLogo: s.brandLogo || '',
          title: s.title || '',
          favicon: s.favicon || '',
          crmDomain: s.crmDomain || '',
          showBranding: s.showBranding !== false
        });
    }
  }, [data]);

  /* ──────────── COUPON ──────────── */
  const saveCoupon = async () => {
    if (!couponForm.code.trim()) { toast('Code required', 'error'); return; }
    await db.transact(db.tx.coupons[id()].update({ ...couponForm, createdBy: user.id, active: true, usedCount: 0 }));
    toast('Coupon created', 'success');
    setCouponModal(false);
  };
  const delCoupon = async (cid) => { await db.transact(db.tx.coupons[cid].delete()); toast('Deleted', 'error'); };

  /* ──────────── USERS ──────────── */
  const updateUserPlan = async (uid, planName) => {
    if (!window.confirm(`Change user plan to ${planName}?`)) return;
    const planObj = plans.find(p => p.name === planName);
    const duration = planObj?.duration || 7;
    const newExpiry = Date.now() + (duration * 24 * 60 * 60 * 1000);
    await db.transact(db.tx.userProfiles[uid].update({ plan: planName, planExpiry: newExpiry }));
    toast(`Plan updated to ${planName}`, 'success');
  };

  const banUser = async (uid, banned) => {
    await db.transact(db.tx.userProfiles[uid].update({ banned: !banned }));
    toast(!banned ? 'User banned' : 'User reinstated', !banned ? 'error' : 'success');
  };

  const openEditUser = (u) => {
    setEditUserData(u);
    setEditUserForm({
      newPassword: '',
      expiry: u.planExpiry ? new Date(u.planExpiry).toISOString().split('T')[0] : '',
      role: u.role || 'user',
    });
    setEditUserModal(true);
  };

  const resetUserPassword = async () => {
    if (!editUserData || !editUserForm.newPassword.trim()) { toast('Enter a new password', 'error'); return; }
    if (editUserForm.newPassword.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    if (!window.confirm(`Reset password for ${editUserData.email}?`)) return;
    setEditUserLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-password', email: editUserData.email, newPassword: editUserForm.newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast(`Password reset for ${editUserData.email}`, 'success');
      setEditUserForm(f => ({ ...f, newPassword: '' }));
    } catch (e) { toast(e.message, 'error'); }
    finally { setEditUserLoading(false); }
  };

  const updateUserExpiry = async () => {
    if (!editUserData || !editUserForm.expiry) { toast('Select an expiry date', 'error'); return; }
    const newExpiry = new Date(editUserForm.expiry).getTime();
    if (!window.confirm(`Set plan expiry for ${editUserData.email} to ${editUserForm.expiry}?`)) return;
    await db.transact(db.tx.userProfiles[editUserData.id].update({ planExpiry: newExpiry }));
    toast('Expiry updated', 'success');
  };

  const updateUserRole = async () => {
    if (!editUserData) return;
    if (!window.confirm(`Change role of ${editUserData.email} to "${editUserForm.role}"?`)) return;
    await db.transact(db.tx.userProfiles[editUserData.id].update({ role: editUserForm.role }));
    toast(`Role updated to ${editUserForm.role}`, 'success');
  };

  const repairData = async () => {
    const txs = users.map(u => {
      const updates = {};
      if (!u.planExpiry) {
        const dur = plans.find(p => p.name === (u.plan || 'Trial'))?.duration || 7;
        updates.planExpiry = Date.now() + (dur * 24 * 60 * 60 * 1000);
      }
      return Object.keys(updates).length ? db.tx.userProfiles[u.id].update(updates) : null;
    }).filter(Boolean);
    if (txs.length) { await db.transact(txs); toast(`Repaired ${txs.length} profiles`, 'success'); }
    else toast('All profiles look healthy', 'info');
  };

  const updateEmail = async (uid, email) => {
    if (!email.includes('@')) return;
    await db.transact(db.tx.userProfiles[uid].update({ email: email.trim() }));
    toast('Email updated', 'success');
  };

  const updatePhone = async (uid, phone) => {
    if (!phone?.trim()) return;
    await db.transact(db.tx.userProfiles[uid].update({ phone: phone.trim() }));
    toast('Phone updated', 'success');
  };

  /* ──────────── PLANS ──────────── */
  const savePlan = async () => {
    if (!planForm.name.trim()) { toast('Plan name required', 'error'); return; }
    const newPlans = [...plans];
    const planEntry = { ...planForm, price: +planForm.price, duration: +planForm.duration, id: planForm.id || id() };
    if (editPlanIdx !== null) newPlans[editPlanIdx] = planEntry;
    else newPlans.push(planEntry);
    await db.transact(db.tx.globalSettings[settingsId].update({ plans: JSON.stringify(newPlans) }));
    toast(editPlanIdx !== null ? 'Plan updated' : 'Plan created', 'success');
    setPlanModal(false); setEditPlanIdx(null); setPlanForm(EMPTY_PLAN);
  };

  const deletePlan = async (idx) => {
    if (!window.confirm(`Delete plan "${plans[idx].name}"?`)) return;
    const newPlans = plans.filter((_, i) => i !== idx);
    await db.transact(db.tx.globalSettings[settingsId].update({ plans: JSON.stringify(newPlans) }));
    toast('Plan deleted', 'error');
  };

  /* ──────────── SETTINGS ──────────── */
  const saveSettings = async () => {
    try {
      console.log("💾 [AdminPanel] Saving settings to:", settingsId, settingsForm);
      await db.transact(db.tx.globalSettings[settingsId].update({
        brandName: settingsForm.brandName || '',
        brandShort: settingsForm.brandShort || '',
        brandLogo: settingsForm.brandLogo || '',
        title: settingsForm.title || '',
        favicon: settingsForm.favicon || '',
        crmDomain: settingsForm.crmDomain || '',
        showBranding: settingsForm.showBranding !== false,
      }));
      toast('Platform Settings Updated', 'success');
    } catch (err) {
      console.error("❌ [AdminPanel] Save failed:", err);
      toast(`Save Failed: ${err.message || 'Unknown Error'}`, 'error');
    }
  };

  const totalRevenue = transactions.filter(t => t.status === 'Success').reduce((s, t) => s + (t.amount || 0), 0);
  const activeUsers = users.filter(u => !u.banned).length;

  return (
    <div>
      <div className="sh">
        <div><h2>Admin Panel</h2><div className="sub" style={{ color: '#ef4444' }}>Platform management — restricted access</div></div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="stat-card sc-blue"><div className="lbl">Total Users</div><div className="val">{users.length}</div></div>
        <div className="stat-card sc-green"><div className="lbl">Active Users</div><div className="val">{activeUsers}</div></div>
        <div className="stat-card sc-yellow"><div className="lbl">Revenue</div><div className="val" style={{ fontSize: 16 }}>{fmt(totalRevenue)}</div></div>
        <div className="stat-card sc-purple"><div className="lbl">Coupons</div><div className="val">{coupons.length}</div></div>
      </div>

      <div className="tabs">
        {[
          ['users', 'Users'], 
          ['plans', 'Plans'], 
          ['coupons', 'Coupons'], 
          ['transactions', 'Transactions'], 
          ['settings', 'Platform Branding']
        ].map(([t, l]) => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{l}</div>
        ))}
      </div>

      {/* ── USERS ── */}
      {tab === 'users' && (
        <div className="tw">
          <div className="tw-head">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3>All Registered Profiles ({users.length})</h3>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>Note: Users only appear here after their first successful login.</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={repairData}>🛠 Repair &amp; Refresh All</button>
          </div>
          <div className="tw-scroll">
            <table>
              <thead><tr><th>#</th><th>User Contact</th><th>Phone</th><th>Business</th><th>Plan</th><th>Expiry</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No users yet</td></tr>
                  : users.map((u, i) => (
                    <tr key={u.id}>
                      <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {u.fullName && <div style={{ fontSize: 13, fontWeight: 700 }}>{u.fullName}</div>}
                          {u.email?.includes('@') ? <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}</div>
                            : (<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input placeholder="Add Email..." defaultValue={u.email && !u.email.includes('@') ? '' : u.email} onBlur={e => updateEmail(u.id, e.target.value)} style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #fee2e2', background: '#fffafb', borderRadius: 6, width: 140 }} />
                                <span title="Invalid or Missing Email" style={{ cursor: 'help' }}>⚠️</span>
                              </div>)}
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {u.phone ? <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{u.phone}</span>
                          : (<input placeholder="Add Phone..." defaultValue={u.phone} onBlur={e => updatePhone(u.id, e.target.value)} style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #fee2e2', background: '#fffafb', borderRadius: 6, width: 100 }} />)}
                      </td>
                      <td style={{ fontSize: 12 }}>{u.bizName || '-'}</td>
                      <td>
                        <select value={u.plan || 'Trial'} onChange={e => updateUserPlan(u.id, e.target.value)} style={{ padding: '4px 8px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit' }}>
                          {plans.map(p => <option key={p.name}>{p.name}</option>)}
                        </select>
                      </td>
                      <td style={{ fontSize: 11 }}>{u.planExpiry ? fmtD(u.planExpiry) : '-'}</td>
                      <td><span className={`badge ${u.role === 'superadmin' ? 'bg-purple' : 'bg-gray'}`}>{u.role || 'user'}</span></td>
                      <td><span className={`badge ${u.banned ? 'bg-red' : 'bg-green'}`}>{u.banned ? 'Banned' : 'Active'}</span></td>
                      <td style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditUser(u)}>✏️ Edit</button>
                        <button className="btn btn-sm" style={{ background: u.banned ? '#dcfce7' : '#fee2e2', color: u.banned ? '#166534' : '#991b1b' }} onClick={() => banUser(u.id, u.banned)}>
                          {u.banned ? '✓ Reinstate' : '⊘ Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PLANS ── */}
      {tab === 'plans' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditPlanIdx(null); setPlanForm(EMPTY_PLAN); setPlanModal(true); }}>+ Add Plan</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {plans.map((p, i) => {
              const enabledMods = ALL_MODULES.filter(m => p.modules ? p.modules[m.key] !== false : true);
              return (
                <div key={p.id || p.name} className={`plan-card${i === 1 ? ' featured' : ''}`} style={{ position: 'relative' }}>
                  {i === 1 && <div className="plan-badge">Popular</div>}
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}>{p.name}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>
                    {+(p.price || 0) === 0 ? 'Free' : `₹${(+(p.price || 0)).toLocaleString()}`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>per {p.duration} days</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {enabledMods.map(m => (
                      <span key={m.key} style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-soft)', borderRadius: 4, border: '1px solid var(--border)' }}>{m.label}</span>
                    ))}
                  </div>
                  {p.limits && Object.entries(p.limits).some(([, v]) => +v !== -1) && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                      {ALL_MODULES.filter(m => m.hasLimit && p.modules?.[m.key] !== false).map(m => (
                        <div key={m.limitKey}>{m.label}: {p.limits?.[m.limitKey] === -1 || p.limits?.[m.limitKey] === undefined ? 'Unlimited' : p.limits[m.limitKey]}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setEditPlanIdx(i); setPlanForm({ name: p.name, duration: p.duration, price: p.price, features: p.features || '', modules: { ...DEFAULT_MODULES, ...(p.modules || {}) }, limits: { ...DEFAULT_LIMITS, ...(p.limits || { maxLeads: p.maxLeads, maxUsers: p.maxUsers }) } }); setPlanModal(true); }}>Edit</button>
                    <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => deletePlan(i)}>Del</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── COUPONS ── */}
      {tab === 'coupons' && (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setCouponForm({ code: '', discount: 20, type: 'Percentage', maxUses: 100 }); setCouponModal(true); }}>+ Create Coupon</button>
          </div>
          <div className="tw">
            <div className="tw-head"><h3>Discount Coupons ({coupons.length})</h3></div>
            <div className="tw-scroll">
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
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {tab === 'transactions' && (
        <div className="tw">
          <div className="tw-head"><h3>Transactions ({transactions.length})</h3></div>
          <div className="tw-scroll">
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
        </div>
      )}

      {/* ── PLATFORM BRANDING SETTINGS ── */}
      {tab === 'settings' && (
        <div className="tw">
          <div className="tw-head"><h3>White-labeling &amp; Platform Branding</h3></div>
          <div style={{ padding: 20, maxWidth: 620 }}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>CRM Brand Name</label>
              <input value={settingsForm.brandName} onChange={e => setSettingsForm({ ...settingsForm, brandName: e.target.value })} placeholder="e.g. T2G CRM" />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Shown on login screen and sidebar logo.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Brand Initials (Short Logo)</label>
                <input value={settingsForm.brandShort} onChange={e => setSettingsForm({ ...settingsForm, brandShort: e.target.value })} placeholder="e.g. T2G" maxLength={4} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>2-4 initials shown if logo is missing.</div>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Brand Logo URL</label>
                <input value={settingsForm.brandLogo} onChange={e => setSettingsForm({ ...settingsForm, brandLogo: e.target.value })} placeholder="https://example.com/logo.png" />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Logo used in sidebar and docs.</div>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Website Document Title</label>
              <input value={settingsForm.title} onChange={e => setSettingsForm({ ...settingsForm, title: e.target.value })} placeholder="e.g. T2G CRM | Lead & Sales Management" />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>The text shown on the browser tab.</div>
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Favicon URL</label>
              <input value={settingsForm.favicon} onChange={e => setSettingsForm({ ...settingsForm, favicon: e.target.value })} placeholder="https://example.com/favicon.ico" />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Icon image for the browser tab (.ico or .png).</div>
            </div>
            <div className="form-group" style={{ marginBottom: 18, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
              <label>CRM Domain URL</label>
              <input value={settingsForm.crmDomain} onChange={e => setSettingsForm({ ...settingsForm, crmDomain: e.target.value })} placeholder="https://mycrm.t2gcrm.in" />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Your deployed CRM domain.</div>
            </div>
            
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={settingsForm.showBranding} 
                  onChange={e => setSettingsForm({ ...settingsForm, showBranding: e.target.checked })}
                  style={{ width: 18, height: 18 }} 
                />
                <span style={{ fontWeight: 600 }}>Show "Powered By" branding in Documents (Invoices/Quotes)</span>
              </label>
            </div>
            
            <button className="btn btn-primary" onClick={saveSettings}>Save Branding Settings</button>
          </div>
        </div>
      )}


      {planModal && (
        <div className="mo open">
          <div className="mo-box" style={{ maxWidth: 680 }}>
            <div className="mo-head"><h3>{editPlanIdx !== null ? 'Edit' : 'Add'} Plan</h3><button className="btn-icon" onClick={() => setPlanModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg span2"><label>Plan Name *</label><input value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Lead Management, Billing Plan, Parlour Plan" /></div>
                <div className="fg"><label>Duration (days)</label><input type="number" value={planForm.duration} onChange={e => setPlanForm(p => ({ ...p, duration: e.target.value }))} /></div>
                <div className="fg"><label>Price (₹) — 0 for Free</label><input type="number" value={planForm.price} onChange={e => setPlanForm(p => ({ ...p, price: e.target.value }))} /></div>
                <div className="fg span2"><label>Plan Description (optional)</label><input value={planForm.features} onChange={e => setPlanForm(p => ({ ...p, features: e.target.value }))} placeholder="e.g. Best for retail businesses" /></div>
              </div>
              
              <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🗂️ Module Access & Limits
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>(-1 = Unlimited)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ALL_MODULES.map(m => (
                    <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: planForm.modules?.[m.key] !== false ? 'var(--bg-soft)' : '#fef2f2', borderRadius: 8, border: `1px solid ${planForm.modules?.[m.key] !== false ? 'var(--border)' : '#fca5a5'}` }}>
                      <input
                        type="checkbox"
                        checked={planForm.modules?.[m.key] !== false}
                        onChange={e => setPlanForm(p => ({ ...p, modules: { ...p.modules, [m.key]: e.target.checked } }))}
                        style={{ width: 15, height: 15, flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 12, flex: 1, fontWeight: 500, color: planForm.modules?.[m.key] === false ? '#991b1b' : undefined }}>{m.label}</span>
                      {m.hasLimit && planForm.modules?.[m.key] !== false && (
                        <input
                          type="number"
                          value={planForm.limits?.[m.limitKey] ?? m.defaultLimit}
                          onChange={e => setPlanForm(p => ({ ...p, limits: { ...p.limits, [m.limitKey]: parseInt(e.target.value) } }))}
                          style={{ width: 72, fontSize: 11, padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 5, textAlign: 'center' }}
                          title={`${m.label} limit (-1 = unlimited)`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setPlanModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={savePlan}>{editPlanIdx !== null ? 'Update Plan' : 'Create Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── COUPON MODAL ── */}
      {couponModal && (
        <div className="mo open">
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

      {/* ── EDIT USER MODAL ── */}
      {editUserModal && editUserData && (
        <div className="mo open">
          <div className="mo-box" style={{ maxWidth: 520 }}>
            <div className="mo-head"><h3>✏️ Edit User — {editUserData.fullName || editUserData.email}</h3><button className="btn-icon" onClick={() => setEditUserModal(false)}>✕</button></div>
            <div className="mo-body">
              {/* Section 1: Reset Password */}
              <div style={{ marginBottom: 20, padding: 16, background: 'var(--bg-soft)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>🔑 Reset Password</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, display: 'block' }}>New Password</label>
                    <input type="password" value={editUserForm.newPassword} onChange={e => setEditUserForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min. 6 characters" style={{ width: '100%' }} />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={resetUserPassword} disabled={editUserLoading}>{editUserLoading ? 'Saving...' : 'Reset Password'}</button>
                </div>
              </div>

              {/* Section 2: Edit Expiry */}
              <div style={{ marginBottom: 20, padding: 16, background: 'var(--bg-soft)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>📅 Plan Expiry</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, display: 'block' }}>Expiry Date</label>
                    <input type="date" value={editUserForm.expiry} onChange={e => setEditUserForm(f => ({ ...f, expiry: e.target.value }))} style={{ width: '100%' }} />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={updateUserExpiry}>Update Expiry</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Current: {editUserData.planExpiry ? fmtD(editUserData.planExpiry) : 'Not set'}</div>
              </div>

              {/* Section 3: Change Role */}
              <div style={{ padding: 16, background: 'var(--bg-soft)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>👤 User Role</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, display: 'block' }}>Role</label>
                    <select value={editUserForm.role} onChange={e => setEditUserForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%' }}>
                      <option value="user">User</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={updateUserRole}>Update Role</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Current: {editUserData.role || 'user'}</div>
              </div>
            </div>
            <div className="mo-foot"><button className="btn btn-secondary btn-sm" onClick={() => setEditUserModal(false)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
