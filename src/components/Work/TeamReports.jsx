import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { fmt, fmtD } from '../../utils/helpers';

const DATE_FILTERS = ['Today', 'Yesterday', 'This Month', 'This Year', 'Custom'];

export default function TeamReports({ user, ownerId, perms }) {
  const [filter, setFilter] = useState('This Month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

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
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
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
    // Map team members and owner
    const members = [
      { id: ownerId, name: 'Business Owner', email: profile.email || '' },
      ...team.map(m => ({ id: m.id, name: m.name, email: m.email }))
    ];

    return members.map(m => {
      const userLogs = filteredLogs.filter(l => l.actorId === m.id || (l.userName === m.email && m.email));
      
      const tasksDone = userLogs.filter(l => l.entityType === 'task' && l.text.includes('to "Completed"')).length;
      const callsMade = userLogs.filter(l => l.text.includes('📞') || l.text.toLowerCase().includes('call')).length;
      const leadsWon = userLogs.filter(l => l.entityType === 'lead' && l.text.includes(`to "${wonStage}"`)).length;
      const totalActivities = userLogs.length;

      return {
        ...m,
        tasksDone,
        callsMade,
        leadsWon,
        totalActivities
      };
    }).sort((a, b) => b.totalActivities - a.totalActivities);
  }, [filteredLogs, team, ownerId, profile.email, wonStage]);

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
          <div className="lbl">Tasks Completed</div>
          <div className="val">{performanceData.reduce((s, m) => s + m.tasksDone, 0)}</div>
        </div>
        <div className="stat-card sc-teal">
          <div className="lbl">Client Calls</div>
          <div className="val">{performanceData.reduce((s, m) => s + m.callsMade, 0)}</div>
        </div>
        <div className="stat-card sc-yellow">
          <div className="lbl">Leads Won</div>
          <div className="val">{performanceData.reduce((s, m) => s + m.leadsWon, 0)}</div>
        </div>
      </div>

      <div className="tw">
        <div className="tw-head">
          <h3>Member Performance Tracker</h3>
        </div>
        <div className="tw-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Team Member</th>
                <th>Total Activity</th>
                <th>Tasks Done</th>
                <th>Calls Logged</th>
                <th>Leads Won</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {performanceData.map((m, i) => {
                const maxActivity = Math.max(...performanceData.map(x => x.totalActivities), 1);
                const score = (m.totalActivities / maxActivity) * 100;
                
                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
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
                      <span className="badge bg-green" style={{ fontSize: 12 }}>{m.tasksDone}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge bg-blue" style={{ fontSize: 12 }}>{m.callsMade}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge bg-teal" style={{ fontSize: 12 }}>{m.leadsWon}</span>
                    </td>
                    <td>
                      <div style={{ width: '100%', maxWidth: 120, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
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
      `}} />
    </div>
  );
}
