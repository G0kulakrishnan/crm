import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD, fmt, stageBadgeClass } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const DEFAULT_CATS = ['Software', 'Hardware', 'Travel', 'Office', 'Marketing', 'Utilities', 'Salaries', 'Misc'];
const EMPTY = { desc: '', amount: '', category: 'Office', date: '', status: 'Pending', notes: '' };

export default function Expenses({ user }) {
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const toast = useToast();

  const { data } = db.useQuery({ 
    expenses: { $: { where: { userId: user.id } } },
    userProfiles: { $: { where: { userId: user.id } } }
  });
  const expenses = data?.expenses || [];
  const cats = data?.userProfiles?.[0]?.expCats || DEFAULT_CATS;
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const total = useMemo(() => expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + (e.amount || 0), 0), [expenses]);
  const pending = useMemo(() => expenses.filter(e => e.status === 'Pending').reduce((s, e) => s + (e.amount || 0), 0), [expenses]);

  const save = async () => {
    if (!form.desc.trim()) { toast('Description required', 'error'); return; }
    const payload = { ...form, amount: parseFloat(form.amount) || 0, userId: user.id };
    if (editData) { await db.transact(db.tx.expenses[editData.id].update(payload)); toast('Updated', 'success'); }
    else { await db.transact(db.tx.expenses[id()].update(payload)); toast('Expense added', 'success'); }
    setModal(false);
  };

  const del = async (eid) => { if (!confirm('Delete?')) return; await db.transact(db.tx.expenses[eid].delete()); toast('Deleted', 'error'); };
  const changeStatus = async (eid, s) => { await db.transact(db.tx.expenses[eid].update({ status: s })); toast(`Expense ${s.toLowerCase()}`, 'success'); };

  return (
    <div>
      <div className="sh"><div><h2>Expenses</h2></div><button className="btn btn-primary btn-sm" onClick={() => { setEditData(null); setForm(EMPTY); setModal(true); }}>+ Add Expense</button></div>
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="stat-card sc-green"><div className="lbl">Approved</div><div className="val">{fmt(total)}</div></div>
        <div className="stat-card sc-yellow"><div className="lbl">Pending</div><div className="val">{fmt(pending)}</div></div>
        <div className="stat-card sc-blue"><div className="lbl">Total Entries</div><div className="val">{expenses.length}</div></div>
      </div>
      <div className="tw">
        <div className="tw-head"><h3>Expenses ({expenses.length})</h3></div>
        <table>
          <thead><tr><th>#</th><th>Description</th><th>Category</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {expenses.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No expenses</td></tr>
              : expenses.map((e, i) => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                  <td>{e.desc}</td>
                  <td><span className="badge bg-gray">{e.category}</span></td>
                  <td style={{ fontSize: 12 }}>{fmtD(e.date)}</td>
                  <td style={{ fontWeight: 700 }}>{fmt(e.amount)}</td>
                  <td><span className={`badge ${stageBadgeClass(e.status)}`}>{e.status}</span></td>
                  <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {e.status === 'Pending' && <><button className="btn btn-sm" style={{ background: '#dcfce7', color: '#166534' }} onClick={() => changeStatus(e.id, 'Approved')}>✓</button><button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => changeStatus(e.id, 'Rejected')}>✕</button></>}
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditData(e); setForm({ desc: e.desc, amount: e.amount, category: e.category, date: e.date || '', status: e.status, notes: e.notes || '' }); setModal(true); }}>Edit</button>
                    <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => del(e.id)}>Del</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="mo open" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mo-box">
            <div className="mo-head"><h3>{editData ? 'Edit' : 'Add'} Expense</h3><button className="btn-icon" onClick={() => setModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg span2"><label>Description *</label><input value={form.desc} onChange={f('desc')} placeholder="Expense description" /></div>
                <div className="fg"><label>Category</label><select value={form.category} onChange={f('category')}>{cats.map(c => <option key={c}>{c}</option>)}</select></div>
                <div className="fg"><label>Amount (₹)</label><input type="number" value={form.amount} onChange={f('amount')} /></div>
                <div className="fg"><label>Date</label><input type="date" value={form.date} onChange={f('date')} /></div>
                <div className="fg"><label>Status</label><select value={form.status} onChange={f('status')}>{['Pending', 'Approved', 'Rejected'].map(s => <option key={s}>{s}</option>)}</select></div>
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
