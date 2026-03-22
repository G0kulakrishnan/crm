import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_HOURS = Object.fromEntries(DAYS.map(d => [d, { enabled: d !== 'Sunday', start: '09:00', end: '18:00' }]));
const STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show'];
const STATUS_COLORS = {
  Pending: { bg: '#fef3c7', color: '#92400e' },
  Confirmed: { bg: '#dbeafe', color: '#1e40af' },
  Completed: { bg: '#dcfce7', color: '#166534' },
  Cancelled: { bg: '#fee2e2', color: '#991b1b' },
  'No Show': { bg: '#f3f4f6', color: '#374151' },
};

export default function Appointments({ ownerId, perms }) {
  const toast = useToast();
  const [tab, setTab] = useState('list'); // list | settings
  const [dateFilter, setDateFilter] = useState('today');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rsForm, setRsForm] = useState({ date: '', time: '' });

  const { data } = db.useQuery({
    appointments: { $: { where: { userId: ownerId } } },
    appointmentSettings: { $: { where: { userId: ownerId } } },
  });
  const appointments = data?.appointments || [];
  const settingsRecord = data?.appointmentSettings?.[0];
  const settingsId = settingsRecord?.id || id();

  const [settingsForm, setSettingsForm] = useState(null);
  React.useEffect(() => {
    if (settingsRecord && !settingsForm) {
      setSettingsForm({
        workingHours: settingsRecord.workingHours ? JSON.parse(settingsRecord.workingHours) : DEFAULT_HOURS,
        holidays: settingsRecord.holidays ? JSON.parse(settingsRecord.holidays) : [],
        slotDuration: settingsRecord.slotDuration || 30,
        maxPerSlot: settingsRecord.maxPerSlot || 1,
        services: settingsRecord.services ? JSON.parse(settingsRecord.services) : ['General Appointment'],
      });
    } else if (!settingsRecord && !settingsForm) {
      setSettingsForm({ workingHours: DEFAULT_HOURS, holidays: [], slotDuration: 30, maxPerSlot: 1, services: ['General Appointment'] });
    }
  }, [settingsRecord]);

  const saveSettings = async () => {
    await db.transact(db.tx.appointmentSettings[settingsId].update({
      userId: ownerId,
      workingHours: JSON.stringify(settingsForm.workingHours),
      holidays: JSON.stringify(settingsForm.holidays),
      slotDuration: settingsForm.slotDuration,
      maxPerSlot: settingsForm.maxPerSlot,
      services: JSON.stringify(settingsForm.services),
      updatedAt: Date.now(),
    }));
    toast('Availability settings saved!', 'success');
  };

  const updateStatus = async (apptId, status) => {
    await db.transact(db.tx.appointments[apptId].update({ status, updatedAt: Date.now() }));
    toast(`Status updated to ${status}`, 'success');
  };

  const reschedule = async () => {
    if (!rsForm.date || !rsForm.time) { toast('Date and time required', 'error'); return; }
    await db.transact(db.tx.appointments[rescheduleModal.id].update({ date: rsForm.date, time: rsForm.time, updatedAt: Date.now() }));
    toast('Appointment rescheduled', 'success');
    setRescheduleModal(null);
  };

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
  const weekEnd = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];

  const filtered = useMemo(() => {
    let list = [...appointments].sort((a, b) => {
      const da = `${a.date}T${a.time}`;
      const db2 = `${b.date}T${b.time}`;
      return da < db2 ? -1 : 1;
    });
    if (dateFilter === 'today') list = list.filter(a => a.date === todayStr);
    else if (dateFilter === 'tomorrow') list = list.filter(a => a.date === tomorrowStr);
    else if (dateFilter === 'week') list = list.filter(a => a.date >= todayStr && a.date <= weekEnd);
    if (statusFilter !== 'All') list = list.filter(a => a.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => [a.customerName, a.customerPhone, a.service].some(v => String(v || '').toLowerCase().includes(q)));
    }
    return list;
  }, [appointments, dateFilter, statusFilter, search, todayStr, tomorrowStr, weekEnd]);

  const todayCount = appointments.filter(a => a.date === todayStr).length;
  const pending = appointments.filter(a => a.status === 'Pending').length;
  const upcoming = appointments.filter(a => a.date >= todayStr && a.status !== 'Cancelled').length;

  return (
    <div>
      <div className="sh">
        <div>
          <h2>📅 Appointments</h2>
          <div className="sub">Manage bookings for your services</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${tab === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('list')}>📋 Appointments</button>
          <button className={`btn btn-sm ${tab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('settings')}>⚙️ Availability</button>
        </div>
      </div>

      {tab === 'list' && (
        <>
          <div className="stat-grid" style={{ marginBottom: 18 }}>
            <div className="stat-card sc-blue"><div className="lbl">Today</div><div className="val">{todayCount}</div></div>
            <div className="stat-card sc-yellow"><div className="lbl">Pending</div><div className="val">{pending}</div></div>
            <div className="stat-card sc-green"><div className="lbl">Upcoming (7 days)</div><div className="val">{upcoming}</div></div>
            <div className="stat-card sc-purple"><div className="lbl">Total</div><div className="val">{appointments.length}</div></div>
          </div>

          <div className="tw">
            <div className="tw-head" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'This Week'], ['all', 'All']].map(([v, l]) => (
                  <button key={v} onClick={() => setDateFilter(v)} className={`btn btn-sm ${dateFilter === v ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }}>{l}</button>
                ))}
                {['All', ...STATUSES].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11, padding: '3px 8px' }}>{s}</button>
                ))}
              </div>
              <div className="sw">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="tw-scroll">
              <table>
                <thead><tr><th>#</th><th>Customer</th><th>Service</th><th>Date & Time</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No appointments {dateFilter !== 'all' ? `for ${dateFilter}` : ''}.</td></tr>
                  )}
                  {filtered.map((a, i) => {
                    const sc = STATUS_COLORS[a.status] || STATUS_COLORS.Pending;
                    return (
                      <tr key={a.id}>
                        <td style={{ fontSize: 11, color: 'var(--muted)' }}>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{a.customerName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.customerPhone}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{a.service || '—'}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{a.date}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.time}</div>
                        </td>
                        <td>
                          <select value={a.status || 'Pending'} onChange={e => updateStatus(a.id, e.target.value)}
                            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1.5px solid', borderColor: sc.color, background: sc.bg, color: sc.color, fontWeight: 700 }}>
                            {STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.notes || '—'}</td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setRescheduleModal(a); setRsForm({ date: a.date, time: a.time }); }}>📅 Reschedule</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'settings' && settingsForm && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 800 }}>
          <div className="tw" style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 16, fontSize: 14 }}>🕐 Working Hours</h4>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Slot Duration (minutes)</label>
                <select value={settingsForm.slotDuration} onChange={e => setSettingsForm(p => ({ ...p, slotDuration: +e.target.value }))}>
                  {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} mins</option>)}
                </select>
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Max bookings/slot</label>
                <input type="number" min={1} max={20} value={settingsForm.maxPerSlot} onChange={e => setSettingsForm(p => ({ ...p, maxPerSlot: +e.target.value }))} />
              </div>
            </div>
            {DAYS.map(day => {
              const hours = settingsForm.workingHours[day] || { enabled: false, start: '09:00', end: '18:00' };
              return (
                <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 12px', background: hours.enabled ? 'var(--bg-soft)' : '#fef2f2', borderRadius: 8 }}>
                  <input type="checkbox" checked={hours.enabled} onChange={e => setSettingsForm(p => ({ ...p, workingHours: { ...p.workingHours, [day]: { ...hours, enabled: e.target.checked } } }))} style={{ width: 15, height: 15 }} />
                  <span style={{ fontWeight: 600, fontSize: 13, width: 90 }}>{day}</span>
                  {hours.enabled && (
                    <>
                      <input type="time" value={hours.start} onChange={e => setSettingsForm(p => ({ ...p, workingHours: { ...p.workingHours, [day]: { ...hours, start: e.target.value } } }))} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>to</span>
                      <input type="time" value={hours.end} onChange={e => setSettingsForm(p => ({ ...p, workingHours: { ...p.workingHours, [day]: { ...hours, end: e.target.value } } }))} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} />
                    </>
                  )}
                  {!hours.enabled && <span style={{ fontSize: 11, color: '#991b1b' }}>Closed</span>}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="tw" style={{ padding: 24 }}>
              <h4 style={{ marginBottom: 14, fontSize: 14 }}>💼 Services Offered</h4>
              {settingsForm.services.map((svc, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={svc} onChange={e => setSettingsForm(p => ({ ...p, services: p.services.map((s, j) => j === i ? e.target.value : s) }))} style={{ flex: 1 }} />
                  <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => setSettingsForm(p => ({ ...p, services: p.services.filter((_, j) => j !== i) }))}>✕</button>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 4 }} onClick={() => setSettingsForm(p => ({ ...p, services: [...p.services, ''] }))}>+ Add Service</button>
            </div>

            <div className="tw" style={{ padding: 24 }}>
              <h4 style={{ marginBottom: 14, fontSize: 14 }}>🚫 Holidays / Off Days</h4>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input type="date" id="holiday-input" style={{ flex: 1 }} />
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  const val = document.getElementById('holiday-input').value;
                  if (val && !settingsForm.holidays.includes(val)) setSettingsForm(p => ({ ...p, holidays: [...p.holidays, val].sort() }));
                }}>Add</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {settingsForm.holidays.map(h => (
                  <span key={h} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    {h}
                    <button onClick={() => setSettingsForm(p => ({ ...p, holidays: p.holidays.filter(x => x !== h) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: 800, lineHeight: 1 }}>✕</button>
                  </span>
                ))}
                {settingsForm.holidays.length === 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>No holidays set</span>}
              </div>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <button className="btn btn-primary" onClick={saveSettings}>💾 Save Availability Settings</button>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="mo open">
          <div className="mo-box" style={{ maxWidth: 400 }}>
            <div className="mo-head"><h3>Reschedule Appointment</h3><button className="btn-icon" onClick={() => setRescheduleModal(null)}>✕</button></div>
            <div className="mo-body" style={{ padding: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 16 }}>{rescheduleModal.customerName} — {rescheduleModal.service}</div>
              <div className="fgrid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="fg"><label>New Date</label><input type="date" value={rsForm.date} onChange={e => setRsForm(p => ({ ...p, date: e.target.value }))} /></div>
                <div className="fg"><label>New Time</label><input type="time" value={rsForm.time} onChange={e => setRsForm(p => ({ ...p, time: e.target.value }))} /></div>
              </div>
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setRescheduleModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={reschedule}>Save Reschedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
