import React, { useMemo } from 'react';
import db from '../../instant';
import { useApp } from '../../context/AppContext';
import { fmt, fmtD, daysLeft, stageBadgeClass } from '../../utils/helpers';

export default function Dashboard({ user, ownerId, perms }) {
  const { setActiveView } = useApp();
  const { data } = db.useQuery({
    leads: { $: { where: { userId: ownerId } } },
    quotes: { $: { where: { userId: ownerId } } },
    invoices: { $: { where: { userId: ownerId } } },
    projects: { $: { where: { userId: ownerId } } },
    tasks: { $: { where: { userId: ownerId } } },
    amc: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } },
    teamMembers: { $: { where: { userId: ownerId } } },
  });

  const leadsRaw = data?.leads || [];
  const quotesRaw = data?.quotes || [];
  const invoicesRaw = data?.invoices || [];
  const projectsRaw = data?.projects || [];
  const tasksRaw = data?.tasks || [];
  const amcRaw = data?.amc || [];
  
  console.log("🔍 [Dashboard] Props - ownerId:", ownerId, "perms:", perms?.isOwner ? "Owner" : "Team");
  console.log("📊 [Dashboard] Data - leadsRaw count:", leadsRaw.length);

  const { leads, quotes, invoices, projects, amc } = useMemo(() => {
    const isTeam = perms && !perms.isOwner;
    if (!isTeam) return { leads: leadsRaw, quotes: quotesRaw, invoices: invoicesRaw, projects: projectsRaw, amc: amcRaw };

    const filteredLeads = leadsRaw.filter(l => {
      if (perms.isAdmin || perms.isManager) return true;
      const assignKey = (l.assign || '').toLowerCase().trim();
      const userName = (perms.name || '').toLowerCase().trim();
      const userEmail = (user.email || '').toLowerCase().trim();
      return (assignKey && userName && assignKey === userName) || (assignKey && userEmail && assignKey === userEmail) || l.actorId === user.id;
    });
    const filteredInvoices = invoicesRaw.filter(i => i.actorId === user.id || perms.isAdmin || perms.isManager);
    const filteredQuotes = quotesRaw.filter(q => q.actorId === user.id || perms.isAdmin || perms.isManager);
    const filteredAmc = amcRaw.filter(a => a.actorId === user.id || perms.isAdmin || perms.isManager);
    const filteredProjects = projectsRaw.filter(p => {
      if (perms.isAdmin || perms.isManager) return true;
      const assignKey = (p.assignTo || '').toLowerCase().trim();
      const userName = (perms.name || '').toLowerCase().trim();
      const userEmail = (user.email || '').toLowerCase().trim();
      const isAssigned = (assignKey && userName && assignKey === userName) || (assignKey && userEmail && assignKey === userEmail);
      return p.actorId === user.id || isAssigned || tasksRaw.some(t => t.projectId === p.id && (t.assignTo === user.email || t.assignTo === perms.name));
    });

    return { leads: filteredLeads, quotes: filteredQuotes, invoices: filteredInvoices, projects: filteredProjects, amc: filteredAmc };
  }, [leadsRaw, quotesRaw, invoicesRaw, projectsRaw, amcRaw, tasksRaw, perms, user]);
  const now = new Date();

  const stats = useMemo(() => {
    const overdue = leads.filter(l => l.followup && new Date(l.followup) < now).length;
    const active = leads.filter(l => !['Won', 'Lost'].includes(l.stage)).length;
    const amcExp = amc.filter(a => { const d = daysLeft(a.endDate); return d <= 30 && d >= 0; }).length;
    const inProgress = projects.filter(p => p.status === 'In Progress').length;
    return { overdue, active, amcExp, inProgress };
  }, [leads, amc, projects]);

  // Source chart data
  const srcData = useMemo(() => {
    const src = {};
    leads.forEach(l => { if (l.source) src[l.source] = (src[l.source] || 0) + 1; });
    return Object.entries(src);
  }, [leads]);
  const maxSrc = Math.max(...srcData.map(([, v]) => v), 1);
  const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];

  // Upcoming reminders
  const reminders = useMemo(() => {
    const rem = [];
    amc.forEach(a => { const d = daysLeft(a.endDate); if (d <= 30 && d >= 0) rem.push({ icon: '🛡', text: `<strong>${a.client}</strong> AMC ${a.plan ? `(<strong>${a.plan}</strong>) ` : ''}expires in <strong>${d} days</strong>`, actionInfo: { type: 'amc', id: a.id } }); });
    leads.filter(l => l.followup && new Date(l.followup) < now).forEach(l => rem.push({ icon: '⏰', text: `Follow-up overdue: <strong>${l.name}</strong>`, actionInfo: { type: 'lead', id: l.id } }));
    return rem;
  }, [amc, leads]);

  // Revenue Trend (Last 6 Months)
  const revenueTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ 
        name: d.toLocaleDateString('en-IN', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear(),
        total: 0
      });
    }
    invoices.filter(inv => inv.status === 'Paid').forEach(inv => {
      const idate = new Date(inv.date);
      const mIdx = months.findIndex(m => m.month === idate.getMonth() && m.year === idate.getFullYear());
      if (mIdx !== -1) months[mIdx].total += (inv.total || 0);
    });
    return months;
  }, [invoices]);
  const maxRev = Math.max(...revenueTrend.map(m => m.total), 1);

  // Hot Leads
  const hotLeads = useMemo(() => {
    return leads.filter(l => l.label === 'Hot' || (l.followup && new Date(l.followup) >= now)).slice(0, 5);
  }, [leads]);

  // Calendar
  const [calDate, setCalDate] = React.useState(new Date());
  const calDays = useMemo(() => {
    const fDates = new Set(leads.filter(l => l.followup).map(l => new Date(l.followup).toDateString()));
    const yr = calDate.getFullYear(), mo = calDate.getMonth();
    const first = new Date(yr, mo, 1).getDay(), total = new Date(yr, mo + 1, 0).getDate();
    const today = new Date();
    const days = [];
    for (let i = 0; i < first; i++) days.push({ empty: true, i });
    for (let d = 1; d <= total; d++) {
      const dt = new Date(yr, mo, d);
      days.push({ d, isToday: dt.toDateString() === today.toDateString(), hasEvent: fDates.has(dt.toDateString()) });
    }
    return days;
  }, [calDate, leads]);

  const greeting = useMemo(() => {
    const h = now.getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const handleReminderClick = (info) => {
    if (!info) return;
    if (info.type === 'amc') {
      localStorage.setItem('tc_open_amc', info.id);
      setActiveView('amc');
    } else if (info.type === 'lead') {
      localStorage.setItem('tc_open_lead', info.id);
      setActiveView('leads');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sh">
        <div>
          <h2>Dashboard</h2>
          <div className="sub">{`${greeting}! ${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {stats.amcExp > 0 && <span className="rem-badge">🛡 {stats.amcExp} AMC expiring</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {perms.can('Leads', 'list') !== false && (
          <>
            <div className="stat-card sc-green"><div className="lbl">Total Leads</div><div className="val">{leads.length}</div></div>
            <div className="stat-card sc-blue"><div className="lbl">Active</div><div className="val">{stats.active}</div></div>
            <div className="stat-card sc-red"><div className="lbl">Overdue Follow</div><div className="val">{stats.overdue}</div></div>
          </>
        )}
        {perms.can('Quotations', 'list') !== false && (
          <div className="stat-card sc-yellow"><div className="lbl">Quotations</div><div className="val">{quotes.length}</div></div>
        )}
        {perms.can('Invoices', 'list') !== false && (
          <div className="stat-card sc-purple"><div className="lbl">Invoices</div><div className="val">{invoices.length}</div></div>
        )}
        {perms.can('Projects', 'list') !== false && (
          <div className="stat-card sc-teal"><div className="lbl">Projects</div><div className="val">{stats.inProgress}</div></div>
        )}
        {perms.can('AMC', 'list') !== false && (
          <div className="stat-card sc-red"><div className="lbl">AMC Expiring</div><div className="val">{stats.amcExp}</div></div>
        )}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Source Chart */}
        {perms.can('Leads', 'list') !== false && (
          <div className="tw">
            <div className="tw-head"><h3>Leads by Source</h3></div>
            <div style={{ padding: '14px 16px' }}>
              {srcData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 12 }}>No leads yet</div>
              ) : srcData.map(([k, v], i) => (
                <div key={k} className="chart-row">
                  <div className="chart-label">{k}</div>
                  <div className="chart-bar-wrap"><div className="chart-bar" style={{ width: `${(v / maxSrc) * 100}%`, background: CHART_COLORS[i % 6] }} /></div>
                  <div className="chart-val">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reminders */}
        {(perms.can('Leads', 'list') !== false || perms.can('AMC', 'list') !== false) && (
          <div className="tw">
            <div className="tw-head"><h3>⏰ Upcoming Reminders</h3></div>
            <div style={{ padding: '6px 0' }}>
              {reminders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 28, color: 'var(--muted)', fontSize: 12 }}>✓ No pending reminders</div>
              ) : reminders.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'start', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: '.15s', ':hover': { background: 'var(--bg)' } }} onClick={() => handleReminderClick(r.actionInfo)} className="rem-item-hover">
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{r.icon}</span>
                  <div style={{ flex: 1, fontSize: 12, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: r.text }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Leads + Calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {perms.can('Leads', 'list') !== false && (
          <>
            <div className="tw">
              <div className="tw-head"><h3>Recent Leads</h3></div>
              <table>
                <thead><tr><th>Name</th><th>Stage</th><th>Source</th></tr></thead>
                <tbody>
                  {leads.slice(-5).reverse().map(l => (
                    <tr key={l.id}>
                      <td><strong>{l.name}</strong></td>
                      <td><span className={`badge ${stageBadgeClass(l.stage)}`}>{l.stage}</span></td>
                      <td style={{ color: 'var(--muted)' }}>{l.source}</td>
                    </tr>
                  ))}
                  {leads.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No leads yet</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Hot Leads */}
            <div className="tw">
              <div className="tw-head"><h3>🔥 Hot Leads (Top Priority)</h3></div>
              <div style={{ padding: '0' }}>
                {hotLeads.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 28, color: 'var(--muted)', fontSize: 12 }}>Check your active leads</div>
                ) : hotLeads.map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{l.source} • {l.phone}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${stageBadgeClass(l.stage)}`} style={{ fontSize: 10 }}>{l.stage}</span>
                      <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, marginTop: 4 }}>
                        {l.followup ? `Next: ${fmtD(l.followup)}` : 'Hot Label'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Revenue Trend */}
        {perms.can('Invoices', 'list') !== false && (
          <div className="tw">
            <div className="tw-head"><h3>📈 Monthly Revenue Trend</h3></div>
            <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, height: 160 }}>
              {revenueTrend.map(m => {
                const h = (m.total / maxRev) * 100;
                return (
                  <div key={m.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>{m.total > 0 ? `₹${Math.round(m.total/1000)}k` : ''}</div>
                    <div style={{ width: '100%', maxWidth: 30, height: `${Math.max(h, 5)}%`, background: 'var(--accent)', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginTop: 8 }}>{m.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendar */}
        {perms.can('Leads', 'list') !== false && (
          <div className="tw">
            <div className="tw-head">
              <h3>Follow-Up Calendar</h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="btn-icon btn-sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 100, textAlign: 'center' }}>
                  {calDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
                <button className="btn-icon btn-sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
              </div>
            </div>
            <div style={{ padding: '10px 14px' }}>
              <div className="cal-grid">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', padding: '3px 0', textAlign: 'center' }}>{d}</div>
                ))}
                {calDays.map((item, i) => (
                  item.empty
                    ? <div key={i} />
                    : <div key={i} className={`cal-day${item.isToday ? ' today' : item.hasEvent ? ' has-event' : ''}`}>
                      {item.d}{item.hasEvent && !item.isToday ? '•' : ''}
                    </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
