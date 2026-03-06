import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD, fmt, stageBadgeClass, TAX_OPTIONS } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const EMPTY = { client: '', validUntil: '', status: 'Created', template: 'Classic', notes: '', terms: '', disc: 0, adj: 0, tdsRate: 0, items: [{ name: '', desc: '', qty: 1, rate: 0, taxRate: 0 }] };

function calcTotals(items, disc, tdsRate, adj) {
  const sub = items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0);
  const taxTotal = items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0) * (it.taxRate || 0) / 100, 0);
  const discAmt = sub * (disc || 0) / 100;
  const tdsAmt = (sub - discAmt) * (tdsRate || 0) / 100;
  const total = Math.round(sub - discAmt + taxTotal - tdsAmt + (parseFloat(adj) || 0));
  return { sub, taxTotal, discAmt, tdsAmt, total };
}

export default function Quotations({ user }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [printing, setPrinting] = useState(null);
  const toast = useToast();

  const { data } = db.useQuery({
    quotes: { $: { where: { userId: user.id } } },
    products: { $: { where: { userId: user.id } } },
    customers: { $: { where: { userId: user.id } } },
    userProfiles: { $: { where: { userId: user.id } } },
  });
  const quotes = data?.quotes || [];
  const products = data?.products || [];
  const customers = data?.customers || [];
  const profile = data?.userProfiles?.[0] || {};

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

  const openCreate = () => { setEditData(null); setForm(EMPTY); setModal(true); };
  const openEdit = (q) => {
    setEditData(q);
    setForm({ client: q.client, validUntil: q.validUntil || '', status: q.status, template: q.template || 'Classic', notes: q.notes || '', terms: q.terms || '', disc: q.disc || 0, adj: q.adj || 0, tdsRate: q.tdsRate || 0, items: q.items?.length ? q.items : EMPTY.items });
    setModal(true);
  };

  const save = async () => {
    if (!form.client.trim()) { toast('Client name required', 'error'); return; }
    const payload = { ...form, userId: user.id, date: new Date().toISOString().split('T')[0], total: tots.total, sub: tots.sub, taxAmt: tots.taxTotal };
    try {
      if (editData) {
        await db.transact(db.tx.quotes[editData.id].update(payload));
        toast('Quotation updated', 'success');
      } else {
        const qno = `QUOTE/${new Date().getFullYear()}/${String(quotes.length + 1).padStart(3, '0')}`;
        await db.transact(db.tx.quotes[id()].update({ ...payload, no: qno }));
        toast('Quotation created', 'success');
      }
      setModal(false);
    } catch { toast('Error saving quotation', 'error'); }
  };

  const del = async (qid) => {
    if (!confirm('Delete this quotation?')) return;
    await db.transact(db.tx.quotes[qid].delete());
    toast('Deleted', 'error');
  };

  const updateItem = (i, k, v) => {
    let newIt = { ...form.items[i], [k]: k === 'name' || k === 'desc' ? v : parseFloat(v) || 0 };
    if (k === 'name') {
      const pMatch = products.find(p => p.name === v);
      if (pMatch) newIt = { ...newIt, rate: pMatch.rate || 0, taxRate: pMatch.taxRate || 0 };
    }
    const items = form.items.map((it, idx) => idx === i ? newIt : it);
    setForm(p => ({ ...p, items }));
  };
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { name: '', desc: '', qty: 1, rate: 0, taxRate: 0 }] }));
  const removeItem = (i) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));

  const convertToInvoice = async (q) => {
    if (!confirm(`Convert Quotation ${q.no} to Invoice?`)) return;
    try {
      const invNo = `INV/${new Date().getFullYear()}/${String(Math.floor(Math.random()*1000)).padStart(3, '0')}`;
      const payload = { ...q, no: invNo, status: 'Draft', createdAt: Date.now() };
      delete payload.id;
      
      await db.transact([
        db.tx.invoices[id()].update(payload),
        db.tx.quotes[q.id].update({ status: 'Completed' })
      ]);
      toast('Converted to Invoice successfully!', 'success');
    } catch { toast('Error converting', 'error'); }
  };

  if (printing) {
    const ptots = calcTotals(printing.items, printing.disc, printing.tdsRate, printing.adj);
    const t = printing.template || 'Classic';
    
    return (
      <div style={{ padding: t === 'Minimal' ? '20px' : '40px', maxWidth: 900, margin: '0 auto', background: '#fff', color: '#000', fontFamily: t === 'Modern' ? 'Outfit, sans-serif' : 'sans-serif' }}>
        {/* Header Section */}
        {t === 'Modern' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 50, background: 'var(--accent)', color: '#fff', padding: 30, borderRadius: 12 }}>
             <div><h1 style={{ margin: 0, fontSize: 42, letterSpacing: -1 }}>QUOTATION</h1><div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>No: {printing.no} | {fmtD(printing.date)}</div></div>
             <div style={{ textAlign: 'right' }}>
               <h2 style={{ margin: 0 }}>{profile.bizName}</h2>
               <div style={{ fontSize: 12, opacity: 0.9 }}>{profile.email} | {profile.phone}</div>
             </div>
          </div>
        ) : t === 'Minimal' ? (
          <div style={{ marginBottom: 60 }}>
             <h1 style={{ fontSize: 24, fontWeight: 300, margin: '0 0 10px 0' }}>Quotation <span>#{printing.no}</span></h1>
             <div style={{ fontSize: 12, color: '#999' }}>Issued on {fmtD(printing.date)}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>QUOTATION</h1>
              <div style={{ fontSize: 13, color: '#666', marginTop: 5 }}>No: <strong>{printing.no}</strong></div>
              <div style={{ fontSize: 13, color: '#666' }}>Date: {fmtD(printing.date)}</div>
              {printing.validUntil && <div style={{ fontSize: 13, color: '#666' }}>Valid Until: {fmtD(printing.validUntil)}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{profile.bizName || 'Your Business'}</h2>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4, whiteSpace: 'pre-wrap' }}>{profile.address}</div>
              {profile.gstin && <div style={{ fontSize: 13, color: '#666' }}>GSTIN: {profile.gstin}</div>}
            </div>
          </div>
        )}

        {/* Client Section */}
        <div style={{ marginBottom: 40, borderLeft: t === 'Classic' ? '3px solid var(--accent)' : 'none', paddingLeft: t === 'Classic' ? 15 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase' }}>Quoted To</div>
          <div style={{ fontSize: t === 'Modern' ? 20 : 16, fontWeight: 700, marginTop: 4 }}>{printing.client}</div>
          {t === 'Minimal' && <div style={{ fontSize: 12, color: '#666', marginTop: 10 }}>{profile.bizName} • {profile.address}</div>}
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
          <thead>
            <tr style={{ background: t === 'Modern' ? '#f8fafc' : 'transparent', borderBottom: t === 'Minimal' ? '1px solid #eee' : '2px solid #000' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12 }}>Description</th>
              <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12 }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12 }}>Rate</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12 }}>Tax</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(printing.items || []).map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '14px 8px', fontSize: 13 }}><strong>{it.name}</strong>{it.desc && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{it.desc}</div>}</td>
                <td style={{ padding: '14px 8px', fontSize: 13, textAlign: 'center' }}>{it.qty}</td>
                <td style={{ padding: '14px 8px', fontSize: 13, textAlign: 'right' }}>{fmt(it.rate)}</td>
                <td style={{ padding: '14px 8px', fontSize: 13, textAlign: 'right' }}>{it.taxRate}%</td>
                <td style={{ padding: '14px 8px', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{fmt(it.qty * it.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ width: '45%', fontSize: 12, color: '#555' }}>
            {printing.notes && <div style={{ marginBottom: 15 }}><strong>Notes:</strong><br/>{printing.notes}</div>}
            {printing.terms && <div><strong>Terms:</strong><br/>{printing.terms}</div>}
          </div>
          <div style={{ width: '40%', background: t === 'Modern' ? '#f8fafc' : 'transparent', padding: t === 'Modern' ? 20 : 0, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <span style={{ color: '#666' }}>Subtotal</span><span>{fmt(ptots.sub)}</span>
            </div>
            {ptots.discAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#d97706' }}><span>Discount ({printing.disc}%)</span><span>- {fmt(ptots.discAmt)}</span></div>}
            {ptots.taxTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}><span>Tax</span><span>{fmt(ptots.taxTotal)}</span></div>}
            {ptots.tdsAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#dc2626' }}><span>TDS ({printing.tdsRate}%)</span><span>- {fmt(ptots.tdsAmt)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0 0 0', fontSize: 20, fontWeight: 800, borderTop: t === 'Minimal' ? '1px solid #eee' : '2px solid #000', marginTop: 10 }}>
              <span>Total</span><span style={{ color: t === 'Modern' ? 'var(--accent)' : '#000' }}>{fmt(ptots.total)}</span>
            </div>
          </div>
        </div>

        <div className="no-print" style={{ marginTop: 40, textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={() => window.print()} style={{ marginRight: 10 }}>Print / Save PDF</button>
          <button className="btn btn-secondary" onClick={() => setPrinting(null)}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sh">
        <div><h2>Quotations</h2></div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Create</button>
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
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(q)}>Edit</button>
                    <button className="btn-icon" onClick={(e) => {
                      const dm = e.currentTarget.nextElementSibling;
                      document.querySelectorAll('.dd-menu').forEach(el => el !== dm && (el.style.display = 'none'));
                      dm.style.display = dm.style.display === 'block' ? 'none' : 'block';
                    }}>⋮</button>
                    <div className="dd-menu" style={{ display: 'none', position: 'absolute', right: 0, top: 28, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 140, overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { setPrinting(q); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>📄 View / PDF</div>
                      <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { convertToInvoice(q); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>💵 Convert to Invoice</div>
                      <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#dc2626' }} onClick={() => { del(q.id); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>🗑 Delete</div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="mo open" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mo-box wide">
            <div className="mo-head">
              <h3>{editData ? 'Edit Quotation' : 'Create Quotation'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="mo-body">
              <div className="fgrid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="fg">
                  <label>Client *</label>
                  <input list="custList" value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} placeholder="Search or enter client..." />
                  <datalist id="custList">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
                </div>
                <div className="fg"><label>Valid Until</label><input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} /></div>
                <div className="fg"><label>Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {['Created', 'Sent', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Template</label>
                  <select value={form.template} onChange={e => setForm(p => ({ ...p, template: e.target.value }))}>
                    {['Classic', 'Modern', 'Minimal'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

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
                            {TAX_OPTIONS.map(t => <option key={t.label} value={t.rate}>{t.label}</option>)}
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
                  <div className="total-row"><span style={{ color: 'var(--muted)' }}>Tax (GST)</span><span style={{ fontWeight: 600, color: '#16a34a' }}>{fmt(tots.taxTotal)}</span></div>
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
    </div>
  );
}
