import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD, fmt, stageBadgeClass } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { sendEmail, sendEmailMock, renderTemplate } from '../../utils/messaging';

const EMPTY = { client: '', email: '', amount: '', frequency: 'Monthly', nextDue: '', status: 'Active' };

export default function Recurring({ user }) {
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [tab, setTab] = useState('all');
  const toast = useToast();

  const { data } = db.useQuery({ 
    recur: { $: { where: { userId: user.id } } },
    customers: { $: { where: { userId: user.id } } },
    userProfiles: { $: { where: { userId: user.id } } }
  });
  const recur = data?.recur || [];
  const customers = data?.customers || [];

  const [search, setSearch] = useState('');

  const filtered = recur.filter(r => {
    if (tab === 'active' && r.status !== 'Active') return false;
    if (tab === 'followup' && !r.needsFollowUp) return false;
    if (search) {
      const q = search.toLowerCase();
      return [r.client, r.amount, r.frequency, r.nextDue, r.status].some(v => String(v || '').toLowerCase().includes(q));
    }
    return true;
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

  const toggleFollowUp = async (r) => {
    await db.transact(db.tx.recur[r.id].update({ needsFollowUp: !r.needsFollowUp }));
    toast(r.needsFollowUp ? 'Follow-up removed' : 'Marked for follow-up', 'success');
  };

  const handleSendReminder = async (r) => {
    let targetEmail = r.email;
    if (!targetEmail) {
      targetEmail = prompt(`Please enter an email address for ${r.client}:`);
      if (!targetEmail) return;
      await db.transact(db.tx.recur[r.id].update({ email: targetEmail }));
    }
    
    if (!confirm(`Send reminder email to ${r.client} (${targetEmail})?`)) return;
    
    const profile = data?.userProfiles?.[0] || {};
    // Using sub template since it's most appropriate for recurring payments
    const reminders = profile.reminders || { sub: { msg: 'Hello {client}, your payment of {amount} is due on {date}.' } };
    const template = reminders.sub?.msg || 'Hello {client}, your payment of {amount} is due on {date}.';
    
    const emailConfig = {
      serviceId: profile.emailjsServiceId,
      templateId: profile.emailjsTemplateId,
      publicKey: profile.emailjsPublicKey,
      userEmail: profile.smtpUser
    };

    const body = renderTemplate(template, { client: r.client, date: fmtD(r.nextDue), amount: r.amount, bizName: profile.bizName || '' });
    const subject = 'Recurring Invoice Reminder';

    try {
      toast('Sending email...', 'info');
      if (emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey) {
        const res = await sendEmail(targetEmail, subject, body, emailConfig, user.id);
        if (res === 'OK') toast('Reminder sent successfully!', 'success');
        else toast('Failed to send', 'error');
      } else {
        await sendEmailMock(user.id, targetEmail, subject, body, { entityId: r.id, entityType: 'recur' });
        toast('Email config missing, logged to outbox.', 'warning');
      }
    } catch (e) {
      toast('Failed to send email', 'error');
    }
  };

  const save = async () => {
    if (!form.client.trim()) { toast('Client required', 'error'); return; }
    const payload = { ...form, amount: parseFloat(form.amount) || 0, userId: user.id };
    if (editData) { await db.transact(db.tx.recur[editData.id].update(payload)); toast('Updated', 'success'); }
    else { await db.transact(db.tx.recur[id()].update(payload)); toast('Recurring invoice created', 'success'); }
    setModal(false);
  };

  const del = async (rid) => { if (!confirm('Delete?')) return; await db.transact(db.tx.recur[rid].delete()); toast('Deleted', 'error'); };

  return (
    <div>
      <div className="sh"><div><h2>Recurring Invoices</h2></div><button className="btn btn-primary btn-sm" onClick={() => { setEditData(null); setForm(EMPTY); setModal(true); }}>+ Create</button></div>
      <div className="tabs">
        {[['all', 'All'], ['active', 'Active'], ['followup', '📌 Needs Follow Up']].map(([t, l]) => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{l}</div>
        ))}
      </div>
      <div className="tw">
        <div className="tw-head">
          <h3>Recurring Invoices ({filtered.length})</h3>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table>
          <thead><tr><th>#</th><th>Client</th><th>Amount</th><th>Frequency</th><th>Next Due</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No recurring invoices</td></tr>
              : filtered.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                  <td><strong>{r.client}</strong>{r.email && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{r.email}</div>}</td>
                  <td style={{ fontWeight: 700 }}>{fmt(r.amount)}</td>
                  <td>{r.frequency}</td>
                  <td>{fmtD(r.nextDue)}</td>
                  <td><span className={`badge ${stageBadgeClass(r.status)}`}>{r.status}</span></td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditData(r); setForm({ client: r.client, email: r.email || '', amount: r.amount, frequency: r.frequency, nextDue: r.nextDue || '', status: r.status }); setModal(true); }}>Edit</button>{' '}
                      <button className="btn btn-sm" style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 8px', fontSize: 13 }} onClick={() => handleSendReminder(r)}>📧 Remind</button>{' '}
                    <button className={`btn btn-sm ${r.needsFollowUp ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 8px', fontSize: 13 }} onClick={() => toggleFollowUp(r)}>
                      {r.needsFollowUp ? '📌 Following Up' : '📍 Flag'}
                    </button>{' '}
                    <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => del(r.id)}>Del</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="mo open" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mo-box">
            <div className="mo-head"><h3>{editData ? 'Edit' : 'Create'} Recurring Invoice</h3><button className="btn-icon" onClick={() => setModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg">
                  <label>Client *</label>
                  <select value={form.client} onChange={handleClientSelect}>
                    <option value="">Select Customer...</option>
                    {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Email</label><input type="email" value={form.email} onChange={f('email')} /></div>
                <div className="fg"><label>Amount</label><input type="number" value={form.amount} onChange={f('amount')} /></div>
                <div className="fg"><label>Frequency</label><select value={form.frequency} onChange={f('frequency')}>{['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'].map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="fg"><label>Next Due</label><input type="date" value={form.nextDue} onChange={f('nextDue')} /></div>
                <div className="fg"><label>Status</label><select value={form.status} onChange={f('status')}>{['Active', 'Paused'].map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
            </div>
            <div className="mo-foot"><button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
