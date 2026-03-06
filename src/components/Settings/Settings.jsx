import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useToast } from '../../context/ToastContext';

const SETTING_NAV = ['Business', 'Custom Fields', 'Sources', 'Stages', 'Labels', 'Expense Categories', 'Task Statuses', 'SMTP', 'WhatsApp', 'Reminders'];

const DEFAULT_SOURCES = ['FB Ads', 'Direct', 'Broker', 'Google Ads', 'Referral', 'WhatsApp', 'Website', 'Other'];
const DEFAULT_STAGES = ['New Enquiry', 'Enquiry Contacted', 'Budget Negotiation', 'Advance Paid', 'Won', 'Lost'];
const DEFAULT_LABELS = ['Hot', 'Warm', 'Cold', 'VIP', 'Pending'];
const DEFAULT_CFIELDS = []; // { name: 'Requirement', type: 'text'|'number'|'dropdown', options: 'A,B' }
const DEFAULT_EXP_CATS = ['Software', 'Hardware', 'Travel', 'Office', 'Marketing', 'Utilities', 'Salaries', 'Misc'];
const DEFAULT_TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];

export default function Settings({ user, profile }) {
  const [active, setActive] = useState('Business');
  const [biz, setBiz] = useState({
    bizName: profile?.bizName || '', address: profile?.address || '',
    gstin: profile?.gstin || '', pan: profile?.pan || '',
    phone: profile?.phone || '', email: profile?.email || '',
    website: profile?.website || '',
  });
  const [smtpHost, setSmtpHost] = useState(profile?.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(profile?.smtpPort || '587');
  const [smtpUser, setSmtpUser] = useState(profile?.smtpUser || '');
  const [smtpPass, setSmtpPass] = useState('');
  const [waToken, setWaToken] = useState(profile?.waToken || '');
  const [waFrom, setWaFrom] = useState(profile?.waFrom || '');
  const [newSource, setNewSource] = useState('');
  const [newStage, setNewStage] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newExpCat, setNewExpCat] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('');
  const [newCF, setNewCF] = useState({ name: '', type: 'text', options: '' });
  const [editingCFIndex, setEditingCFIndex] = useState(null);
  const toast = useToast();

  const { data } = db.useQuery({ userProfiles: { $: { where: { userId: user.id } } } });
  const profileId = data?.userProfiles?.[0]?.id;
  const sources = data?.userProfiles?.[0]?.sources || DEFAULT_SOURCES;
  const stages = data?.userProfiles?.[0]?.stages || DEFAULT_STAGES;
  const labels = data?.userProfiles?.[0]?.labels || DEFAULT_LABELS;
  const customFields = data?.userProfiles?.[0]?.customFields || DEFAULT_CFIELDS;
  const expCats = data?.userProfiles?.[0]?.expCats || DEFAULT_EXP_CATS;
  const taskStatuses = data?.userProfiles?.[0]?.taskStatuses || DEFAULT_TASK_STATUSES;

  const saveBiz = async () => {
    const payload = { ...biz, userId: user.id };
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update(payload)); }
    else { await db.transact(db.tx.userProfiles[id()].update(payload)); }
    toast('Business settings saved!', 'success');
  };

  const saveList = async (key, list) => {
    const payload = { [key]: list, userId: user.id };
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update(payload)); }
    else { await db.transact(db.tx.userProfiles[id()].update(payload)); }
    toast('Saved!', 'success');
  };

  const addItem = (key, list, val, reset) => {
    if (!val.trim()) return;
    saveList(key, [...list, val.trim()]);
    reset('');
  };

  const addCF = () => {
    if (!newCF.name.trim()) return;
    if (editingCFIndex !== null) {
      const updatedList = [...customFields];
      updatedList[editingCFIndex] = { ...newCF, name: newCF.name.trim() };
      saveList('customFields', updatedList);
      setEditingCFIndex(null);
    } else {
      saveList('customFields', [...customFields, { ...newCF, name: newCF.name.trim() }]);
    }
    setNewCF({ name: '', type: 'text', options: '' });
  };
  
  const editCF = (idx) => {
    setEditingCFIndex(idx);
    setNewCF(customFields[idx]);
  };

  const cancelEditCF = () => {
    setEditingCFIndex(null);
    setNewCF({ name: '', type: 'text', options: '' });
  };

  const removeItem = (key, list, idx) => saveList(key, list.filter((_, i) => i !== idx));

  const saveSMTP = async () => {
    const payload = { smtpHost, smtpPort, smtpUser, userId: user.id };
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update(payload)); }
    toast('SMTP settings saved!', 'success');
  };

  const saveWA = async () => {
    const payload = { waToken, waFrom, userId: user.id };
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update(payload)); }
    toast('WhatsApp settings saved!', 'success');
  };

  return (
    <div>
      <div className="sh"><div><h2>Settings</h2></div></div>
      <div className="sg">
        {/* Sidebar */}
        <div className="sn">
          {SETTING_NAV.map(s => (
            <div key={s} className={`sni${active === s ? ' active' : ''}`} onClick={() => setActive(s)}>{s}</div>
          ))}
        </div>

        {/* Content */}
        <div>
          {active === 'Business' && (
            <div className="tw">
              <div className="tw-head"><h3>Business Details</h3><button className="btn btn-primary btn-sm" onClick={saveBiz}>Save</button></div>
              <div style={{ padding: '20px' }}>
                <div className="fgrid">
                  <div className="fg span2"><label>Business Name</label><input value={biz.bizName} onChange={e => setBiz(b => ({ ...b, bizName: e.target.value }))} /></div>
                  <div className="fg span2"><label>Address</label><textarea value={biz.address} onChange={e => setBiz(b => ({ ...b, address: e.target.value }))} style={{ minHeight: 60 }} /></div>
                  <div className="fg"><label>GSTIN</label><input value={biz.gstin} onChange={e => setBiz(b => ({ ...b, gstin: e.target.value }))} placeholder="22AAAAA0000A1Z5" /></div>
                  <div className="fg"><label>PAN</label><input value={biz.pan} onChange={e => setBiz(b => ({ ...b, pan: e.target.value }))} placeholder="AAAPZ1234C" /></div>
                  <div className="fg"><label>Phone</label><input value={biz.phone} onChange={e => setBiz(b => ({ ...b, phone: e.target.value }))} /></div>
                  <div className="fg"><label>Email</label><input type="email" value={biz.email} onChange={e => setBiz(b => ({ ...b, email: e.target.value }))} /></div>
                  <div className="fg span2"><label>Website</label><input value={biz.website} onChange={e => setBiz(b => ({ ...b, website: e.target.value }))} /></div>
                </div>
              </div>
            </div>
          )}

          {active === 'Custom Fields' && (
            <div className="tw">
              <div className="tw-head"><h3>Lead Custom Fields</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                  <input value={newCF.name} onChange={e => setNewCF({ ...newCF, name: e.target.value })} placeholder="Field Name (e.g. Budget)" style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <select value={newCF.type} onChange={e => setNewCF({ ...newCF, type: e.target.value })} style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                  {newCF.type === 'dropdown' && (
                     <input value={newCF.options} onChange={e => setNewCF({ ...newCF, options: e.target.value })} placeholder="Options (comma separated)" style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  )}
                  <button className="btn btn-primary btn-sm" onClick={addCF}>{editingCFIndex !== null ? 'Update Field' : 'Add Field'}</button>
                  {editingCFIndex !== null && <button className="btn btn-secondary btn-sm" onClick={cancelEditCF}>Cancel</button>}
                </div>
                <table style={{ background: 'var(--bg)', borderRadius: 8, overflow: 'hidden' }}>
                  <thead><tr><th>Field Name</th><th>Type</th><th>Options</th><th>Action</th></tr></thead>
                  <tbody>
                    {customFields.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 14, color: 'var(--muted)' }}>No custom fields defined</td></tr> : customFields.map((cf, i) => (
                      <tr key={i}>
                        <td><strong>{cf.name}</strong></td>
                        <td><span className="badge bg-gray">{cf.type}</span></td>
                        <td>{cf.type === 'dropdown' ? cf.options : '-'}</td>
                        <td style={{ display: 'flex', gap: 6 }}>
                           <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px' }} onClick={() => editCF(i)}>✎ Edit</button>
                           <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px' }} onClick={() => removeItem('customFields', customFields, i)}>Del</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {active === 'Sources' && (
            <div className="tw">
              <div className="tw-head"><h3>Lead Sources</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="New source..." style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addItem('sources', sources, newSource, setNewSource)}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {sources.map((s, i) => (
                    <span key={i} className="badge bg-blue" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px' }}>
                      {s} <span style={{ cursor: 'pointer', color: '#1e40af' }} onClick={() => removeItem('sources', sources, i)}>✕</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'Stages' && (
            <div className="tw">
              <div className="tw-head"><h3>Lead Stages</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={newStage} onChange={e => setNewStage(e.target.value)} placeholder="New stage..." style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addItem('stages', stages, newStage, setNewStage)}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {stages.map((s, i) => (
                    <span key={i} className="badge bg-teal" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px' }}>
                      {s} <span style={{ cursor: 'pointer' }} onClick={() => removeItem('stages', stages, i)}>✕</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'Labels' && (
            <div className="tw">
              <div className="tw-head"><h3>Lead Labels</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="New label..." style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addItem('labels', labels, newLabel, setNewLabel)}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {labels.map((l, i) => (
                    <span key={i} className="badge bg-orange" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px' }}>
                      {l} <span style={{ cursor: 'pointer' }} onClick={() => removeItem('labels', labels, i)}>✕</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'Expense Categories' && (
            <div className="tw">
              <div className="tw-head"><h3>Expense Categories</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={newExpCat} onChange={e => setNewExpCat(e.target.value)} placeholder="New category..." style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addItem('expCats', expCats, newExpCat, setNewExpCat)}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {expCats.map((c, i) => (
                    <span key={i} className="badge bg-gray" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px' }}>
                      {c} <span style={{ cursor: 'pointer' }} onClick={() => removeItem('expCats', expCats, i)}>✕</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'Task Statuses' && (
            <div className="tw">
              <div className="tw-head"><h3>Task Statuses</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={newTaskStatus} onChange={e => setNewTaskStatus(e.target.value)} placeholder="New status..." style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addItem('taskStatuses', taskStatuses, newTaskStatus, setNewTaskStatus)}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {taskStatuses.map((s, i) => (
                    <span key={i} className="badge bg-purple" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px' }}>
                      {s} <span style={{ cursor: 'pointer' }} onClick={() => removeItem('taskStatuses', taskStatuses, i)}>✕</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'SMTP' && (
            <div className="tw">
              <div className="tw-head"><h3>Email / SMTP Settings</h3><button className="btn btn-primary btn-sm" onClick={saveSMTP}>Save</button></div>
              <div style={{ padding: '20px' }}>
                <div className="fgrid">
                  <div className="fg"><label>SMTP Host</label><input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" /></div>
                  <div className="fg"><label>Port</label><select value={smtpPort} onChange={e => setSmtpPort(e.target.value)}><option>587</option><option>465</option><option>25</option></select></div>
                  <div className="fg"><label>Username / Email</label><input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} /></div>
                  <div className="fg"><label>Password</label><input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="App password..." /></div>
                </div>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12, fontSize: 12, marginTop: 8, color: '#92400e' }}>
                  ⚠️ SMTP credentials are stored securely. Use app-specific passwords for Gmail/Outlook.
                </div>
              </div>
            </div>
          )}

          {active === 'WhatsApp' && (
            <div className="tw">
              <div className="tw-head"><h3>WhatsApp Integration</h3><button className="btn btn-primary btn-sm" onClick={saveWA}>Save</button></div>
              <div style={{ padding: '20px' }}>
                <div className="fgrid">
                  <div className="fg span2"><label>WhatsApp API Token</label><input value={waToken} onChange={e => setWaToken(e.target.value)} placeholder="Bearer token from WA Business API" /></div>
                  <div className="fg"><label>From Number</label><input value={waFrom} onChange={e => setWaFrom(e.target.value)} placeholder="+91..." /></div>
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12, fontSize: 12, marginTop: 8, color: '#166534' }}>
                  ✓ Supports WhatsApp Business API. Use Meta's official API for production messaging.
                </div>
              </div>
            </div>
          )}

          {active === 'Reminders' && (
            <div className="tw">
              <div className="tw-head"><h3>Reminder Rules</h3></div>
              <div style={{ padding: '20px' }}>
                {[['AMC Expiry Alert', 'Send reminder before AMC expires', '30'], ['Subscription Due', 'Send payment reminder before due date', '7'], ['Follow-Up Due', 'Notify before follow-up date', '1']].map(([name, desc, days]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                    <div><div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div><div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{desc}</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" defaultValue={days} style={{ width: 55, padding: '6px 8px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>days before</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
