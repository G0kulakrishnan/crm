import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmt, stageBadgeClass } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const EMPTY = { name: '', code: '', type: 'Product', category: 'General', unit: 'Nos', rate: '', tax: 18, desc: '' };

export default function Products({ user, perms, ownerId }) {
  const canCreate = perms?.can('Products', 'create') === true;
  const canEdit = perms?.can('Products', 'edit') === true;
  const canDelete = perms?.can('Products', 'delete') === true;

  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const toast = useToast();

  const { data } = db.useQuery({ 
    products: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } }
  });
  const products = data?.products || [];
  const profile = data?.userProfiles?.[0] || {};
  const productCats = profile.productCats || ['Electronics', 'Home Appliances', 'Services', 'Furniture', 'General'];
  const taxRates = profile.taxRates || [{ label: 'None (0%)', rate: 0 }, { label: 'GST @ 5%', rate: 5 }, { label: 'GST @ 12%', rate: 12 }, { label: 'GST @ 18%', rate: 18 }, { label: 'GST @ 28%', rate: 28 }];
  
  const [search, setSearch] = useState('');
  const filtered = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [p.name, p.code, p.type, p.unit, p.desc].some(v => String(v || '').toLowerCase().includes(q));
  });

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (editData && !canEdit) { toast('Permission denied: cannot edit products', 'error'); return; }
    if (!editData && !canCreate) { toast('Permission denied: cannot create products', 'error'); return; }
    if (!form.name.trim()) { toast('Name required', 'error'); return; }
    const payload = { ...form, rate: parseFloat(form.rate) || 0, tax: parseFloat(form.tax) || 0, userId: ownerId };
    if (editData) { await db.transact(db.tx.products[editData.id].update(payload)); toast('Updated', 'success'); }
    else { await db.transact(db.tx.products[id()].update(payload)); toast('Product created', 'success'); }
    setModal(false);
  };

  const del = async (pid) => { 
    if (!canDelete) { toast('Permission denied: cannot delete products', 'error'); return; }
    if (!confirm('Delete?')) return; 
    await db.transact(db.tx.products[pid].delete()); 
    toast('Deleted', 'error'); 
  };

  return (
    <div>
      <div className="sh"><div><h2>Products & Services</h2></div>{canCreate && <button className="btn btn-primary btn-sm" onClick={() => { setEditData(null); setForm(EMPTY); setModal(true); }}>+ Create</button>}</div>
      <div className="tw">
        <div className="tw-head">
          <h3>Products & Services ({filtered.length})</h3>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="tw-scroll">
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Category</th><th>Code</th><th>Type</th><th>Unit</th><th>Rate</th><th>GST %</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No products found.</td></tr>
                : filtered.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                    <td><strong>{p.name}</strong><div style={{ fontSize: 10, color: 'var(--muted)' }}>{p.desc}</div></td>
                    <td><span style={{ fontSize: 11, background: 'var(--bg-soft)', padding: '2px 8px', borderRadius: 4 }}>{p.category || 'General'}</span></td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{p.code || '-'}</td>
                    <td><span className={`badge ${p.type === 'Service' ? 'bg-blue' : 'bg-purple'}`}>{p.type}</span></td>
                    <td style={{ fontSize: 12 }}>{p.unit}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(p.rate)}</td>
                    <td>{p.tax}%</td>
                    <td>
                      {canEdit && <button className="btn btn-secondary btn-sm" onClick={() => { setEditData(p); setForm({ name: p.name, code: p.code || '', type: p.type, category: p.category || 'General', unit: p.unit, rate: p.rate, tax: p.tax, desc: p.desc || '' }); setModal(true); }}>Edit</button>}{' '}
                      {canDelete && <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => del(p.id)}>Del</button>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <div className="mo open">
          <div className="mo-box">
            <div className="mo-head"><h3>{editData ? 'Edit' : 'Create'} Product/Service</h3><button className="btn-icon" onClick={() => setModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg span2"><label>Name *</label><input value={form.name} onChange={f('name')} /></div>
                <div className="fg"><label>Item Code</label><input value={form.code} onChange={f('code')} placeholder="SKU / HSN" /></div>
                <div className="fg"><label>Category</label>
                  <select value={form.category} onChange={f('category')}>
                    {productCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Type</label><select value={form.type} onChange={f('type')}>{['Service', 'Product'].map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="fg"><label>Unit</label><select value={form.unit} onChange={f('unit')}>{['Nos', 'Hours', 'Days', 'Months', 'Kgs', 'Ltrs', 'Meters', 'Other'].map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="fg"><label>Rate (₹)</label><input type="number" value={form.rate} onChange={f('rate')} /></div>
                <div className="fg"><label>GST %</label><select value={form.tax} onChange={f('tax')}>{taxRates.map(t => <option key={t.label} value={t.rate}>{t.label}</option>)}</select></div>
                <div className="fg span2"><label>Description</label><textarea value={form.desc} onChange={f('desc')} style={{ minHeight: 55 }} /></div>
              </div>
            </div>
            <div className="mo-foot"><button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
