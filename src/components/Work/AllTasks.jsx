import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD, stageBadgeClass, prioBadgeClass } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import SearchableSelect from '../UI/SearchableSelect';

const DEFAULT_TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];

export default function AllTasks({ user, perms, ownerId }) {
  const canCreate = perms?.can('Tasks', 'create') !== false;
  const canEdit = perms?.can('Tasks', 'edit') !== false;
  const canDelete = perms?.can('Tasks', 'delete') !== false;

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({ title: '', assignTo: '', dueDate: '', priority: 'Medium', status: 'Pending', notes: '', projectId: '', client: '' });
  const toast = useToast();

  const { data } = db.useQuery({
    tasks: { $: { where: { userId: ownerId } } },
    projects: { $: { where: { userId: ownerId } } },
    teamMembers: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } },
    customers: { $: { where: { userId: ownerId } } }
  });
  const tasks = useMemo(() => {
    const rawTasks = data?.tasks || [];
    const isTeam = perms && !perms.isOwner;
    if (!isTeam) return rawTasks;
    return rawTasks.filter(t => {
      if (t.actorId === user.id || perms.isAdmin || perms.isManager) return true;
      const assign = (t.assignTo || '').toLowerCase().trim();
      const userName = (perms.name || '').toLowerCase().trim();
      const userEmail = (user.email || '').toLowerCase().trim();
      return (assign && (assign === userName || assign === userEmail));
    });
  }, [data?.tasks, perms, user]);

  const projects = data?.projects || [];
  const team = data?.teamMembers || [];
  const customers = data?.customers || [];
  const leads = data?.leads || [];
  const profile = data?.userProfiles?.[0] || {};
  const customFields = profile.customFields || [];
  const taskStatuses = profile.taskStatuses || DEFAULT_TASK_STATUSES;
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  
  const [custModal, setCustModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ name: '', email: '', phone: '', address: '', state: '', country: 'India', pincode: '', gstin: '', custom: {} });
  
  const ncf = (k) => (e) => setNewCustForm(p => ({ ...p, [k]: e.target.value }));
  const nccf = (k) => (e) => setNewCustForm(p => ({ ...p, custom: { ...(p.custom || {}), [k]: e.target.value } }));

  const clientOptions = useMemo(() => {
    return [
      ...customers.map(c => ({ ...c, isLead: false, displayName: c.name })),
      ...leads.filter(l => l.stage !== 'Won').map(l => ({ ...l, isLead: true, displayName: `${l.name} (Lead)` }))
    ];
  }, [customers, leads]);

  const projName = (pid) => projects.find(p => p.id === pid)?.name || '-';

  const filtered = tasks.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'high') return t.priority === 'High';
    return t.status === filter;
  }).filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    const pName = projName(t.projectId).toLowerCase();
    return [t.title, t.assignTo, t.notes, pName].some(v => (v || '').toLowerCase().includes(q));
  });

  const save = async () => {
    if (!form.title.trim()) { toast('Title required', 'error'); return; }
    const payload = { ...form, userId: ownerId, actorId: user.id };
    if (editData) { await db.transact(db.tx.tasks[editData.id].update(payload)); toast('Updated', 'success'); }
    else { await db.transact(db.tx.tasks[id()].update(payload)); toast('Task created', 'success'); }
    setModal(false);
  };

  const del = async (tid) => { await db.transact(db.tx.tasks[tid].delete()); toast('Deleted', 'error'); };

  const createCustomer = async () => {
    if (!newCustForm.name.trim()) return toast('Name required', 'error');
    if (!newCustForm.email.trim()) return toast('Email is mandatory for clients', 'error');
    const newId = id();
    await db.transact(db.tx.customers[newId].update({ ...newCustForm, name: newCustForm.name.trim(), userId: ownerId, actorId: user.id, createdAt: Date.now() }));
    setForm(p => ({ ...p, client: newCustForm.name.trim() }));
    setCustModal(false);
    setNewCustForm({ name: '', email: '', phone: '', address: '', state: '', country: 'India', pincode: '', gstin: '', custom: {} });
    toast('Customer created!', 'success');
  };

  return (
    <div>
      <div className="sh"><div><h2>All Tasks</h2></div>{canCreate && <button className="btn btn-primary btn-sm" onClick={() => { setEditData(null); setForm({ title: '', assignTo: '', dueDate: '', priority: 'Medium', status: taskStatuses[0], notes: '', projectId: '', client: '' }); setModal(true); }}>+ Create Task</button>}</div>
      <div className="tabs">
        <div className={`tab${filter === 'high' ? ' active' : ''}`} onClick={() => setFilter('high')}>🔴 High Priority</div>
        {taskStatuses.map(s => (
          <div key={s} className={`tab${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>{s}</div>
        ))}
        <div className={`tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</div>
      </div>
      <div className="tw">
        <div className="tw-head">
          <h3>Tasks ({filtered.length})</h3>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="tw-scroll">
          <table>
            <thead><tr><th>#</th><th>Title</th><th>Client</th><th>Project</th><th>Assigned To</th><th>Due Date</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No tasks</td></tr>
                : filtered.map((t, i) => (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                    <td><strong>{t.title}</strong></td>
                    <td style={{ fontSize: 12 }}>{t.client || '-'}</td>
                    <td style={{ fontSize: 12 }}>{projName(t.projectId)}</td>
                    <td style={{ fontSize: 12 }}>{t.assignTo || '-'}</td>
                    <td style={{ fontSize: 12 }}>{fmtD(t.dueDate)}</td>
                    <td><span className={`badge ${prioBadgeClass(t.priority)}`}>{t.priority}</span></td>
                    <td><span className={`badge ${stageBadgeClass(t.status)}`}>{t.status}</span></td>
                    <td>
                      {canEdit && <button className="btn btn-secondary btn-sm" onClick={() => { setEditData(t); setForm({ title: t.title, assignTo: t.assignTo || '', dueDate: t.dueDate || '', priority: t.priority, status: t.status, notes: t.notes || '', projectId: t.projectId || '', client: t.client || '' }); setModal(true); }}>Edit</button>}{' '}
                      {canDelete && <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => del(t.id)}>Del</button>}
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
            <div className="mo-head"><h3>{editData ? 'Edit' : 'Create'} Task</h3><button className="btn-icon" onClick={() => setModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg span2"><label>Task Title *</label><input value={form.title} onChange={f('title')} /></div>
                <div className="fg">
                  <label>Client</label>
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
                <div className="fg"><label>Project</label><select value={form.projectId} onChange={f('projectId')}><option value="">No Project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div className="fg"><label>Assign To</label><select value={form.assignTo} onChange={f('assignTo')}><option value="">Unassigned</option>{team.map(t => <option key={t.id}>{t.name}</option>)}</select></div>
                <div className="fg"><label>Due Date</label><input type="date" value={form.dueDate} onChange={f('dueDate')} /></div>
                <div className="fg"><label>Priority</label><select value={form.priority} onChange={f('priority')}>{['High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="fg"><label>Status</label><select value={form.status} onChange={f('status')}>{taskStatuses.map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="fg span2"><label>Notes</label><textarea value={form.notes} onChange={f('notes')} /></div>
              </div>
            </div>
            <div className="mo-foot"><button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Save</button></div>
          </div>
        </div>
      )}
      {/* Quick Add Customer Modal */}
      {custModal && (
        <div className="mo open">
          <div className="mo-box">
            <div className="mo-head"><h3>Quick Add Customer</h3><button className="btn-icon" onClick={() => setCustModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg span2"><label>Full Name *</label><input value={newCustForm.name} onChange={ncf('name')} placeholder="e.g. John Doe" /></div>
                <div className="fg"><label>Email *</label><input value={newCustForm.email} onChange={ncf('email')} placeholder="john@example.com" /></div>
                <div className="fg"><label>Phone</label><input value={newCustForm.phone} onChange={ncf('phone')} placeholder="+91..." /></div>
                <div className="fg span2"><label>Address</label><textarea value={newCustForm.address} onChange={ncf('address')} placeholder="Full address..." /></div>
                <div className="fg"><label>Country</label>
                  <select value={newCustForm.country} onChange={ncf('country')}>
                    {['India', 'USA', 'UK', 'UAE', 'Australia', 'Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="fg"><label>State</label><input value={newCustForm.state} onChange={ncf('state')} placeholder="e.g. Tamil Nadu" /></div>
                <div className="fg"><label>Pincode</label><input value={newCustForm.pincode} onChange={ncf('pincode')} placeholder="600XXX" /></div>
                <div className="fg"><label>GSTIN</label><input value={newCustForm.gstin} onChange={ncf('gstin')} placeholder="22AAAAA0000A1Z5" /></div>
                
                {customFields.map(cf => (
                  <div key={cf.name} className="fg">
                    <label>{cf.name} {cf.required ? '*' : ''}</label>
                    <input 
                      type={cf.type === 'Number' ? 'number' : 'text'} 
                      value={newCustForm.custom?.[cf.name] || ''} 
                      onChange={nccf(cf.name)} 
                      placeholder={cf.name} 
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setCustModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={createCustomer}>Create Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
