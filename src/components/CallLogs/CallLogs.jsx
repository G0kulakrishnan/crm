import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD, fmtDT } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const CALL_DIRECTIONS = ['Outgoing', 'Incoming', 'Missed'];
const CALL_OUTCOMES = ['Connected', 'No Answer', 'Busy', 'Voicemail', 'Wrong Number', 'Callback Requested'];

const PHONE_ICON = 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z';

const directionIcon = (dir) => {
  if (dir === 'Incoming') return { path: 'M16 3l-4 4-4-4 M12 7V1 M5 10v10a2 2 0 002 2h10a2 2 0 002-2V10', color: '#16a34a' };
  if (dir === 'Missed') return { path: 'M1 1l22 22 M16 3l-4 4-4-4 M12 7V1', color: '#ef4444' };
  return { path: 'M8 3l4-1 4 1 M12 2v6 M5 10v10a2 2 0 002 2h10a2 2 0 002-2V10', color: '#2563eb' };
};

const EMPTY_FORM = { phone: '', contactName: '', direction: 'Outgoing', outcome: 'Connected', duration: '', notes: '', leadId: '' };

export default function CallLogs({ user, perms, ownerId, planEnforcement }) {
  const canCreate = perms?.can('CallLogs', 'create') === true;
  const canEdit = perms?.can('CallLogs', 'edit') === true;
  const canDelete = perms?.can('CallLogs', 'delete') === true;
  const toast = useToast();

  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading } = db.useQuery({
    callLogs: { $: { where: { userId: ownerId } } },
    leads: { $: { where: { userId: ownerId } } },
    teamMembers: { $: { where: { userId: ownerId } } },
  });

  const callLogs = useMemo(() => (data?.callLogs || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), [data?.callLogs]);
  const allLeads = data?.leads || [];
  const team = data?.teamMembers || [];

  // Auto-match phone to lead
  const matchLead = (phone) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    return allLeads.find(l => l.phone && l.phone.replace(/\D/g, '') === clean);
  };

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = callLogs.filter(l => l.createdAt && new Date(l.createdAt).toISOString().split('T')[0] === today);
  const stats = {
    total: todayLogs.length,
    outgoing: todayLogs.filter(l => l.direction === 'Outgoing').length,
    incoming: todayLogs.filter(l => l.direction === 'Incoming').length,
    missed: todayLogs.filter(l => l.direction === 'Missed').length,
  };

  // Filtered logs
  const filtered = useMemo(() => {
    let list = callLogs;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(l => (l.phone || '').toLowerCase().includes(s) || (l.contactName || '').toLowerCase().includes(s) || (l.notes || '').toLowerCase().includes(s));
    }
    if (dirFilter) list = list.filter(l => l.direction === dirFilter);
    if (staffFilter) list = list.filter(l => l.staffEmail === staffFilter);
    if (dateFilter) list = list.filter(l => l.createdAt && new Date(l.createdAt).toISOString().split('T')[0] === dateFilter);
    return list;
  }, [callLogs, search, dirFilter, staffFilter, dateFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openNew = () => { setForm(EMPTY_FORM); setEditData(null); setModal(true); };
  const openEdit = (log) => {
    setEditData(log);
    setForm({ phone: log.phone || '', contactName: log.contactName || '', direction: log.direction || 'Outgoing', outcome: log.outcome || 'Connected', duration: log.duration || '', notes: log.notes || '', leadId: log.leadId || '' });
    setModal(true);
  };

  const save = async () => {
    if (!form.phone) { toast('Phone number is required', 'error'); return; }
    const matched = matchLead(form.phone);
    const payload = {
      ...form,
      duration: form.duration ? Number(form.duration) : 0,
      contactName: form.contactName || matched?.name || '',
      leadId: form.leadId || matched?.id || '',
      leadName: matched?.name || form.contactName || '',
      staffEmail: user.email,
      staffName: team.find(t => t.email === user.email)?.name || user.email,
      userId: ownerId,
      updatedAt: Date.now(),
    };
    try {
      if (editData) {
        await db.transact(db.tx.callLogs[editData.id].update(payload));
        toast('Call log updated', 'success');
      } else {
        payload.createdAt = Date.now();
        payload.actorId = user.id;
        await db.transact(db.tx.callLogs[id()].update(payload));
        toast('Call logged', 'success');
      }
      setModal(false);
    } catch (e) { toast(e.message, 'error'); }
  };

  const remove = async (logId) => {
    if (!window.confirm('Delete this call log?')) return;
    try {
      await db.transact(db.tx.callLogs[logId].delete());
      toast('Call log deleted', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ width: 20, height: 20, margin: '0 auto' }} /><p style={{ color: 'var(--muted)', marginTop: 8 }}>Loading call logs...</p></div>;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Call Logs</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>Track all incoming and outgoing calls</p>
        </div>
        {canCreate && (
          <button onClick={openNew} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none"><path d={PHONE_ICON} /></svg>
            Log Call
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: "Today's Calls", value: stats.total, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Outgoing', value: stats.outgoing, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Incoming', value: stats.incoming, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Missed', value: stats.missed, color: '#ef4444', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search phone, name, notes..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, width: 220 }}
        />
        <select value={dirFilter} onChange={e => { setDirFilter(e.target.value); setPage(1); }} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
          <option value="">All Directions</option>
          {CALL_DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        {(perms?.isOwner || perms?.isAdmin || perms?.isManager) && (
          <select value={staffFilter} onChange={e => { setStaffFilter(e.target.value); setPage(1); }} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
            <option value="">All Staff</option>
            {team.map(t => <option key={t.id} value={t.email}>{t.name}</option>)}
          </select>
        )}
        {(search || dirFilter || dateFilter || staffFilter) && (
          <button onClick={() => { setSearch(''); setDirFilter(''); setDateFilter(''); setStaffFilter(''); setPage(1); }} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12, cursor: 'pointer' }}>Clear</button>
        )}
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Direction</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Phone</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Contact</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Lead</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Outcome</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Duration</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Staff</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Date & Time</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Notes</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                {filtered.length === 0 && callLogs.length === 0 ? 'No call logs yet. Click "Log Call" to add one.' : 'No matching records.'}
              </td></tr>
            )}
            {paged.map(log => {
              const di = directionIcon(log.direction);
              const lead = log.leadId ? allLeads.find(l => l.id === log.leadId) : null;
              return (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: di.color, fontWeight: 600, fontSize: 12 }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke={di.color} strokeWidth="2" fill="none"><path d={PHONE_ICON} /></svg>
                      {log.direction || 'Outgoing'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{log.phone}</td>
                  <td style={{ padding: '10px 12px' }}>{log.contactName || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {lead ? (
                      <span style={{ color: '#2563eb', fontSize: 12, fontWeight: 500 }}>{lead.name}</span>
                    ) : log.leadName ? (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{log.leadName}</span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 500 }}>Unmatched</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: log.outcome === 'Connected' ? '#f0fdf4' : log.outcome === 'Missed' || log.outcome === 'No Answer' ? '#fef2f2' : '#f8fafc', color: log.outcome === 'Connected' ? '#16a34a' : log.outcome === 'No Answer' || log.outcome === 'Missed' ? '#ef4444' : '#64748b', fontWeight: 500 }}>
                      {log.outcome || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>{log.duration ? `${log.duration}s` : '-'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>{log.staffName || '-'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDT(log.createdAt)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.notes}>{log.notes || '-'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {canEdit && (
                        <button onClick={() => openEdit(log)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: 4 }} title="Edit">
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => remove(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }} title="Delete">
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16, alignItems: 'center' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12, cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>Prev</button>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12, cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>Next</button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>{editData ? 'Edit Call Log' : 'Log a Call'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Phone Number *</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }} />
                {form.phone && matchLead(form.phone) && (
                  <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>Matched lead: {matchLead(form.phone).name}</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Contact Name</label>
                <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Contact name" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Direction</label>
                  <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                    {CALL_DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Outcome</label>
                  <select value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                    {CALL_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Duration (seconds)</label>
                <input type="number" min="0" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="0" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Call notes..." rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Link to Lead</label>
                <select value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                  <option value="">Auto-match or select...</option>
                  {allLeads.map(l => <option key={l.id} value={l.id}>{l.name} {l.phone ? `(${l.phone})` : ''}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} className="btn btn-primary" style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{editData ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
