import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { stageBadgeClass, prioBadgeClass, fmtD } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const PROJ_EMPTY = { name: '', client: '', status: 'Planning', startDate: '', endDate: '', desc: '' };
const DEFAULT_TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];

export default function Projects({ user }) {
  const [projModal, setProjModal] = useState(false);
  const [editProj, setEditProj] = useState(null);
  const [projForm, setProjForm] = useState(PROJ_EMPTY);
  const [selectedProj, setSelectedProj] = useState(null);
  const [taskModal, setTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [search, setSearch] = useState('');
  
  const toast = useToast();

  const { data } = db.useQuery({
    projects: { $: { where: { userId: user.id } } },
    tasks: { $: { where: { userId: user.id } } },
    teamMembers: { $: { where: { userId: user.id } } },
    userProfiles: { $: { where: { userId: user.id } } },
  });
  const projects = data?.projects || [];
  const tasks = data?.tasks || [];
  const team = data?.teamMembers || [];
  const taskStatuses = data?.userProfiles?.[0]?.taskStatuses || DEFAULT_TASK_STATUSES;
  
  const filteredProjects = projects.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [p.name, p.client, p.desc, p.status].some(v => (v || '').toLowerCase().includes(q));
  });

  const [taskForm, setTaskForm] = useState({ title: '', assignTo: '', dueDate: '', priority: 'Medium', status: taskStatuses[0], notes: '' });

  const pf = (k) => (e) => setProjForm(p => ({ ...p, [k]: e.target.value }));
  const tf = (k) => (e) => setTaskForm(p => ({ ...p, [k]: e.target.value }));

  const saveProj = async () => {
    if (!projForm.name.trim()) { toast('Project name required', 'error'); return; }
    const payload = { ...projForm, userId: user.id };
    if (editProj) { await db.transact(db.tx.projects[editProj.id].update(payload)); toast('Project updated', 'success'); }
    else { await db.transact(db.tx.projects[id()].update(payload)); toast('Project created', 'success'); }
    setProjModal(false);
  };

  const delProj = async (pid) => {
    if (!confirm('Delete project and all its tasks?')) return;
    const projTasks = tasks.filter(t => t.projectId === pid);
    await Promise.all([
      db.transact(db.tx.projects[pid].delete()),
      ...projTasks.map(t => db.transact(db.tx.tasks[t.id].delete())),
    ]);
    if (selectedProj?.id === pid) setSelectedProj(null);
    toast('Project deleted', 'error');
  };

  const saveTask = async () => {
    if (!taskForm.title.trim()) { toast('Task title required', 'error'); return; }
    const payload = { ...taskForm, projectId: selectedProj.id, userId: user.id };
    if (editTask) { await db.transact(db.tx.tasks[editTask.id].update(payload)); toast('Task updated', 'success'); }
    else { await db.transact(db.tx.tasks[id()].update(payload)); toast('Task created', 'success'); }
    setTaskModal(false);
  };

  const delTask = async (tid) => { await db.transact(db.tx.tasks[tid].delete()); toast('Task deleted', 'error'); };
  const cycleStatus = async (t) => {
    const curIdx = taskStatuses.indexOf(t.status);
    const nextIdx = (curIdx + 1) % taskStatuses.length;
    await db.transact(db.tx.tasks[t.id].update({ status: taskStatuses[nextIdx] }));
  };

  const projTasks = selectedProj ? tasks.filter(t => t.projectId === selectedProj.id) : [];

  return (
    <div>
      <div className="sh">
        <div><h2>Projects & Tasks</h2></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedProj && <button className="btn btn-secondary btn-sm" onClick={() => setSelectedProj(null)}>← Projects</button>}
          <button className="btn btn-primary btn-sm" onClick={() => {
            if (selectedProj) { setEditTask(null); setTaskForm({ title: '', assignTo: '', dueDate: '', priority: 'Medium', status: taskStatuses[0], notes: '' }); setTaskModal(true); }
            else { setEditProj(null); setProjForm(PROJ_EMPTY); setProjModal(true); }
          }}>
            + {selectedProj ? 'Create Task' : 'Create Project'}
          </button>
        </div>
      </div>

      {!selectedProj ? (
        /* PROJECT LIST VIEW */
        <div className="tw">
          <div className="tw-head">
            <h3>Projects ({filteredProjects.length})</h3>
            <div className="sw">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input className="si" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <table>
            <thead><tr><th>#</th><th>Project Name</th><th>Client</th><th>Start Date</th><th>End Date</th><th style={{width:120}}>Progress</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredProjects.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No projects found</td></tr>
                : filteredProjects.map((p, i) => {
                  const ptasks = tasks.filter(t => t.projectId === p.id);
                  const done = ptasks.filter(t => t.status === taskStatuses[taskStatuses.length - 1]).length;
                  const pct = ptasks.length ? Math.round((done / ptasks.length) * 100) : 0;
                  return (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                      <td><strong>{p.name}</strong><br/><span style={{fontSize: 10, color: 'var(--muted)'}}>{p.desc?.substring(0,30)}{p.desc?.length > 30 ? '...' : ''}</span></td>
                      <td>{p.client || '-'}</td>
                      <td>{fmtD(p.startDate)}</td>
                      <td>{fmtD(p.endDate)}</td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>
                          <span>{done}/{ptasks.length}</span><span>{pct}%</span>
                        </div>
                        <div className="pbar" style={{height: 4}}><div className="pfill" style={{ width: `${pct}%` }} /></div>
                      </td>
                      <td><span className={`badge ${stageBadgeClass(p.status)}`}>{p.status}</span></td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => setSelectedProj(p)}>Tasks</button>{' '}
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditProj(p); setProjForm({ name: p.name, client: p.client || '', status: p.status, startDate: p.startDate || '', endDate: p.endDate || '', desc: p.desc || '' }); setProjModal(true); }}>Edit</button>{' '}
                        <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => delProj(p.id)}>Del</button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      ) : (
        /* TASKS KANBAN */
        <div>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <strong style={{ fontSize: 15 }}>{selectedProj.name}</strong>
            <span className={`badge ${stageBadgeClass(selectedProj.status)}`}>{selectedProj.status}</span>
          </div>
          <div className="kanban">
            {taskStatuses.map(stage => {
              const stageTasks = projTasks.filter(t => t.status === stage);
              return (
                <div key={stage} className="kb-col">
                  <div className="kb-col-head">{stage} <span>{stageTasks.length}</span></div>
                  {stageTasks.map(t => (
                    <div key={t.id} className="kb-card">
                      <div className="nm">{t.title}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span className={`badge ${prioBadgeClass(t.priority)}`} style={{ fontSize: 10 }}>{t.priority}</span>
                        {t.dueDate && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtD(t.dueDate)}</span>}
                      </div>
                      {t.assignTo && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>→ {t.assignTo}</div>}
                      <div style={{ display: 'flex', gap: 4, marginTop: 7 }}>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => cycleStatus(t)}>▶ {taskStatuses.indexOf(t.status) === taskStatuses.length - 1 ? 'Reset' : 'Next'}</button>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => { setEditTask(t); setTaskForm({ title: t.title, assignTo: t.assignTo || '', dueDate: t.dueDate || '', priority: t.priority, status: t.status, notes: t.notes || '' }); setTaskModal(true); }}>Edit</button>
                        <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', fontSize: 11, padding: '3px 7px' }} onClick={() => delTask(t.id)}>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Project Modal */}
      {projModal && (
        <div className="mo open" onClick={e => e.target === e.currentTarget && setProjModal(false)}>
          <div className="mo-box">
            <div className="mo-head"><h3>{editProj ? 'Edit' : 'Create'} Project</h3><button className="btn-icon" onClick={() => setProjModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg span2"><label>Project Name *</label><input value={projForm.name} onChange={pf('name')} /></div>
                <div className="fg"><label>Client</label><input value={projForm.client} onChange={pf('client')} /></div>
                <div className="fg"><label>Status</label><select value={projForm.status} onChange={pf('status')}>{['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="fg"><label>Start Date</label><input type="date" value={projForm.startDate} onChange={pf('startDate')} /></div>
                <div className="fg"><label>End Date</label><input type="date" value={projForm.endDate} onChange={pf('endDate')} /></div>
                <div className="fg span2"><label>Description</label><textarea value={projForm.desc} onChange={pf('desc')} /></div>
              </div>
            </div>
            <div className="mo-foot"><button className="btn btn-secondary btn-sm" onClick={() => setProjModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={saveProj}>Save</button></div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {taskModal && (
        <div className="mo open" onClick={e => e.target === e.currentTarget && setTaskModal(false)}>
          <div className="mo-box">
            <div className="mo-head"><h3>{editTask ? 'Edit' : 'Create'} Task</h3><button className="btn-icon" onClick={() => setTaskModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg span2"><label>Task Title *</label><input value={taskForm.title} onChange={tf('title')} /></div>
                <div className="fg"><label>Assign To</label><select value={taskForm.assignTo} onChange={tf('assignTo')}><option value="">Unassigned</option>{team.map(t => <option key={t.id}>{t.name}</option>)}</select></div>
                <div className="fg"><label>Due Date</label><input type="date" value={taskForm.dueDate} onChange={tf('dueDate')} /></div>
                <div className="fg"><label>Priority</label><select value={taskForm.priority} onChange={tf('priority')}>{['High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="fg"><label>Status</label><select value={taskForm.status} onChange={tf('status')}>{taskStatuses.map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="fg span2"><label>Notes</label><textarea value={taskForm.notes} onChange={tf('notes')} /></div>
              </div>
            </div>
            <div className="mo-foot"><button className="btn btn-secondary btn-sm" onClick={() => setTaskModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={saveTask}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
