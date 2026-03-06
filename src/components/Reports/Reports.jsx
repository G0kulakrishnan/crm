import React, { useState, useMemo, useEffect } from 'react';
import db from '../../instant';
import { fmt, fmtD } from '../../utils/helpers';

export default function Reports({ user }) {
  const [tab, setTab] = useState('pl');
  const [dateFilter, setDateFilter] = useState('This Month');
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setMonth(0, 1); return d.toISOString().split('T')[0]; });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (dateFilter === 'Custom Range') return;
    const today = new Date();
    const sy = today.getFullYear();
    const sm = today.getMonth();
    const sd = today.getDate();

    let f, t;
    if (dateFilter === 'Today') { f = new Date(sy, sm, sd); t = f; }
    else if (dateFilter === 'Yesterday') { f = new Date(sy, sm, sd - 1); t = f; }
    else if (dateFilter === 'This Month') { f = new Date(sy, sm, 1); t = new Date(sy, sm + 1, 0); }
    else if (dateFilter === 'Last Month') { f = new Date(sy, sm - 1, 1); t = new Date(sy, sm, 0); }
    else if (dateFilter === 'This FY') {
      const startYear = sm >= 3 ? sy : sy - 1;
      f = new Date(startYear, 3, 1); t = new Date(startYear + 1, 2, 31);
    }
    else if (dateFilter === 'Previous FY') {
      const startYear = sm >= 3 ? sy - 1 : sy - 2;
      f = new Date(startYear, 3, 1); t = new Date(startYear + 1, 2, 31);
    }
    
    if (f && t) {
      // Adjust timezone offset to reliably get local date string
      const offset = f.getTimezoneOffset() * 60000;
      setFromDate(new Date(f - offset).toISOString().split('T')[0]);
      setToDate(new Date(t - offset).toISOString().split('T')[0]);
    }
  }, [dateFilter]);

  const { data } = db.useQuery({
    invoices: { $: { where: { userId: user.id } } },
    expenses: { $: { where: { userId: user.id } } },
    leads: { $: { where: { userId: user.id } } },
    tasks: { $: { where: { userId: user.id } } },
    teamMembers: { $: { where: { userId: user.id } } },
  });

  const invoices = data?.invoices || [];
  const expenses = data?.expenses || [];
  const leads = data?.leads || [];
  const tasks = data?.tasks || [];
  const team = data?.teamMembers || [];

  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= new Date(fromDate) && d <= new Date(toDate + 'T23:59:59');
  };

  const filteredInv = invoices.filter(inv => inRange(inv.date));
  const filteredExp = expenses.filter(e => inRange(e.date));

  const { revenue, gst } = useMemo(() => {
    let revenue = 0, gst = 0;
    filteredInv.filter(inv => inv.status === 'Paid').forEach(inv => {
      revenue += (inv.total || 0);
      gst += (inv.taxAmt || 0);
    });
    return { revenue, gst };
  }, [filteredInv]);

  const totalExp = useMemo(() => filteredExp.filter(e => e.status === 'Approved').reduce((s, e) => s + (e.amount || 0), 0), [filteredExp]);
  const profit = revenue - totalExp;

  // Lead pipeline
  const STAGES = ['New Enquiry', 'Enquiry Contacted', 'Budget Negotiation', 'Advance Paid', 'Won', 'Lost'];
  const stageCount = STAGES.map(s => ({ stage: s, count: leads.filter(l => l.stage === s).length }));
  const maxCount = Math.max(...stageCount.map(s => s.count), 1);
  const CHART_COLORS = ['#60a5fa', '#6ee7b7', '#fde68a', '#c4b5fd', '#86efac', '#fca5a5'];

  // Team performance
  const teamPerf = team.map(m => ({
    name: m.name,
    leads: leads.filter(l => l.assign === m.name).length,
    done: tasks.filter(t => t.assignTo === m.name && t.status === 'Done').length,
    tasks: tasks.filter(t => t.assignTo === m.name).length,
  }));

  const exportCSV = (headers, rows, filename) => {
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const handleExport = () => {
    if (tab === 'pl') {
      exportCSV(['Invoice No', 'Client', 'Date', 'Status', 'Amount'], filteredInv.map(inv => [inv.no, inv.client, fmtD(inv.date), inv.status, inv.total]), `PL_Report_${fromDate}_to_${toDate}`);
    } else if (tab === 'gst') {
      exportCSV(['Invoice No', 'Client', 'Status', 'Taxable Amount', 'GST Amount'], filteredInv.map(inv => [inv.no, inv.client, inv.status, (inv.total || 0) - (inv.taxAmt || 0), inv.taxAmt]), `GST_Report_${fromDate}_to_${toDate}`);
    } else if (tab === 'team') {
      exportCSV(['Name', 'Leads Assigned', 'Tasks Total', 'Tasks Done', 'Completion %'], teamPerf.map(m => [m.name, m.leads, m.tasks, m.done, m.tasks ? Math.round((m.done / m.tasks) * 100) + '%' : '0%']), `Team_Perf_${fromDate}_to_${toDate}`);
    } else if (tab === 'leads') {
      exportCSV(['Stage', 'Count'], stageCount.map(s => [s.stage, s.count]), `Lead_Pipeline_${fromDate}_to_${toDate}`);
    }
  };

  return (
    <div>
      <div className="sh" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <h2>Reports & Analytics</h2>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>⬇ Export (Excel/CSV)</button>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit' }}>
            {['Today', 'Yesterday', 'This Month', 'Last Month', 'This FY', 'Previous FY', 'Custom Range'].map(s => <option key={s}>{s}</option>)}
          </select>
          {dateFilter === 'Custom Range' && (
            <>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit' }} />
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit' }} />
            </>
          )}
        </div>
      </div>

      <div className="tabs">
        {[['pl', 'P&L Statement'], ['gst', 'GST Summary'], ['leads', 'Lead Pipeline'], ['team', 'Team Performance']].map(([t, l]) => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{l}</div>
        ))}
      </div>

      {tab === 'pl' && (
        <div>
          <div className="stat-grid" style={{ marginBottom: 18 }}>
            <div className="stat-card sc-green"><div className="lbl">Revenue (Paid)</div><div className="val" style={{ fontSize: 20 }}>{fmt(revenue)}</div></div>
            <div className="stat-card sc-red"><div className="lbl">Expenses</div><div className="val" style={{ fontSize: 20 }}>{fmt(totalExp)}</div></div>
            <div className={`stat-card ${profit >= 0 ? 'sc-green' : 'sc-red'}`}><div className="lbl">Net Profit</div><div className="val" style={{ fontSize: 20 }}>{fmt(profit)}</div></div>
            <div className="stat-card sc-blue"><div className="lbl">GST Collected</div><div className="val" style={{ fontSize: 20 }}>{fmt(gst)}</div></div>
          </div>
          <div className="tw">
            <div className="tw-head"><h3>Invoice Breakdown</h3></div>
            <table>
              <thead><tr><th>Invoice No.</th><th>Client</th><th>Date</th><th>Status</th><th>Amount</th></tr></thead>
              <tbody>
                {filteredInv.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No invoices in this period</td></tr>
                  : filteredInv.map(inv => <tr key={inv.id}><td style={{ fontSize: 12 }}>{inv.no}</td><td>{inv.client}</td><td style={{ fontSize: 12 }}>{fmtD(inv.date)}</td><td><span className={`badge ${inv.status === 'Paid' ? 'bg-green' : inv.status === 'Overdue' ? 'bg-red' : 'bg-gray'}`}>{inv.status}</span></td><td style={{ fontWeight: 700 }}>{fmt(inv.total)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'gst' && (
        <div className="tw">
          <div className="tw-head"><h3>GST Summary</h3></div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
              <div className="stat-card sc-green"><div className="lbl">Output GST</div><div className="val" style={{ fontSize: 20 }}>{fmt(gst)}</div><div className="sub">Collected from clients</div></div>
              <div className="stat-card sc-red"><div className="lbl">Input GST</div><div className="val" style={{ fontSize: 20 }}>—</div><div className="sub">Enter bills to track</div></div>
              <div className="stat-card sc-purple"><div className="lbl">Net GST Payable</div><div className="val" style={{ fontSize: 20 }}>{fmt(gst)}</div></div>
            </div>
            <table className="li-table" style={{ width: '100%' }}>
              <thead><tr><th>Invoice No.</th><th>Client</th><th>Status</th><th>Taxable Amount</th><th>GST Amount</th></tr></thead>
              <tbody>
                {filteredInv.map(inv => <tr key={inv.id}><td>{inv.no}</td><td>{inv.client}</td><td><span className={`badge ${inv.status === 'Paid' ? 'bg-green' : 'bg-gray'}`}>{inv.status}</span></td><td style={{ textAlign: 'right' }}>{fmt((inv.total || 0) - (inv.taxAmt || 0))}</td><td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{fmt(inv.taxAmt || 0)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'leads' && (
        <div className="tw">
          <div className="tw-head"><h3>Lead Pipeline</h3></div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              <div className="stat-card"><div className="lbl">Total Leads</div><div className="val">{leads.length}</div></div>
              <div className="stat-card sc-green"><div className="lbl">Won</div><div className="val">{leads.filter(l => l.stage === 'Won').length}</div></div>
              <div className="stat-card sc-red"><div className="lbl">Lost</div><div className="val">{leads.filter(l => l.stage === 'Lost').length}</div></div>
            </div>
            {stageCount.map(({ stage, count }, i) => (
              <div key={stage} className="chart-row">
                <div className="chart-label">{stage.split(' ')[0]}</div>
                <div className="chart-bar-wrap"><div className="chart-bar" style={{ width: `${(count / maxCount) * 100}%`, background: CHART_COLORS[i] }} /></div>
                <div style={{ fontSize: 11, fontWeight: 700, minWidth: 25 }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'team' && (
        <div className="tw">
          <div className="tw-head"><h3>Team Performance</h3></div>
          <table>
            <thead><tr><th>Name</th><th>Leads Assigned</th><th>Tasks Total</th><th>Tasks Done</th><th>Completion</th></tr></thead>
            <tbody>
              {teamPerf.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>Add team members to see performance</td></tr>
                : teamPerf.map((m, i) => {
                  const pct = m.tasks ? Math.round((m.done / m.tasks) * 100) : 0;
                  return (
                    <tr key={i}>
                      <td><strong>{m.name}</strong></td>
                      <td><span className="badge bg-blue">{m.leads}</span></td>
                      <td>{m.tasks}</td>
                      <td><span className="badge bg-green">{m.done}</span></td>
                      <td style={{ minWidth: 100 }}><div className="pbar"><div className="pfill" style={{ width: `${pct}%` }} /></div><span style={{ fontSize: 11, color: 'var(--muted)' }}>{pct}%</span></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
