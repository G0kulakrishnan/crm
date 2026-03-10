import React, { useState, useMemo, useEffect } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD, fmt, stageBadgeClass, TAX_OPTIONS, INDIAN_STATES, COUNTRIES } from '../../utils/helpers';
import DocumentTemplate from './DocumentTemplate';
import { useToast } from '../../context/ToastContext';
import SearchableSelect from '../UI/SearchableSelect';

const EMPTY = { no: '', client: '', validUntil: '', status: 'Created', template: 'Classic', notes: '', terms: '', disc: 0, adj: 0, tdsRate: 0, items: [{ name: '', desc: '', qty: 1, rate: 0, taxRate: 0 }], shipTo: '', addShipping: false, assign: '' };
const EMPTY_CUSTOMER = { name: '', email: '', phone: '', address: '', state: '', country: 'India', pincode: '', gstin: '', custom: {} };

function calcTotals(items, disc, tdsRate, adj) {
  const sub = items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0);
  const taxTotal = items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0) * (it.taxRate || 0) / 100, 0);
  const discAmt = sub * (disc || 0) / 100;
  const tdsAmt = (sub - discAmt) * (tdsRate || 0) / 100;
  const total = Math.round(sub - discAmt + taxTotal - tdsAmt + (parseFloat(adj) || 0));
  return { sub, taxTotal, discAmt, tdsAmt, total };
}

