import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { fmt, fmtD, fmtDT } from '../../utils/helpers';

const DATE_FILTERS = ['Today', 'Yesterday', 'This Month', 'This Year', 'Custom'];

export default function TeamReports({ user, ownerId, perms }) {
  const [filter, setFilter] = useState('This Month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = db.useQuery({
    activityLogs: { $: { where: { userId: ownerId } } },
    teamMembers: { $: { where: { userId: ownerId } } },
    tasks: { $: { where: { userId: ownerId } } },
    leads: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } }
  });

  const logs = data?.activityLogs || [];
  const team = data?.teamMembers || [];
  const allTasks = data?.tasks || [];
  const allLeads = data?.leads || [];
  const profile = data?.userProfiles?.[0] || {};
  const wonStage = profile.wonStage || 'Won';

  const leadMap = useMemo(() => {
    const map = {};
    allLeads.forEach(l => { map[l.id] = l.name; });
    return map;
  }, [allLeads]);

  const taskMap = useMemo(() => {
    const map = {};
    allTasks.forEach(t => { map[t.id] = t.title; });
    return map;
  }, [allTasks]);

  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    
    if (filter === 'Today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (filter === 'Yesterday') {
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (filter === 'This Month') {
      start.setHours(0, 0, 0, 0);
      start.setDate(1);
    } else if (filter === 'This Year') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    } else if (filter === 'Custom' && customRange.start && customRange.end) {
      return { start: new Date(customRange.start).getTime(), end: new Date(customRange.end).getTime() + 86400000 };
    }
    
    return { start: start.getTime(), end: end.getTime() };
  }, [filter, customRange]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => l.createdAt >= dateRange.start && l.createdAt <= dateRange.end);
  }, [logs, dateRange]);

  const performanceData = useMemo(() => {
    const members = [
      { id: ownerId, name: 'Business Owner', email: profile.email || '' },
      ...team.map(m => ({ id: m.id, name: m.name, email: m.email }))
    ];

    return members.map(m => {
      const userLogs = filteredLogs.filter(l => {
        const actorMatch = l.actorId === m.id;
        const emailMatch = m.email && l.userName && l.userName.toLowerCase() === m.email.toLowerCase();
        return actorMatch || emailMatch;
      });
      
      const tasksDone = userLogs.filter(l => l.entityType === 'task' && l.text.includes('to "Completed"')).length;
      const tasksWorked = new Set(userLogs.filter(l => l.entityType === 'task' && l.entityId).map(l => l.entityId)).size;
      const leadsWorked = new Set(userLogs.filter(l => l.entityType === 'lead' && l.entityId).map(l => l.entityId)).size;
      const leadsWon = userLogs.filter(l => l.entityType === 'lead' && (l.text.includes(`to "${wonStage}"`) || l.text.toLowerCase().includes('converted to customer'))).length;
      const totalActivities = userLogs.length;

      return {
        ...m,
        tasksDone,
        tasksWorked,
        leadsWorked,
        leadsWon,
        totalActivities,
        userLogs
      };
    }).sort((a, b) => b.totalActivities - a.totalActivities);
  }, [filteredLogs, team, ownerId, profile.email, wonStage]);

  const selectedMember = useMemo(() => performanceData.find(m => m.id === selectedId), [performanceData, selectedId]);

  const activeMemberLogs = useMemo(() => {
    if (!selectedMember) return [];
    let lgs = selectedMember.userLogs || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      lgs = lgs.filter(l => {
        const textMatch = (l.text || '').toLowerCase().includes(q);
        const nameMatch = (l.entityName || '').toLowerCase().includes(q);
        const refName = l.entityId && (l.entityType === 'lead' ? leadMap[l.entityId] : l.entityType === 'task' ? taskMap[l.entityId] : '');
        const refMatch = refName && refName.toLowerCase().includes(q);
        return textMatch || nameMatch || refMatch;
      });
    }
    return lgs.sort((a,b) => b.createdAt - a.createdAt);
  }, [selectedMember, searchQuery, leadMap, taskMap]);

  const dayWiseActivity = useMemo(() => {
    if (!selectedMember) return [];
    const days = {};
    (selectedMember.userLogs || []).forEach(l => {
      const ds = new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      days[ds] = (days[ds] || 0) + 1;
    });
    return Object.entries(days).map(([date, count]) => ({ date, count })).sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [selectedMember]);

  if (isLoading) return <div className="p-xl">Loading Performance Data...</div>;

  return (
    <div className="reports-container">
      <div className="sh" style={{ marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 24 }}>Team Performance</h2>
          <div className="sub">Analyze member productivity and activity</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="tabs" style={{ marginBottom: 0, border: 'none' }}>
            {DATE_FILTERS.map(f => (
              <div 
                key={f} 
                className={`tab ${filter === f ? 'active' : ''}`} 
                onClick={() => setFilter(f)}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {filter === 'Custom' && (
        <div style={{ display: 'flex', gap: 15, marginBottom: 20, background: '#f8fafc', padding: 15, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 11 }}>Start Date</label>
            <input type="date" value={customRange.start} onChange={e => setCustomRange(p => ({ ...p, start: e.target.value }))} />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 11 }}>End Date</label>
            <input type="date" value={customRange.end} onChange={e => setCustomRange(p => ({ ...p, end: e.target.value }))} />
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="stat-grid" style={{ marginBottom: 25 }}>
        <div className="stat-card sc-blue">
          <div className="lbl">Total Activities</div>
          <div className="val">{filteredLogs.length}</div>
        </div>
        <div className="stat-card sc-green">
          <div className="lbl">Tasks Worked</div>
          <div className="val">{performanceData.reduce((s, m) => s + m.tasksWorked, 0)}</div>
        </div>
        <div className="stat-card sc-teal">
          <div className="lbl">Leads Worked</div>
          <div className="val">{performanceData.reduce((s, m) => s + m.leadsWorked, 0)}</div>
        </div>
        <div className="stat-card sc-yellow">
          <div className="lbl">Leads Won</div>
          <div className="val">{performanceData.reduce((s, m) => s + m.leadsWon, 0)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '450px 1fr' : '1fr', gap: 20, transition: 'all 0.3s' }}>
        <div className="tw">
          <div className="tw-head">
            <h3>Member Performance Tracker</h3>
          </div>
          <div className="tw-scroll">
            <table className="perf-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Team Member</th>
                  <th>Total Activity</th>
                  <th>Tasks Worked</th>
                  <th>Leads Worked</th>
                  <th>Leads Won</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.map((m, i) => {
                  const maxActivity = Math.max(...performanceData.map(x => x.totalActivities), 1);
                  const score = (m.totalActivities / maxActivity) * 100;
                  const isActive = selectedId === m.id;
                  
                  return (
                    <tr key={m.id} onClick={() => setSelectedId(isActive ? null : m.id)} className={isActive ? 'active-row' : ''}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: isActive ? 'var(--accent)' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{m.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <strong style={{ fontSize: 14 }}>{m.totalActivities}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge bg-blue" style={{ fontSize: 12 }}>{m.tasksWorked}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge bg-teal" style={{ fontSize: 12 }}>{m.leadsWorked}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge bg-green" style={{ fontSize: 12 }}>{m.leadsWon}</span>
                      </td>
                      <td>
                        <div style={{ width: '100%', maxWidth: 80, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${score}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selectedMember && (
          <div className="tw log-detail-view">
            <div className="tw-head" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3>Activity Logs: {selectedMember.name}</h3>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{filter} activity details</div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedId(null)}>×</button>
            </div>
            
            <div style={{ padding: 15, borderBottom: '1px solid var(--border)', display: 'flex', gap: 10 }}>
               <div style={{ flex: 1, position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Search activity (e.g. call, won, lead name)..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="input-sm"
                    style={{ width: '100%', paddingLeft: 30 }}
                  />
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', flex: 1, overflow: 'hidden' }}>
              {/* Day Wise Summary */}
              <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', background: '#f8fafc' }}>
                <div style={{ padding: '10px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Day Summary</div>
                {dayWiseActivity.map(d => (
                  <div key={d.date} style={{ padding: '10px 15px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{d.date.split(',')[0]}</div>
                    <div className="badge bg-gray" style={{ fontSize: 10 }}>{d.count}</div>
                  </div>
                ))}
              </div>

              {/* Logs List */}
              <div style={{ overflowY: 'auto', padding: 15, maxHeight: 500 }}>
                {activeMemberLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No activities found matching criteria</div>
                ) : activeMemberLogs.map((l, i) => {
                   const entName = l.entityType === 'lead' ? leadMap[l.entityId] : l.entityType === 'task' ? taskMap[l.entityId] : l.entityName;
                   
                   return (
                    <div key={l.id || i} style={{ marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className={`badge bg-${l.entityType === 'task' ? 'blue' : l.entityType === 'lead' ? 'teal' : 'gray'}`} style={{ fontSize: 9 }}>{l.entityType}</span>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtDT(l.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{l.text}</div>
                      {entName && (
                         <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
                            Ref: {entName}
                         </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .reports-container { padding: 5px; }
        .sc-blue { border-left: 4px solid #3b82f6; }
        .sc-green { border-left: 4px solid #22c55e; }
        .sc-teal { border-left: 4px solid #14b8a6; }
        .sc-yellow { border-left: 4px solid #eab308; }
        
        .stat-card {
          background: #fff;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-card .lbl { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; font-weight: 700; }
        .stat-card .val { font-size: 24px; font-weight: 800; color: var(--text); }
        
        .bg-green { background: #dcfce7; color: #166534; }
        .bg-blue { background: #dbeafe; color: #1e40af; }
        .bg-teal { background: #f0fdfa; color: #0f766e; }
        .bg-gray { background: #f1f5f9; color: #475569; }

        .input-sm {
          height: 32px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
        }

        .perf-table tr { cursor: pointer; transition: background 0.2s; }
        .perf-table tr:hover { background: #f8fafc; }
        .perf-table tr.active-row { background: #f0f9ff !important; }

        .log-detail-view {
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}} />
    </div>
  );
}
