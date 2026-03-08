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
    return rawTasks.filter(t => t.assignTo === user.email || t.assignTo === perms.name || t.actorId === user.id);
  }, [data?.tasks, perms, user]);

  const projects = data?.projects || [];
  const team = data?.teamMembers || [];
  const customers = data?.customers || [];
  const taskStatuses = data?.userProfiles?.[0]?.taskStatuses || DEFAULT_TASK_STATUSES;
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

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
                  <SearchableSelect 
                    options={customers} 
                    displayKey="name" 
                    returnKey="name"
                    value={form.client} 
                    onChange={val => setForm(p => ({ ...p, client: val }))} 
                    placeholder="Search client..." 
                  />
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
    </div>
  );
}
