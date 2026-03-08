import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD, fmt, stageBadgeClass, daysLeft } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { sendEmail, sendEmailMock, renderTemplate } from '../../utils/messaging';
import SearchableSelect from '../UI/SearchableSelect';

const EMPTY = { client: '', email: '', phone: '', contractNo: '', cycle: 'Yearly', startDate: '', endDate: '', amount: '', plan: 'Basic', status: 'Active', notes: '' };

export default function AMC({ user }) {
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const toast = useToast();

  const { data } = db.useQuery({ 
    amc: { $: { where: { userId: user.id } } },
    customers: { $: { where: { userId: user.id } } },
    invoices: { $: { where: { userId: user.id } } }, // Fetch invoices solely to get accurate next invoice numbers
    userProfiles: { $: { where: { userId: user.id } } }
  });
  const amcList = data?.amc || [];
  const customers = data?.customers || [];

  const filtered = useMemo(() => {
    const now = new Date();
    return amcList.filter(a => {
      if (tab === 'expiring') { const d = daysLeft(a.endDate); return d <= 30 && d >= 0; }
      if (tab === 'expired') return new Date(a.endDate) < now;
      if (tab === 'active') return a.status === 'Active' && new Date(a.endDate) >= now;
      if (tab === 'followup') return a.needsFollowUp;
      return true;
    }).filter(a => {
      if (!search) return true;
      const q = search.toLowerCase();
      return [a.client, a.email, a.phone, a.contractNo, a.plan, a.status].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [amcList, tab, search]);

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleStartDateChange = (val) => {
    let endDate = form.endDate;
    if (val && form.cycle !== 'Custom') {
      const d = new Date(val);
      if (form.cycle === 'Monthly') d.setMonth(d.getMonth() + 1);
      else if (form.cycle === 'Yearly') d.setFullYear(d.getFullYear() + 1);
      d.setDate(d.getDate() - 1);
      endDate = d.toISOString().split('T')[0];
    }
    setForm(p => ({ ...p, startDate: val, endDate }));
  };

  const handleCycleChange = (val) => {
    let endDate = form.endDate;
    if (form.startDate && val !== 'Custom') {
      const d = new Date(form.startDate);
      if (val === 'Monthly') d.setMonth(d.getMonth() + 1);
      else if (val === 'Yearly') d.setFullYear(d.getFullYear() + 1);
      d.setDate(d.getDate() - 1);
      endDate = d.toISOString().split('T')[0];
    }
    setForm(p => ({ ...p, cycle: val, endDate }));
  };

  const handleClientSelect = (cName) => {
    const cust = customers.find(c => c.name === cName);
    setForm(p => ({ 
      ...p, 
      client: cName, 
      email: cust ? cust.email : p.email, 
      phone: cust && cust.phone ? cust.phone : p.phone 
    }));
  };

  const save = async () => {
    if (!form.client.trim()) { toast('Client required', 'error'); return; }
    const payload = { ...form, amount: parseFloat(form.amount) || 0, userId: user.id };
    if (editData) { await db.transact(db.tx.amc[editData.id].update(payload)); toast('AMC updated', 'success'); }
    else { await db.transact(db.tx.amc[id()].update(payload)); toast('AMC contract created', 'success'); }
    setModal(false);
  };

  const del = async (aid) => { if (!confirm('Delete?')) return; await db.transact(db.tx.amc[aid].delete()); toast('Deleted', 'error'); };

  const getStatusBadge = (a) => {
    const d = daysLeft(a.endDate);
    if (d < 0) return { label: 'Expired', cls: 'bg-red' };
    if (d <= 30) return { label: `Expiring in ${d}d`, cls: 'bg-yellow' };
    return { label: 'Active', cls: 'bg-green' };
  };

  const toggleFollowUp = async (a) => {
    await db.transact(db.tx.amc[a.id].update({ needsFollowUp: !a.needsFollowUp }));
    toast(a.needsFollowUp ? 'Follow-up removed' : 'Marked for follow-up', 'success');
  };

  const handleSendReminder = async (a) => {
    if (!a.email) return toast('Client has no email address', 'error');
    if (!confirm(`Send reminder email to ${a.client} (${a.email})?`)) return;
    
    const profile = data?.userProfiles?.[0] || {};
    const reminders = profile.reminders || { amc: { msg: 'Hello {client}, your AMC contract is expiring on {date}.' } };
    const template = reminders.amc?.msg || 'Hello {client}, your AMC contract is expiring on {date}.';
    
    const emailConfig = {
      smtpHost: profile.smtpHost,
      smtpPort: profile.smtpPort,
      smtpUser: profile.smtpUser,
      smtpPass: profile.smtpPass,
      bizName: profile.bizName
    };

    const body = renderTemplate(template, { client: a.client, date: fmtD(a.endDate), contractNo: a.contractNo, bizName: profile.bizName || '' });
    const subject = 'AMC Renewal Reminder';

    try {
      toast('Sending email...', 'info');
      if (emailConfig.smtpHost && emailConfig.smtpUser && emailConfig.smtpPass) {
        const res = await sendEmail(a.email, subject, body, emailConfig, user.id);
        if (res === 'OK') toast('Reminder sent successfully!', 'success');
        else toast('Failed to send', 'error');
      } else {
        await sendEmailMock(user.id, a.email, subject, body, { entityId: a.id, entityType: 'amc' });
        toast('Email config missing, logged to outbox.', 'warning');
      }
    } catch (e) {
      toast('Failed to send email', 'error');
    }
  };

  const handleGenerateInvoice = async (a) => {
    if (!confirm(`Generate Draft Invoice for ${a.client} (₹${a.amount})?`)) return;
    
    // Get existing invoices length rough count to make a tentative invoice no
    const currentInvoicesLength = data?.invoices ? data.invoices.length : 0;
    const no = `INV/${new Date().getFullYear()}/${String(currentInvoicesLength + 1).padStart(3, '0')}`;
    
    const invoicePayload = {
      userId: user.id,
      no,
      client: a.client,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 Days from now
      status: 'Draft',
      template: 'Classic',
      total: a.amount,
      disc: 0,
      adj: 0,
      tdsRate: 0,
      notes: a.contractNo || '',
      fromAmc: true,
      items: [{
        name: a.plan || 'AMC Plan',
        desc: `${fmtD(a.startDate)} to ${fmtD(a.endDate)}`,
        qty: 1,
        rate: a.amount,
        taxRate: 0
      }]
    };

    await db.transact(db.tx.invoices[id()].update(invoicePayload));
    toast('Draft Invoice created!', 'success');
  };

  return (
    <div>
      <div className="sh"><div><h2>AMC Contracts</h2><div className="sub">Annual Maintenance Contracts</div></div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditData(null); setForm(EMPTY); setModal(true); }}>+ Create AMC</button>
      </div>
      <div className="tabs">
        {[['all', 'All'], ['active', 'Active'], ['expiring', '⚠ Expiring (30d)'], ['expired', 'Expired'], ['followup', '📌 Needs Follow Up']].map(([t, l]) => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{l}</div>
        ))}
      </div>
      <div className="tw">
        <div className="tw-head">
          <h3>AMC Contracts ({filtered.length})</h3>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table>
          <thead><tr><th>#</th><th>Client</th><th>Contract No.</th><th>Plan</th><th>Start</th><th>End (Expiry)</th><th>Amount</th><th>Status</th><th>Phone</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No AMC contracts</td></tr>
              : filtered.map((a, i) => {
                const s = getStatusBadge(a);
                return (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                    <td><strong>{a.client}</strong><div style={{ fontSize: 10, color: 'var(--muted)' }}>{a.email}</div></td>
                    <td style={{ fontSize: 12 }}>{a.contractNo || '-'}</td>
                    <td>{a.plan}</td>
                    <td style={{ fontSize: 12 }}>{fmtD(a.startDate)}</td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{fmtD(a.endDate)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(a.amount)}</td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td style={{ fontSize: 12 }}>{a.phone || '-'}</td>
                    <td>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditData(a); setForm({ client: a.client, email: a.email || '', phone: a.phone || '', contractNo: a.contractNo || '', cycle: a.cycle || 'Yearly', startDate: a.startDate || '', endDate: a.endDate || '', amount: a.amount, plan: a.plan, status: a.status, notes: a.notes || '' }); setModal(true); }}>Edit</button>
                        <button className={`btn-icon ${a.needsFollowUp ? 'text-primary' : ''}`} style={{ padding: '4px 8px', fontSize: 13 }} onClick={() => toggleFollowUp(a)}>
                          {a.needsFollowUp ? '📌' : '📍'}
                        </button>
                        <button className="btn-icon" style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 8px', fontSize: 13 }} onClick={() => del(a.id)}>Del</button>
                        <button className="btn-icon" onClick={(e) => {
                          const dm = e.currentTarget.nextElementSibling;
                          document.querySelectorAll('.dd-menu').forEach(el => el !== dm && (el.style.display = 'none'));
                          dm.style.display = dm.style.display === 'block' ? 'none' : 'block';
                        }}>⋮</button>
                        <div className="dd-menu" style={{ display: 'none', position: 'absolute', right: 0, top: 28, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 140, overflow: 'hidden' }}>
                          <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { handleGenerateInvoice(a); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>💳 Generate Invoice</div>
                          <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer' }} onClick={() => { handleSendReminder(a); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>📧 Send Reminder</div>
                        </div>
                      </div>
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
            <div className="mo-head"><h3>{editData ? 'Edit' : 'Create'} AMC Contract</h3><button className="btn-icon" onClick={() => setModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg" style={{ zIndex: 10 }}>
                  <label>Client *</label>
                  <SearchableSelect 
                    options={customers} 
                    displayKey="name" 
                    returnKey="name"
                    value={form.client} 
                    onChange={handleClientSelect} 
                    placeholder="Search client..." 
                  />
                </div>
                <div className="fg"><label>Contract No.</label><input value={form.contractNo} onChange={f('contractNo')} placeholder="AMC/2025/001" /></div>
                <div className="fg"><label>Email</label><input type="email" value={form.email} onChange={f('email')} /></div>
                <div className="fg"><label>Phone</label><input value={form.phone} onChange={f('phone')} /></div>
                <div className="fg"><label>Cycle</label><select value={form.cycle} onChange={e => handleCycleChange(e.target.value)}>{['Custom', 'Monthly', 'Yearly'].map(c => <option key={c}>{c}</option>)}</select></div>
                <div className="fg"><label>Start Date</label><input type="date" value={form.startDate} onChange={e => handleStartDateChange(e.target.value)} /></div>
                <div className="fg"><label>End Date (Expiry)</label><input type="date" value={form.endDate} readOnly={form.cycle !== 'Custom'} onChange={e => form.cycle === 'Custom' && f('endDate')(e)} style={{ border: form.cycle !== 'Custom' ? 'none' : '', background: form.cycle !== 'Custom' ? '#f1f5f9' : '#fff' }} /></div>
                <div className="fg"><label>Plan</label><select value={form.plan} onChange={f('plan')}>{['Basic', 'Standard', 'Premium', 'Custom'].map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="fg"><label>Amount (₹)</label><input type="number" value={form.amount} onChange={f('amount')} /></div>
                <div className="fg"><label>Status</label><select value={form.status} onChange={f('status')}>{['Active', 'Expired'].map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="fg span2"><label>Notes</label><textarea value={form.notes} onChange={f('notes')} /></div>
              </div>
            </div>
            <div className="mo-foot"><button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
