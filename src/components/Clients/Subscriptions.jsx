import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD, fmt, stageBadgeClass, daysLeft } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { sendEmail, sendEmailMock, renderTemplate } from '../../utils/messaging';

const EMPTY = { client: '', email: '', phone: '', plan: 'Monthly', amount: '', nextPayment: '', status: 'Active' };

export default function Subscriptions({ user }) {
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const toast = useToast();

  const { data } = db.useQuery({ 
    subscriptions: { $: { where: { userId: user.id } } },
    customers: { $: { where: { userId: user.id } } },
    userProfiles: { $: { where: { userId: user.id } } }
  });
  const subscriptions = data?.subscriptions || [];
  const customers = data?.customers || [];
  
  const filtered = subscriptions.filter(s => {
    if (tab === 'active') return s.status === 'Active';
    if (tab === 'followup') return s.needsFollowUp;
    return true;
  }).filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [s.client, s.email, s.phone, s.plan, s.status].some(v => (v || '').toLowerCase().includes(q));
  });

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleClientSelect = (e) => {
    const cName = e.target.value;
    const cust = customers.find(c => c.name === cName);
    setForm(p => ({ 
      ...p, 
      client: cName, 
      email: cust ? cust.email : p.email 
    }));
  };

  const toggleFollowUp = async (s) => {
    await db.transact(db.tx.subscriptions[s.id].update({ needsFollowUp: !s.needsFollowUp }));
    toast(s.needsFollowUp ? 'Follow-up removed' : 'Marked for follow-up', 'success');
  };

  const handleSendReminder = async (s) => {
    if (!s.email) return toast('Client has no email address', 'error');
    if (!confirm(`Send reminder email to ${s.client} (${s.email})?`)) return;
    
    const profile = data?.userProfiles?.[0] || {};
    const reminders = profile.reminders || { sub: { msg: 'Hello {client}, your subscription payment of {amount} is due on {date}.' } };
    const template = reminders.sub?.msg || 'Hello {client}, your subscription payment of {amount} is due on {date}.';
    
    const emailConfig = {
      smtpHost: profile.smtpHost,
      smtpPort: profile.smtpPort,
      smtpUser: profile.smtpUser,
      smtpPass: profile.smtpPass,
      bizName: profile.bizName
    };

    const body = renderTemplate(template, { client: s.client, date: fmtD(s.nextPayment), amount: s.amount, bizName: profile.bizName || '' });
    const subject = 'Subscription Payment Reminder';

    try {
      toast('Sending email...', 'info');
      if (emailConfig.smtpHost && emailConfig.smtpUser && emailConfig.smtpPass) {
        const res = await sendEmail(s.email, subject, body, emailConfig, user.id);
        if (res === 'OK') toast('Reminder sent successfully!', 'success');
        else toast('Failed to send', 'error');
      } else {
        await sendEmailMock(user.id, s.email, subject, body, { entityId: s.id, entityType: 'sub' });
        toast('Email config missing, logged to outbox.', 'warning');
      }
    } catch (e) {
      toast('Failed to send email', 'error');
    }
  };

  const save = async () => {
    if (!form.client.trim()) { toast('Client required', 'error'); return; }
    const payload = { ...form, amount: parseFloat(form.amount) || 0, userId: user.id };
    if (editData) { await db.transact(db.tx.subscriptions[editData.id].update(payload)); toast('Updated', 'success'); }
    else { await db.transact(db.tx.subscriptions[id()].update(payload)); toast('Subscription created', 'success'); }
    setModal(false);
  };

  const del = async (sid) => { if (!confirm('Delete?')) return; await db.transact(db.tx.subscriptions[sid].delete()); toast('Deleted', 'error'); };

  return (
    <div>
      <div className="sh">
        <div><h2>Subscriptions</h2><div className="sub">Manage client recurring payments</div></div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditData(null); setForm(EMPTY); setModal(true); }}>+ Create Subscription</button>
      </div>
      <div className="tabs">
        {[['all', 'All'], ['active', 'Active'], ['followup', '📌 Needs Follow Up']].map(([t, l]) => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{l}</div>
        ))}
      </div>
      <div className="tw">
        <div className="tw-head">
          <h3>Subscriptions ({filtered.length})</h3>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table>
          <thead><tr><th>#</th><th>Client</th><th>Plan</th><th>Amount</th><th>Next Payment</th><th>Status</th><th>Days</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No subscriptions</td></tr>
              : filtered.map((s, i) => {
                const d = daysLeft(s.nextPayment);
                return (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                    <td><strong>{s.client}</strong><div style={{ fontSize: 10, color: 'var(--muted)' }}>{s.email}</div></td>
                    <td>{s.plan}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(s.amount)}</td>
                    <td style={{ fontSize: 12 }}>{fmtD(s.nextPayment)}</td>
                    <td><span className={`badge ${stageBadgeClass(s.status)}`}>{s.status}</span></td>
                    <td><span className={`badge ${d <= 7 ? 'bg-red' : d <= 30 ? 'bg-yellow' : 'bg-green'}`}>{d}d</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEditData(s); setForm({ client: s.client, email: s.email || '', phone: s.phone || '', plan: s.plan, amount: s.amount, nextPayment: s.nextPayment || '', status: s.status }); setModal(true); }}>Edit</button>{' '}
                      <button className="btn btn-sm" style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 8px', fontSize: 13 }} onClick={() => handleSendReminder(s)}>📧 Remind</button>{' '}
                      <button className={`btn btn-sm ${s.needsFollowUp ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 8px', fontSize: 13 }} onClick={() => toggleFollowUp(s)}>
                        {s.needsFollowUp ? '📌 Following Up' : '📍 Flag'}
                      </button>{' '}
                      <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => del(s.id)}>Del</button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="mo open" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mo-box">
            <div className="mo-head"><h3>{editData ? 'Edit' : 'Create'} Subscription</h3><button className="btn-icon" onClick={() => setModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg">
                  <label>Client *</label>
                  <select value={form.client} onChange={handleClientSelect}>
                    <option value="">Select Customer...</option>
                    {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Plan</label><select value={form.plan} onChange={f('plan')}>{['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'].map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="fg"><label>Amount (₹)</label><input type="number" value={form.amount} onChange={f('amount')} /></div>
                <div className="fg"><label>Next Payment Date</label><input type="date" value={form.nextPayment} onChange={f('nextPayment')} /></div>
                <div className="fg"><label>Email</label><input type="email" value={form.email} onChange={f('email')} /></div>
                <div className="fg"><label>Status</label><select value={form.status} onChange={f('status')}>{['Active', 'Paused', 'Cancelled'].map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
            </div>
            <div className="mo-foot"><button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
