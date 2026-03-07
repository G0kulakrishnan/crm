import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD, stageBadgeClass, uid } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const STAGES = ['New Enquiry', 'Enquiry Contacted', 'Budget Negotiation', 'Advance Paid', 'Won', 'Lost'];
const SOURCES = ['FB Ads', 'Direct', 'Broker', 'Google Ads', 'Referral', 'WhatsApp', 'Website', 'Other'];

const EMPTY_LEAD = { name: '', email: '', phone: '', source: 'FB Ads', stage: 'New Enquiry', assign: '', followup: '', label: 'Hot', notes: '', remWA: false, remEmail: true, remSMS: false, custom: {} };

export default function LeadsView({ user }) {
  const [view, setView] = useState('list'); // 'list' | 'kanban'
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [srcFilter, setSrcFilter] = useState('');
  const [stgFilter, setStgFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY_LEAD);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [colModal, setColModal] = useState(false);
  const [tempCols, setTempCols] = useState([]);
  const [viewLead, setViewLead] = useState(null);
  const [noteText, setNoteText] = useState('');
  const toast = useToast();

  const { data } = db.useQuery({
    leads: { $: { where: { userId: user.id } } },
    teamMembers: { $: { where: { userId: user.id } } },
    userProfiles: { $: { where: { userId: user.id } } },
    activityLogs: { $: { where: { userId: user.id } } },
  });
  const leads = data?.leads || [];
  const team = data?.teamMembers || [];
  const activityLogs = data?.activityLogs || [];
  const customFields = data?.userProfiles?.[0]?.customFields || [];
  const profileId = data?.userProfiles?.[0]?.id;
  const savedCols = data?.userProfiles?.[0]?.leadCols;
  const allPossibleCols = ['Phone', 'Source', 'Stage', 'Assigned', 'Follow Up', 'Label', 'Reminder', ...customFields.map(c => c.name)];
  const activeCols = savedCols || allPossibleCols;

  // Filtering
  const filtered = useMemo(() => {
    const now = new Date();
    return leads.filter(l => {
      if (tab === 'today') { const d = new Date(l.followup); return d.toDateString() === now.toDateString(); }
      if (tab === 'tomorrow') { const t = new Date(now); t.setDate(t.getDate() + 1); const d = new Date(l.followup); return d.toDateString() === t.toDateString(); }
      if (tab === 'next7days') {
        if (!l.followup) return false;
        const d = new Date(l.followup);
        const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 7;
      }
      if (tab === 'overdue') return l.followup && new Date(l.followup) < now;
      return true;
    }).filter(l => !srcFilter || l.source === srcFilter)
      .filter(l => !stgFilter || l.stage === stgFilter)
      .filter(l => {
        if (!search) return true;
        const q = search.toLowerCase();
        return [l.name, l.email, l.phone, l.source, l.stage, l.assign, l.label, l.notes].some(v => (v || '').toLowerCase().includes(q));
      });
  }, [leads, tab, srcFilter, stgFilter, search]);

  const overdueCount = leads.filter(l => l.followup && new Date(l.followup) < new Date()).length;
  const next7Count = leads.filter(l => {
    if (!l.followup) return false;
    const diff = Math.ceil((new Date(l.followup) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= 7;
  }).length;

  const openCreate = () => { setEditData(null); setForm(EMPTY_LEAD); setModal(true); };
  const openEdit = (l) => { 
    setEditData(l); 
    setForm({ name: l.name, email: l.email || '', phone: l.phone || '', source: l.source || 'FB Ads', stage: l.stage || 'New Enquiry', assign: l.assign || '', followup: l.followup || '', label: l.label || 'Hot', notes: l.notes || '', remWA: l.remWA || false, remEmail: l.remEmail !== false, remSMS: l.remSMS || false, custom: l.custom || {} }); 
    setModal(true); 
  };

  const logActivity = async (leadId, text) => {
    await db.transact(db.tx.activityLogs[id()].update({
      entityId: leadId,
      entityType: 'lead',
      text,
      userId: user.id,
      userName: user.email,
      createdAt: Date.now()
    }));
  };

  const saveLead = async () => {
    if (!form.name.trim()) { toast('Name is required', 'error'); return; }
    try {
      if (editData) {
        const changes = [];
        const fields = { name: 'Name', phone: 'Phone', email: 'Email', source: 'Source', stage: 'Stage', assign: 'Assignee', followup: 'Follow Up', label: 'Label', notes: 'Notes' };
        Object.entries(fields).forEach(([k, label]) => {
          if (editData[k] !== form[k]) {
            const oldVal = editData[k] || 'None';
            const newVal = form[k] || 'None';
            changes.push(`${label} changed from "${oldVal}" to "${newVal}"`);
          }
        });

        // Custom fields check
        const oldCustom = editData.custom || {};
        const newCustom = form.custom || {};
        customFields.forEach(cf => {
          if (oldCustom[cf.name] !== newCustom[cf.name]) {
            changes.push(`${cf.name} (Custom) changed from "${oldCustom[cf.name] || 'None'}" to "${newCustom[cf.name] || 'None'}"`);
          }
        });
        
        await db.transact(db.tx.leads[editData.id].update({ ...form, userId: user.id, updatedAt: Date.now() }));
        
        if (changes.length > 0) {
          await logActivity(editData.id, changes.join(' | '));
        }
        
        toast('Lead updated!', 'success');
      } else {
        const newId = id();
        await db.transact(db.tx.leads[newId].update({ ...form, userId: user.id, createdAt: Date.now() }));
        await logActivity(newId, 'Lead created');
        toast(`Lead "${form.name}" created!`, 'success');
      }
      setModal(false);
    } catch (e) { toast('Error saving lead', 'error'); }
  };

  const deleteLead = async (leadId) => {
    if (!confirm('Delete this lead?')) return;
    await db.transact(db.tx.leads[leadId].delete());
    toast('Lead deleted', 'error');
  };

  const bulkDelete = async () => {
    if (!selectedIds.size || !confirm(`Delete ${selectedIds.size} leads?`)) return;
    await Promise.all([...selectedIds].map(lid => db.transact(db.tx.leads[lid].delete())));
    setSelectedIds(new Set());
    toast(`${selectedIds.size} leads deleted`, 'error');
  };

  const bulkAssign = async (memberName) => {
    if (!selectedIds.size || !memberName) return;
    await Promise.all([...selectedIds].map(async lid => {
      await db.transact(db.tx.leads[lid].update({ assign: memberName }));
      await logActivity(lid, `Bulk assigned to ${memberName}`);
    }));
    setSelectedIds(new Set());
    toast(`Assigned ${selectedIds.size} leads to ${memberName}`, 'success');
  };

  const bulkStage = async (newStage) => {
    if (!selectedIds.size || !newStage) return;
    await Promise.all([...selectedIds].map(async lid => {
      await db.transact(db.tx.leads[lid].update({ stage: newStage }));
      await logActivity(lid, `Bulk status changed to ${newStage}`);
    }));
    setSelectedIds(new Set());
    toast(`Moved ${selectedIds.size} leads to ${newStage}`, 'success');
  };

  const convertToCustomer = async (l) => {
    if (!confirm(`Convert ${l.name} to a Customer?`)) return;
    try {
      const payload = {
        name: l.name,
        email: l.email || '',
        phone: l.phone || '',
        userId: user.id,
        createdAt: Date.now()
      };
      await db.transact([
        db.tx.customers[id()].update(payload),
        db.tx.leads[l.id].update({ stage: 'Won' })
      ]);
      toast(`${l.name} is now a Customer!`, 'success');
    } catch {
      toast('Error converting to customer', 'error');
    }
  };

  const saveCols = async (colsToSave) => {
    if (profileId) {
      await db.transact(db.tx.userProfiles[profileId].update({ leadCols: colsToSave }));
    } else {
      await db.transact(db.tx.userProfiles[id()].update({ leadCols: colsToSave, userId: user.id }));
    }
    setColModal(false);
    toast('Columns updated', 'success');
  };

  const resetCols = () => {
    saveCols(allPossibleCols);
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const cf = (k) => (e) => setForm(p => ({ ...p, custom: { ...(p.custom || {}), [k]: e.target.value } }));

  if (viewLead) {
    const l = viewLead;
    const lLogs = activityLogs.filter(log => log.entityId === l.id).sort((a,b) => b.createdAt - a.createdAt);

    const addNote = async () => {
      if (!noteText.trim()) return;
      await logActivity(l.id, noteText.trim());
      setNoteText('');
      toast('Note added', 'success');
    };

    return (
      <div>
        <div className="sh" style={{ marginBottom: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-icon" onClick={() => setViewLead(null)}>← Back</button>
            <div>
              <h2 style={{ fontSize: 24, margin: 0 }}>{l.name}</h2>
              <div className="sub" style={{ fontSize: 13, marginTop: 4 }}>
                {l.email && <span style={{ marginRight: 15 }}>✉ {l.email}</span>}
                {l.phone && <span>☏ {l.phone}</span>}
                <span className={`badge ${stageBadgeClass(l.stage)}`} style={{ marginLeft: 15 }}>{l.stage}</span>
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(l)}>Edit Lead</button>
        </div>

        <div className="stat-grid" style={{ marginBottom: 25 }}>
          <div className="stat-card sc-blue"><div className="lbl">Source</div><div className="val" style={{ fontSize: 16 }}>{l.source}</div></div>
          <div className="stat-card sc-green"><div className="lbl">Assigned To</div><div className="val" style={{ fontSize: 16 }}>{l.assign || 'Unassigned'}</div></div>
          <div className="stat-card sc-yellow"><div className="lbl">Label</div><div className="val" style={{ fontSize: 16 }}>{l.label}</div></div>
          <div className="stat-card sc-purple"><div className="lbl">Follow Up</div><div className="val" style={{ fontSize: 14 }}>{l.followup ? fmtD(l.followup) : 'None'}</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="tw" style={{ padding: 20 }}>
            <h3>Lead Details</h3>
            <div style={{ marginTop: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {customFields.map(cf => (
                <div key={cf.name} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{cf.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{l.custom?.[cf.name] || '-'}</span>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Internal Notes</span>
                <div style={{ fontSize: 13, background: 'var(--bg)', padding: 12, borderRadius: 8, minHeight: 60 }}>{l.notes || 'No notes provided during creation.'}</div>
              </div>
            </div>
          </div>

          <div className="tw" style={{ padding: 20 }}>
            <h3>Activity Logs & Timeline</h3>
            <div style={{ marginTop: 15 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Type a note or record an activity..." style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
                <button className="btn btn-primary btn-sm" onClick={addNote}>Post</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
                {lLogs.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 20 }}>No activity recorded yet in timeline.</div> : 
                  lLogs.map(log => (
                    <div key={log.id} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{log.userName}</span>
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#444' }}>
                          {log.text?.split('\n').map((line, i) => (
                            <div key={i} style={{ marginBottom: line ? 2 : 0 }}>
                              {line.split('**').map((part, j) => 
                                j % 2 === 1 ? <mark key={j} style={{ background: '#fef08a', color: '#854d0e', padding: '0 4px', borderRadius: 4, fontWeight: 600 }}>{part}</mark> : part
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>

        {modal && (
          <div className="mo open" onClick={e => e.target === e.currentTarget && setModal(false)}>
            <div className="mo-box">
              <div className="mo-head">
                <h3>Edit Lead</h3>
                <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
              </div>
              <div className="mo-body">
                <div className="fgrid">
                  <div className="fg"><label>Name *</label><input value={form.name} onChange={f('name')} placeholder="Full name" /></div>
                  <div className="fg"><label>Phone</label><input value={form.phone} onChange={f('phone')} placeholder="+91..." /></div>
                  <div className="fg"><label>Email</label><input type="email" value={form.email} onChange={f('email')} /></div>
                  <div className="fg"><label>Source</label>
                    <select value={form.source} onChange={f('source')}>
                      {SOURCES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label>Stage</label>
                    <select value={form.stage} onChange={f('stage')}>
                      {STAGES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label>Assign To</label>
                    <select value={form.assign} onChange={f('assign')}>
                      <option value="">Unassigned</option>
                      {team.map(t => <option key={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label>Follow Up</label><input type="datetime-local" value={form.followup} onChange={f('followup')} /></div>
                  <div className="fg"><label>Label</label>
                    <select value={form.label} onChange={f('label')}>
                      {['Hot', 'Warm', 'Cold', 'VIP', 'Pending'].map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="fg span2"><label>Notes</label><textarea value={form.notes} onChange={f('notes')} /></div>
                </div>
              </div>
              <div className="mo-foot">
                <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveLead}>Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sh">
        <div><h2>Leads</h2><div className="sub">Manage and track all leads</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('list')}>☰ List</button>
          <button className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('kanban')}>⊞ Kanban</button>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Create Lead</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['all', `All ${leads.length}`], ['today', 'Today'], ['tomorrow', 'Tomorrow'], ['next7days', `Next 7 Days (${next7Count})`], ['overdue', `Overdue${overdueCount ? ` (${overdueCount})` : ''}`]].map(([t, label]) => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{label}</div>
        ))}
      </div>

      {view === 'list' ? (
        <div>
          {/* Bulk Bar */}
          {selectedIds.size > 0 && (
            <div className="bulk-bar" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{selectedIds.size} selected</span>
              <select style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} onChange={e => { bulkAssign(e.target.value); e.target.value = ''; }}>
                <option value="">Assign To...</option>
                {team.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              <select style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} onChange={e => { bulkStage(e.target.value); e.target.value = ''; }}>
                <option value="">Change Stage...</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={bulkDelete}>🗑 Delete Selected</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(new Set())}>✕ Clear</button>
            </div>
          )}

          {/* Table */}
          <div className="tw">
            <div className="tw-head">
              <h3>All Leads ({filtered.length})</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div className="sw">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="si" style={{ width: 130 }} value={srcFilter} onChange={e => setSrcFilter(e.target.value)}>
                  <option value="">All Sources</option>
                  {SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="si" style={{ width: 130 }} value={stgFilter} onChange={e => setStgFilter(e.target.value)}>
                  <option value="">All Stages</option>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
                <button className="btn btn-secondary btn-sm" onClick={() => { setTempCols(activeCols); setColModal(true); }}>⚙ Columns</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', paddingBottom: 60 /* space for dropdowns */ }}>
              <table style={{ minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}><input type="checkbox" onChange={e => { if (e.target.checked) setSelectedIds(new Set(filtered.map(l => l.id))); else setSelectedIds(new Set()); }} /></th>
                    <th>#</th>
                    <th>Name</th>
                    {activeCols.includes('Phone') && <th>Phone</th>}
                    {activeCols.includes('Source') && <th>Source</th>}
                    {activeCols.includes('Stage') && <th>Stage</th>}
                    {activeCols.includes('Assigned') && <th>Assigned</th>}
                    {activeCols.includes('Follow Up') && <th>Follow Up</th>}
                    {activeCols.includes('Label') && <th>Label</th>}
                    {activeCols.includes('Reminder') && <th>Reminder</th>}
                    {customFields.filter(cf => activeCols.includes(cf.name)).map(cf => <th key={cf.name}>{cf.name}</th>)}
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No leads found</td></tr>
                ) : filtered.map((l, i) => (
                  <tr key={l.id}>
                    <td><input type="checkbox" checked={selectedIds.has(l.id)} onChange={e => { const s = new Set(selectedIds); e.target.checked ? s.add(l.id) : s.delete(l.id); setSelectedIds(s); }} style={{ width: 14, height: 14, accentColor: 'var(--accent)' }} /></td>
                    <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                    <td><strong>{l.name}</strong><div style={{ fontSize: 10, color: 'var(--muted)' }}>{l.email}</div></td>
                    {activeCols.includes('Phone') && <td style={{ fontSize: 12 }}>{l.phone || '-'}</td>}
                    {activeCols.includes('Source') && <td><span style={{ fontSize: 11 }}>{l.source}</span></td>}
                    {activeCols.includes('Stage') && <td><span className={`badge ${stageBadgeClass(l.stage)}`}>{l.stage}</span></td>}
                    {activeCols.includes('Assigned') && <td style={{ fontSize: 12 }}>{l.assign || <span style={{ color: 'var(--muted)' }}>-</span>}</td>}
                    {activeCols.includes('Follow Up') && <td style={{ fontSize: 11 }}>{l.followup ? fmtD(l.followup) : '-'}</td>}
                    {activeCols.includes('Label') && <td><span className="badge bg-gray" style={{ fontSize: 10 }}>{l.label || '-'}</span></td>}
                    {activeCols.includes('Reminder') && <td>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {l.remWA && <span style={{ fontSize: 10, background: '#e8fdf0', color: '#25d366', borderRadius: 20, padding: '2px 6px', fontWeight: 700 }}>WA</span>}
                        {l.remEmail !== false && <span style={{ fontSize: 10, background: '#eff6ff', color: '#2563eb', borderRadius: 20, padding: '2px 6px', fontWeight: 700 }}>Mail</span>}
                        {l.remSMS && <span style={{ fontSize: 10, background: '#f5f3ff', color: '#7c3aed', borderRadius: 20, padding: '2px 6px', fontWeight: 700 }}>SMS</span>}
                      </div>
                    </td>}
                    {customFields.filter(cf => activeCols.includes(cf.name)).map(cf => (
                      <td key={cf.name} style={{ fontSize: 11 }}>{l.custom?.[cf.name] || '-'}</td>
                    ))}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setViewLead(l)}>View</button>
                        <button className="btn-icon" onClick={(e) => {
                          const dm = e.currentTarget.nextElementSibling;
                          document.querySelectorAll('.dd-menu').forEach(el => el !== dm && (el.style.display = 'none'));
                          dm.style.display = dm.style.display === 'block' ? 'none' : 'block';
                        }}>⋮</button>
                        <div className="dd-menu" style={{ display: 'none', position: 'absolute', right: 0, top: 28, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, width: 160, overflow: 'hidden', textAlign: 'left' }}>
                          <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { openEdit(l); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>✎ Edit</div>
                          <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { convertToCustomer(l); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>👤 Convert to Customer</div>
                          <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#dc2626' }} onClick={() => { deleteLead(l.id); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>🗑 Delete</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      ) : (
        /* KANBAN */
        <div className="kanban">
          {STAGES.map(stage => {
            const cards = leads.filter(l => l.stage === stage);
            return (
              <div key={stage} className="kb-col">
                <div className="kb-col-head">{stage} <span>{cards.length}</span></div>
                {cards.map(l => (
                  <div key={l.id} className="kb-card" onClick={() => openEdit(l)}>
                    <div className="nm">{l.name}</div>
                    <div className="mt">{l.source} · {l.phone || '-'}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div className="mo open" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mo-box">
            <div className="mo-head">
              <h3>{editData ? 'Edit Lead' : 'Create Lead'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg"><label>Name *</label><input value={form.name} onChange={f('name')} placeholder="Full name" /></div>
                <div className="fg"><label>Phone</label><input value={form.phone} onChange={f('phone')} placeholder="+91..." /></div>
                <div className="fg"><label>Email</label><input type="email" value={form.email} onChange={f('email')} /></div>
                <div className="fg"><label>Source</label>
                  <select value={form.source} onChange={f('source')}>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Stage</label>
                  <select value={form.stage} onChange={f('stage')}>
                    {STAGES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Assign To</label>
                  <select value={form.assign} onChange={f('assign')}>
                    <option value="">Unassigned</option>
                    {team.map(t => <option key={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Follow Up</label><input type="datetime-local" value={form.followup} onChange={f('followup')} /></div>
                <div className="fg"><label>Label</label>
                  <select value={form.label} onChange={f('label')}>
                    {['Hot', 'Warm', 'Cold', 'VIP', 'Pending'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="fg span2"><label>Notes</label><textarea value={form.notes} onChange={f('notes')} /></div>
                
                {/* Dynamic Custom Fields */}
                {customFields.length > 0 && <div className="fg span2" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}><h4 style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Custom Fields</h4><div className="fgrid">
                  {customFields.map(field => (
                    <div key={field.name} className="fg">
                      <label>{field.name}</label>
                      {field.type === 'dropdown' ? (
                        <select value={form.custom[field.name] || ''} onChange={cf(field.name)}>
                          <option value="">Select...</option>
                          {field.options.split(',').map(o => <option key={o.trim()}>{o.trim()}</option>)}
                        </select>
                      ) : (
                        <input type={field.type === 'number' ? 'number' : 'text'} value={form.custom[field.name] || ''} onChange={cf(field.name)} />
                      )}
                    </div>
                  ))}
                </div></div>}

                <div className="fg span2">
                  <label>Reminder Channels</label>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 6, padding: 12, background: 'var(--bg)', borderRadius: 8, flexWrap: 'wrap' }}>
                    {[['remWA', 'WhatsApp', '#25d366'], ['remEmail', 'Email', '#3b82f6'], ['remSMS', 'SMS', '#8b5cf6']].map(([k, label, color]) => (
                      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                        <input type="checkbox" checked={form[k]} onChange={f(k)} style={{ width: 15, height: 15, accentColor: color }} />
                        <span style={{ color }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveLead}>Save Lead</button>
            </div>
          </div>
        </div>
      )}

      {/* COLUMNS MODAL */}
      {colModal && (
        <div className="mo open" onClick={e => e.target === e.currentTarget && setColModal(false)}>
          <div className="mo-box" style={{ width: 400 }}>
            <div className="mo-head">
              <h3>Select Columns</h3>
              <button className="btn-icon" onClick={() => setColModal(false)}>✕</button>
            </div>
            <div className="mo-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto' }}>
              <strong style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Available Columns</strong>
              {allPossibleCols.map(c => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, padding: '4px 0' }}>
                  <input type="checkbox" checked={tempCols.includes(c)} onChange={e => {
                    if (e.target.checked) setTempCols([...tempCols, c]);
                    else setTempCols(tempCols.filter(x => x !== c));
                  }} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                  {c}
                </label>
              ))}
            </div>
            <div className="mo-foot" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-secondary btn-sm" onClick={resetCols}>Reset to Default</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setColModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={() => saveCols(tempCols)}>Save View</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