export default function Quotations({ user, perms, ownerId }) {
  const canCreate = perms?.can('Quotations', 'create') !== false;
  const canEdit = perms?.can('Quotations', 'edit') !== false;
  const canDelete = perms?.can('Quotations', 'delete') !== false;

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [printing, setPrinting] = useState(null);
  const [custModal, setCustModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState(EMPTY_CUSTOMER);
  const toast = useToast();

  const { data, isLoading } = db.useQuery({
    quotes: { $: { where: { userId: ownerId } } },
    products: { $: { where: { userId: ownerId } } },
    customers: { $: { where: { userId: ownerId } } },
    leads: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } },
    teamMembers: { $: { where: { userId: ownerId } } },
  });
  const quotes = useMemo(() => {
    const raw = data?.quotes || [];
    const isTeam = perms && !perms.isOwner;
    if (!isTeam) return raw;
    return raw.filter(q => {
      if (q.actorId === user.id || perms.isAdmin || perms.isManager) return true;
      const assignKey = (q.assign || '').toLowerCase().trim();
      const userName = (perms.name || '').toLowerCase().trim();
      const userEmail = (user.email || '').toLowerCase().trim();
      return (assignKey && userName && assignKey === userName) || (assignKey && userEmail && assignKey === userEmail);
    });
  }, [data?.quotes, perms, user]);

  const products = data?.products || [];
  const customers = data?.customers || [];
  const leads = data?.leads || [];
  const team = data?.teamMembers || [];
  const profile = data?.userProfiles?.[0] || {};
  const wonStage = profile.wonStage || 'Won';
  const taxRates = profile.taxRates || TAX_OPTIONS;
  const customFields = profile.customFields || [];
  
  const ncf = (k) => (e) => setNewCustForm(p => ({ ...p, [k]: e.target.value }));
  const nccf = (k) => (e) => setNewCustForm(p => ({ ...p, custom: { ...(p.custom || {}), [k]: e.target.value } }));
  
  const clientOptions = useMemo(() => {
    return [
      ...customers.map(c => ({ ...c, isLead: false, displayName: c.name })),
      ...leads.filter(l => l.stage !== wonStage).map(l => ({ ...l, isLead: true, displayName: `${l.name} (Lead)` }))
    ];
  }, [customers, leads]);

  const filtered = useMemo(() => {
    return quotes.filter(q => tab === 'all' || q.status === tab)
      .filter(q => {
        if (!search) return true;
        const s = search.toLowerCase();
        return [q.no, q.client, q.status, q.notes, q.terms].some(v => (v || '').toLowerCase().includes(s)) ||
               (q.items || []).some(it => (it.name || '').toLowerCase().includes(s));
      });
  }, [quotes, tab, search]);
  const tots = calcTotals(form.items, form.disc, form.tdsRate, form.adj);

  const openCreate = () => { 
    setEditData(null); 
    const nextNo = `QUOTE/${new Date().getFullYear()}/${String(quotes.length + 1).padStart(3, '0')}`;
    const defTax = profile?.defaultTaxRate || 0;
    const defTemplate = profile?.quotationTemplate || 'Classic';
    setForm({ ...EMPTY, no: nextNo, template: defTemplate, items: [{ name: '', desc: '', qty: 1, rate: 0, taxRate: defTax }] }); 
    setModal(true); 
  };
  const openEdit = (q) => {
    setEditData(q);
    const defTemplate = profile?.quotationTemplate || 'Classic';
    setForm({ 
      no: q.no || '', client: q.client, validUntil: q.validUntil || '', status: q.status, template: q.template || defTemplate, 
      notes: q.notes || '', terms: q.terms || '', disc: q.disc || 0, adj: q.adj || 0, tdsRate: q.tdsRate || 0, 
      items: q.items?.length ? q.items : EMPTY.items, shipTo: q.shipTo || '', addShipping: !!q.shipTo, assign: q.assign || '' 
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.client.trim()) { toast('Client name required', 'error'); return; }
    if (profile.reqShipping === 'Mandatory' && !form.shipTo?.trim()) { toast('Shipping Address is required', 'error'); return; }
    
    const { addShipping, ...qPayload } = form;
    if (profile.reqShipping === 'Hidden' || (!addShipping && profile.reqShipping !== 'Mandatory')) {
      qPayload.shipTo = '';
    }

    const payload = { ...qPayload, userId: ownerId, actorId: user.id, date: editData ? editData.date : new Date().toISOString().split('T')[0], total: tots.total, sub: tots.sub, taxAmt: tots.taxTotal };
    
    // Ensure no is present. If user cleared it, generate one
    if (!payload.no) {
      payload.no = editData ? editData.no : `QUOTE/${new Date().getFullYear()}/${String(quotes.length + 1).padStart(3, '0')}`;
    }

    const txs = [];
    let isNewCustomer = false;

    if (editData) {
      txs.push(db.tx.quotes[editData.id].update(payload));
    } else {
      txs.push(db.tx.quotes[id()].update({ ...payload }));
    }

    const lMatch = leads.find(l => (l.name || '').trim().toLowerCase() === (form.client || '').trim().toLowerCase() && l.stage !== wonStage);
    if (lMatch) {
       if (payload.status === 'Sent') {
          txs.push(db.tx.leads[lMatch.id].update({ 
             stage: 'Quotation Sent',
             email: lMatch.email || payload.email || '',
             phone: lMatch.phone || payload.phone || ''
          }));
          txs.push(db.tx.activityLogs[id()].update({
             entityId: lMatch.id, entityType: 'lead', text: 'Stage changed to Quotation Sent (via Quotation)',
             userId: ownerId, actorId: user.id, userName: user.email, createdAt: Date.now()
          }));
       } else if (payload.status === 'Draft' || payload.status === 'Created') {
           txs.push(db.tx.leads[lMatch.id].update({ 
              stage: 'Quotation Created',
              email: lMatch.email || payload.email || '',
              phone: lMatch.phone || payload.phone || ''
           }));
           txs.push(db.tx.activityLogs[id()].update({
              entityId: lMatch.id, entityType: 'lead', text: 'Stage changed to Quotation Created (via Quotation)',
              userId: ownerId, actorId: user.id, userName: user.email, createdAt: Date.now()
           }));
        }
    }

    try {
      await db.transact(txs);
      if (isNewCustomer) toast('Converted Lead to Customer & saved Quote', 'success');
      else toast('Quotation saved', 'success');
      setModal(false);
    } catch { toast('Error saving quotation', 'error'); }
  };

  const del = async (qid) => {
    if (!confirm('Delete this quotation?')) return;
    const q = quotes.find(x => x.id === qid);
    const txs = [db.tx.quotes[qid].delete()];
    if (q) {
      const lMatch = leads.find(l => l.name === q.client);
      if (lMatch) {
        txs.push(db.tx.activityLogs[id()].update({
          entityId: lMatch.id, entityType: 'lead', text: `Quotation ${q.no} was deleted.`,
          userId: ownerId, actorId: user.id, userName: user.email, createdAt: Date.now()
        }));
      }
    }
    await db.transact(txs);
    toast('Deleted', 'error');
  };

  const updateItem = (i, k, v) => {
    let newIt = { ...form.items[i], [k]: k === 'name' || k === 'desc' ? v : parseFloat(v) || 0 };
    if (k === 'name') {
      const pMatch = products.find(p => p.name === v);
      if (pMatch) newIt = { ...newIt, rate: pMatch.rate || 0, taxRate: pMatch.tax || 0 };
    }
    const items = form.items.map((it, idx) => idx === i ? newIt : it);
    setForm(p => ({ ...p, items }));
  };
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { name: '', desc: '', qty: 1, rate: 0, taxRate: profile?.defaultTaxRate || 0 }] }));
  const removeItem = (i) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));

  const convertToInvoice = async (q) => {
    if (!confirm(`Convert Quotation ${q.no} to Invoice?`)) return;
    try {
      const invNo = `INV/${new Date().getFullYear()}/${String(Math.floor(Math.random()*1000)).padStart(3, '0')}`;
      const payload = { ...q, no: invNo, status: 'Draft', createdAt: Date.now() };
      delete payload.id;
      
      const txs = [
        db.tx.invoices[id()].update(payload),
        db.tx.quotes[q.id].update({ status: 'Completed' })
      ];

      // Sync lead stage
      const lMatch = (data?.leads || []).find(l => l.name === q.client && l.stage !== wonStage);
      if (lMatch) {
        txs.push(db.tx.leads[lMatch.id].update({ 
           stage: 'Invoice Created',
           email: lMatch.email || q.email || '',
           phone: lMatch.phone || q.phone || ''
        }));
        txs.push(db.tx.activityLogs[id()].update({
           entityId: lMatch.id, entityType: 'lead', text: `Quotation converted to Invoice (${invNo}). Stage changed to Invoice Created.`,
           userId: ownerId, actorId: user.id, userName: user.email, createdAt: Date.now()
        }));
      }

      await db.transact(txs);
      toast('Converted to Invoice successfully!', 'success');
    } catch { toast('Error converting', 'error'); }
  };

  // Auto-fill shipping address when client changes
  useEffect(() => {
    if (form.client && !editData && profile?.reqShipping !== 'Hidden') {
      const match = customers.find(c => c.name === form.client);
      if (match && match.address) {
        setForm(p => ({ ...p, shipTo: match.address, addShipping: profile?.reqShipping === 'Optional' ? true : p.addShipping }));
      }
    }
  }, [form.client, customers, editData, profile?.reqShipping]);

  if (printing) {
    const clientMatch = customers.find(c => c.name === printing.client);
    const dataWithContext = {
      ...printing,
      clientDetails: clientMatch,
      template: printing.template || profile?.quotationTemplate || 'Classic'
    };

    return (
      <div className="quotation-print-container">
        <DocumentTemplate 
          data={dataWithContext} 
          profile={profile} 
          type="Quotation" 
        />
        <div className="no-print" style={{ marginTop: 40, textAlign: 'center', paddingBottom: 40 }}>
          <button className="btn btn-primary" onClick={() => window.print()} style={{ marginRight: 10 }}>Print / Save PDF</button>
          <button className="btn btn-secondary" onClick={() => setPrinting(null)}>Close</button>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="p-xl">Loading...</div>;

  return (
    <div>
      <div className="sh">
        <div><h2>Quotations</h2></div>
        {canCreate && <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Create</button>}
      </div>
      <div className="tabs">
        {['all', 'Created', 'Sent', 'Completed', 'Cancelled'].map(t => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t === 'all' ? 'All' : t}</div>
        ))}
      </div>
      <div className="tw">
        <div className="tw-head">
          <h3>Quotations ({filtered.length})</h3>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="tw-scroll">
          <table>
            <thead><tr><th>#</th><th>Quote No.</th><th>Client</th><th>Status</th><th>Date</th><th>Valid Until</th><th>Amount</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No quotations yet</td></tr>
              ) : filtered.map((q, i) => (
                <tr key={q.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                  <td><strong style={{ fontSize: 12 }}>{q.no}</strong></td>
                  <td>{q.client}</td>
                  <td><span className={`badge ${stageBadgeClass(q.status)}`}>{q.status}</span></td>
                  <td style={{ fontSize: 12 }}>{fmtD(q.date)}</td>
                  <td style={{ fontSize: 12 }}>{fmtD(q.validUntil)}</td>
                  <td style={{ fontWeight: 700 }}>{fmt(q.total)}</td>
                  <td>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {canEdit && <button className="btn btn-secondary btn-sm" onClick={() => openEdit(q)}>Edit</button>}
                      <button className="btn-icon" onClick={(e) => {
                        const dm = e.currentTarget.nextElementSibling;
                        document.querySelectorAll('.dd-menu').forEach(el => el !== dm && (el.style.display = 'none'));
                        dm.style.display = dm.style.display === 'block' ? 'none' : 'block';
                      }}>⋮</button>
                      <div className="dd-menu" style={{ display: 'none', position: 'absolute', right: 0, top: 28, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 140, overflow: 'hidden' }}>
                        <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { setPrinting(q); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>📄 View / PDF</div>
                        {canEdit && <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { convertToInvoice(q); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>💵 Convert to Invoice</div>}
                        {canDelete && <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#dc2626' }} onClick={() => { del(q.id); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>🗑 Delete</div>}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="mo open">
          <div className="mo-box wide">
            <div className="mo-head">
              <h3>{editData ? 'Edit Quotation' : 'Create Quotation'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="mo-body">
              <div className="fgrid" style={{ gridTemplateColumns: 'minmax(120px, 1fr) 2fr 1fr 1fr 1fr' }}>
                <div className="fg">
                  <label>Quote No.</label>
                  <input value={form.no} onChange={e => setForm(p => ({ ...p, no: e.target.value }))} placeholder="QUOTE/..." />
                </div>
                <div className="fg">
                  <label>Client / Lead *</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ flex: 1 }}>
                      <SearchableSelect 
                        options={clientOptions} 
                        displayKey="displayName" 
                        returnKey="name"
                        value={form.client} 
                        onChange={val => setForm(p => ({ ...p, client: val }))} 
                        placeholder="Search client or lead..." 
                      />
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '0 10px' }} onClick={() => setCustModal(true)} title="Add New Customer">+</button>
                  </div>
                </div>
                <div className="fg"><label>Valid Until</label><input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} /></div>
                <div className="fg"><label>Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {['Created', 'Sent', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Template</label>
                  <select value={form.template} onChange={e => setForm(p => ({ ...p, template: e.target.value }))}>
                    {['Classic', 'Modern', 'Minimal', 'Spreadsheet'].map(t => (
                      <option key={t} value={t}>{t === 'Spreadsheet' ? 'Spreadsheet (GST)' : t}</option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label>Assign To</label>
                  <select value={form.assign} onChange={e => setForm(p => ({ ...p, assign: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {team.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {profile?.reqShipping !== 'Hidden' && (
                <div style={{ background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    {profile?.reqShipping === 'Mandatory' ? (
                      <span style={{ color: 'var(--accent)' }}>Shipping Address (Required)</span>
                    ) : (
                      <>
                        <input type="checkbox" checked={form.addShipping} onChange={e => setForm(p => ({ ...p, addShipping: e.target.checked }))} style={{ width: 16, height: 16 }} />
                        Ship To Address
                      </>
                    )}
                  </label>
                  {(form.addShipping || profile?.reqShipping === 'Mandatory') && (
                    <div className="fg" style={{ marginTop: 15, marginBottom: 0 }}>
                      <textarea value={form.shipTo} onChange={e => setForm(p => ({ ...p, shipTo: e.target.value }))} placeholder="Enter full shipping address..." style={{ minHeight: 60 }} />
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4}}>Leave blank if same as billing</div>
                    </div>
                  )}
                </div>
              )}

              {/* Line Items */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Item Details</label>
                  <button className="btn btn-secondary btn-sm" onClick={addItem}>+ Add Row</button>
                </div>
                <table className="li-table">
                  <thead><tr><th>Item</th><th style={{ width: 60, textAlign: 'center' }}>Qty</th><th style={{ width: 90, textAlign: 'right' }}>Rate</th><th style={{ width: 160 }}>Tax</th><th style={{ width: 80, textAlign: 'right' }}>Amount</th><th style={{ width: 28 }}></th></tr></thead>
                  <tbody>
                    {form.items.map((it, i) => (
                      <tr key={i}>
                        <td>
                          <input className="li-input" list="prodList" value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Item name" />
                          <datalist id="prodList">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
                        </td>
                        <td><input className="li-input" type="number" value={it.qty} onChange={e => updateItem(i, 'qty', e.target.value)} style={{ width: 55, textAlign: 'center' }} /></td>
                        <td><input className="li-input" type="number" value={it.rate} onChange={e => updateItem(i, 'rate', e.target.value)} style={{ textAlign: 'right' }} /></td>
                        <td>
                          <select className="li-input" value={it.taxRate} onChange={e => updateItem(i, 'taxRate', e.target.value)}>
                            {taxRates.map(t => <option key={t.label} value={t.rate}>{t.label}</option>)}
                          </select>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12 }}>{((it.qty || 0) * (it.rate || 0)).toFixed(2)}</td>
                        <td><button onClick={() => removeItem(i)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 5, cursor: 'pointer', width: 22, height: 22 }}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 14 }}>
                <div>
                  <div className="fg"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ minHeight: 60 }} placeholder="Customer notes..." /></div>
                  <div className="fg"><label>Terms & Conditions</label><textarea value={form.terms} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} style={{ minHeight: 55 }} /></div>
                </div>
                <div className="totals-box">
                  <div className="total-row"><span style={{ color: 'var(--muted)' }}>Sub Total</span><span style={{ fontWeight: 700 }}>{fmt(tots.sub)}</span></div>
                  <div className="total-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>Discount</span>
                      <input type="number" value={form.disc} onChange={e => setForm(p => ({ ...p, disc: parseFloat(e.target.value) || 0 }))} style={{ width: 50, padding: '2px 5px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>%</span>
                    </div>
                    <span style={{ color: '#dc2626', fontSize: 12 }}>- {fmt(tots.discAmt)}</span>
                  </div>
                  {(() => {
                    const clientMatchForm = customers.find(c => c.name === form.client);
                    const isInterStateForm = profile?.bizState && clientMatchForm?.state && profile.bizState !== clientMatchForm.state;
                    if (tots.taxTotal > 0) {
                      return isInterStateForm ? (
                        <div className="total-row"><span style={{ color: 'var(--muted)' }}>IGST</span><span style={{ fontWeight: 600, color: '#16a34a' }}>{fmt(tots.taxTotal)}</span></div>
                      ) : (
                        <>
                          <div className="total-row"><span style={{ color: 'var(--muted)' }}>CGST</span><span style={{ fontWeight: 600, color: '#16a34a' }}>{fmt(tots.taxTotal / 2)}</span></div>
                          <div className="total-row"><span style={{ color: 'var(--muted)' }}>SGST</span><span style={{ fontWeight: 600, color: '#16a34a' }}>{fmt(tots.taxTotal / 2)}</span></div>
                        </>
                      );
                    }
                    return <div className="total-row"><span style={{ color: 'var(--muted)' }}>Tax (GST)</span><span style={{ fontWeight: 600, color: '#16a34a' }}>{fmt(0)}</span></div>;
                  })()}
                  <div className="total-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>TDS</span>
                      <input type="number" value={form.tdsRate} onChange={e => setForm(p => ({ ...p, tdsRate: parseFloat(e.target.value) || 0 }))} style={{ width: 50, padding: '2px 5px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>%</span>
                    </div>
                    <span style={{ color: '#dc2626', fontSize: 12 }}>- {fmt(tots.tdsAmt)}</span>
                  </div>
                  <div className="total-row">
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>Adjustment</span>
                    <input type="number" value={form.adj} onChange={e => setForm(p => ({ ...p, adj: parseFloat(e.target.value) || 0 }))} style={{ width: 70, padding: '2px 5px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', textAlign: 'right' }} />
                  </div>
                  <div className="total-row grand"><strong style={{ fontSize: 14 }}>Total (₹)</strong><strong style={{ fontSize: 18, color: 'var(--accent2)' }}>{fmt(tots.total)}</strong></div>
                </div>
              </div>
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={save}>Save Quotation</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOMER MODAL */}
      {custModal && (
        <div className="mo open">
          <div className="mo-box">
            <div className="mo-head"><h3>Quick Add Customer</h3><button className="btn-icon" onClick={() => setCustModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg span2"><label>Name *</label><input value={newCustForm.name} onChange={ncf('name')} placeholder="Full name" /></div>
                <div className="fg"><label>Email *</label><input type="email" value={newCustForm.email} onChange={ncf('email')} /></div>
                <div className="fg"><label>Phone</label><input value={newCustForm.phone} onChange={ncf('phone')} placeholder="+91..." /></div>
                <div className="fg span2"><label>Address</label><textarea value={newCustForm.address} onChange={ncf('address')} placeholder="Full address" style={{ minHeight: 60 }} /></div>
                <div className="fg"><label>Country</label>
                  <select value={newCustForm.country} onChange={ncf('country')}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="fg"><label>State</label>
                  <select value={newCustForm.state} onChange={ncf('state')}>
                    <option value="">Select State...</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Pincode</label><input value={newCustForm.pincode} onChange={ncf('pincode')} placeholder="Postal code" /></div>
                <div className="fg"><label>GSTIN</label><input value={newCustForm.gstin} onChange={ncf('gstin')} placeholder="GST Number" /></div>
                
                {customFields.length > 0 && <div className="fg span2" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                  <h4 style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Custom Fields (Optional)</h4>
                  <div className="fgrid">
                    {customFields.map(field => (
                      <div key={field.name} className="fg">
                        <label>{field.name}</label>
                        {field.type === 'dropdown' ? (
                          <select value={newCustForm.custom[field.name] || ''} onChange={nccf(field.name)}>
                            <option value="">Select...</option>
                            {field.options.split(',').map(o => <option key={o.trim()}>{o.trim()}</option>)}
                          </select>
                        ) : (
                          <input type={field.type === 'number' ? 'number' : 'text'} value={newCustForm.custom[field.name] || ''} onChange={nccf(field.name)} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>}
              </div>
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setCustModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                if (!newCustForm.name.trim()) return toast('Name required', 'error');
                if (!newCustForm.email.trim()) return toast('Email is mandatory for clients', 'error');
                const newId = id();
                await db.transact(db.tx.customers[newId].update({ ...newCustForm, name: newCustForm.name.trim(), userId: ownerId, actorId: user.id, createdAt: Date.now() }));
                setForm(p => ({ ...p, client: newCustForm.name.trim() }));
                setCustModal(false);
                setNewCustForm(EMPTY_CUSTOMER);
                toast('Customer created!', 'success');
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
