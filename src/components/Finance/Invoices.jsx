import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD, fmt, stageBadgeClass, TAX_OPTIONS } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

function calcTotals(items, disc, tdsRate, adj) {
  const sub = items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0);
  const taxTotal = items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0) * (it.taxRate || 0) / 100, 0);
  const discAmt = sub * (disc || 0) / 100;
  const tdsAmt = (sub - discAmt) * (tdsRate || 0) / 100;
  const total = Math.round(sub - discAmt + taxTotal - tdsAmt + (parseFloat(adj) || 0));
  return { sub, taxTotal, discAmt, tdsAmt, total };
}

const EMPTY = { client: '', dueDate: '', status: 'Draft', template: 'Classic', notes: '', terms: '', disc: 0, adj: 0, tdsRate: 0, items: [{ name: '', desc: '', qty: 1, rate: 0, taxRate: 0 }] };

export default function Invoices({ user }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [printing, setPrinting] = useState(null);
  const toast = useToast();

  const { data } = db.useQuery({
    invoices: { $: { where: { userId: user.id } } },
    products: { $: { where: { userId: user.id } } },
    customers: { $: { where: { userId: user.id } } },
    userProfiles: { $: { where: { userId: user.id } } },
  });
  const invoices = data?.invoices || [];
  const products = data?.products || [];
  const customers = data?.customers || [];
  const profile = data?.userProfiles?.[0] || {};
  const filtered = React.useMemo(() => {
    return invoices.filter(inv => tab === 'all' || inv.status === tab)
      .filter(inv => {
        if (!search) return true;
        const s = search.toLowerCase();
        return [inv.no, inv.client, inv.status, inv.notes, inv.terms].some(v => (v || '').toLowerCase().includes(s)) ||
               (inv.items || []).some(it => (it.name || '').toLowerCase().includes(s));
      });
  }, [invoices, tab, search]);
  const tots = calcTotals(form.items, form.disc, form.tdsRate, form.adj);

  const openCreate = () => { setEditData(null); setForm(EMPTY); setModal(true); };
  const openEdit = (inv) => {
    setEditData(inv);
    setForm({ client: inv.client, dueDate: inv.dueDate || '', status: inv.status || 'Draft', template: inv.template || 'Classic', notes: inv.notes || '', terms: inv.terms || '', disc: inv.disc || 0, adj: inv.adj || 0, tdsRate: inv.tdsRate || 0, items: inv.items?.length ? inv.items : EMPTY.items });
    setModal(true);
  };

  const save = async () => {
    if (!form.client.trim()) { toast('Client required', 'error'); return; }
    const payload = { ...form, userId: user.id, date: new Date().toISOString().split('T')[0], total: tots.total };
    if (editData) {
      await db.transact(db.tx.invoices[editData.id].update(payload));
      toast('Invoice updated', 'success');
    } else {
      const no = `INV/${new Date().getFullYear()}/${String(invoices.length + 1).padStart(3, '0')}`;
      await db.transact(db.tx.invoices[id()].update({ ...payload, no }));
      toast('Invoice created', 'success');
    }
    setModal(false);
  };

  const del = async (iid) => {
    if (!confirm('Delete?')) return;
    await db.transact(db.tx.invoices[iid].delete());
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

  if (printing) {
    const ptots = calcTotals(printing.items, printing.disc, printing.tdsRate, printing.adj);
    const t = printing.template || 'Classic';
    
    return (
      <div style={{ padding: t === 'Minimal' ? '20px' : '40px', maxWidth: 900, margin: '0 auto', background: '#fff', color: '#000', fontFamily: t === 'Modern' ? 'Outfit, sans-serif' : 'sans-serif' }}>
        {/* Header Section */}
        {t === 'Modern' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 50, background: 'var(--accent)', color: '#fff', padding: 30, borderRadius: 12 }}>
             <div><h1 style={{ margin: 0, fontSize: 42, letterSpacing: -1 }}>INVOICE</h1><div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>No: {printing.no} | {fmtD(printing.date)}</div></div>
             <div style={{ textAlign: 'right' }}>
               <h2 style={{ margin: 0 }}>{profile.bizName}</h2>
               <div style={{ fontSize: 12, opacity: 0.9 }}>{profile.email} | {profile.phone}</div>
             </div>
          </div>
        ) : t === 'Minimal' ? (
          <div style={{ marginBottom: 60 }}>
             <h1 style={{ fontSize: 24, fontWeight: 300, margin: '0 0 10px 0' }}>Invoice <span>#{printing.no}</span></h1>
             <div style={{ fontSize: 12, color: '#999' }}>Issued on {fmtD(printing.date)}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {profile.logo && <img src={profile.logo} alt="Logo" style={{ height: 70, width: 70, objectFit: 'contain' }} />}
              <div>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>INVOICE</h1>
                <div style={{ fontSize: 13, color: '#666', marginTop: 5 }}>No: <strong>{printing.no}</strong></div>
                <div style={{ fontSize: 13, color: '#666' }}>Date: {fmtD(printing.date)}</div>
                {printing.dueDate && <div style={{ fontSize: 13, color: '#666' }}>Due Date: {fmtD(printing.dueDate)}</div>}
              </div>
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
          <div style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase' }}>Billed To</div>
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

        {/* Bank & QR Section */}
        {(profile.bankName || profile.qrCode) && (
          <div style={{ marginTop: 40, borderTop: '1px solid #eee', paddingTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            {profile.bankName && (
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#666', marginBottom: 8, textTransform: 'uppercase' }}>Bank Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', rowGap: 4 }}>
                  <span style={{ color: '#666' }}>Account:</span><span style={{ fontWeight: 600 }}>{profile.accHolder}</span>
                  <span style={{ color: '#666' }}>Bank:</span><span>{profile.bankName}</span>
                  <span style={{ color: '#666' }}>A/C No:</span><span style={{ fontWeight: 600 }}>{profile.accountNo}</span>
                  <span style={{ color: '#666' }}>IFSC:</span><span>{profile.ifsc}</span>
                </div>
              </div>
            )}
            {profile.qrCode && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#666', marginBottom: 8, textTransform: 'uppercase' }}>Scan to Pay</div>
                <img src={profile.qrCode} alt="Payment QR" style={{ height: 100, width: 100, borderRadius: 4 }} />
              </div>
            )}
          </div>
        )}

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
        <div><h2>Invoices</h2></div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Create</button>
      </div>
      <div className="tabs">
        {['all', 'Draft', 'Sent', 'Paid', 'Overdue'].map(t => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t === 'all' ? 'All' : t}</div>
        ))}
      </div>
      <div className="tw">
        <div className="tw-head">
          <h3>Invoices ({filtered.length})</h3>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table>
          <thead><tr><th>#</th><th>Invoice No.</th><th>Client</th><th>Status</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No invoices yet</td></tr>
              : filtered.map((inv, i) => (
                <tr key={inv.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                  <td><strong style={{ fontSize: 12 }}>{inv.no}</strong></td>
                  <td>{inv.client}</td>
                  <td><span className={`badge ${stageBadgeClass(inv.status)}`}>{inv.status}</span></td>
                  <td style={{ fontSize: 12 }}>{fmtD(inv.date)}</td>
                  <td style={{ fontSize: 12 }}>{fmtD(inv.dueDate)}</td>
                  <td style={{ fontWeight: 700 }}>{fmt(inv.total)}</td>
                  <td>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(inv)}>Edit</button>
                      <button className="btn-icon" onClick={(e) => {
                        const dm = e.currentTarget.nextElementSibling;
                        document.querySelectorAll('.dd-menu').forEach(el => el !== dm && (el.style.display = 'none'));
                        dm.style.display = dm.style.display === 'block' ? 'none' : 'block';
                      }}>⋮</button>
                      <div className="dd-menu" style={{ display: 'none', position: 'absolute', right: 0, top: 28, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 100, overflow: 'hidden' }}>
                        <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { setPrinting(inv); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>📄 Print</div>
                        <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#dc2626' }} onClick={() => { del(inv.id); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>🗑 Delete</div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="mo open" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mo-box wide">
            <div className="mo-head"><h3>{editData ? 'Edit Invoice' : 'Create Invoice'}</h3><button className="btn-icon" onClick={() => setModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="fg">
                  <label>Client *</label>
                  <input list="custList_inv" value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} placeholder="Search or enter client..." />
                  <datalist id="custList_inv">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
                </div>
                <div className="fg"><label>Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} /></div>
                <div className="fg"><label>Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {['Draft', 'Sent', 'Paid', 'Overdue'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Template</label>
                  <select value={form.template} onChange={e => setForm(p => ({ ...p, template: e.target.value }))}>
                    {['Classic', 'Modern', 'Minimal'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Line Items</label>
                <button className="btn btn-secondary btn-sm" onClick={() => setForm(p => ({ ...p, items: [...p.items, { name: '', desc: '', qty: 1, rate: 0, taxRate: 0 }] }))}>+ Add Row</button>
              </div>
              <table className="li-table">
                <thead><tr><th>Item</th><th style={{ width: 60 }}>Qty</th><th style={{ width: 90 }}>Rate</th><th style={{ width: 160 }}>Tax</th><th style={{ width: 80 }}>Amount</th><th></th></tr></thead>
                <tbody>
                  {form.items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        <input className="li-input" list="prodList" value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Item" />
                        <datalist id="prodList">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
                      </td>
                      <td><input className="li-input" type="number" value={it.qty} onChange={e => updateItem(i, 'qty', e.target.value)} style={{ width: 55, textAlign: 'center' }} /></td>
                      <td><input className="li-input" type="number" value={it.rate} onChange={e => updateItem(i, 'rate', e.target.value)} style={{ textAlign: 'right' }} /></td>
                      <td><select className="li-input" value={it.taxRate} onChange={e => updateItem(i, 'taxRate', e.target.value)}>{TAX_OPTIONS.map(t => <option key={t.label} value={t.rate}>{t.label}</option>)}</select></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12 }}>{((it.qty || 0) * (it.rate || 0)).toFixed(2)}</td>
                      <td><button onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 5, cursor: 'pointer', width: 22, height: 22 }}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 14 }}>
                <div>
                  <div className="fg"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ minHeight: 55 }} /></div>
                  <div className="fg"><label>Terms</label><textarea value={form.terms} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} style={{ minHeight: 50 }} /></div>
                </div>
                <div className="totals-box">
                  <div className="total-row"><span style={{ color: 'var(--muted)' }}>Sub Total</span><span style={{ fontWeight: 700 }}>{fmt(tots.sub)}</span></div>
                  <div className="total-row"><span style={{ color: 'var(--muted)' }}>Discount</span><span style={{ color: '#dc2626' }}>- {fmt(tots.discAmt)}</span></div>
                  <div className="total-row"><span style={{ color: 'var(--muted)' }}>GST</span><span style={{ color: '#16a34a' }}>{fmt(tots.taxTotal)}</span></div>
                  <div className="total-row"><span style={{ color: 'var(--muted)' }}>TDS</span><span style={{ color: '#dc2626' }}>- {fmt(tots.tdsAmt)}</span></div>
                  <div className="total-row grand"><strong style={{ fontSize: 14 }}>Total (₹)</strong><strong style={{ fontSize: 18, color: 'var(--accent2)' }}>{fmt(tots.total)}</strong></div>
                </div>
              </div>
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={save}>Save Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
