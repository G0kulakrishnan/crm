import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useToast } from '../../context/ToastContext';
import { renderTemplate, sendEmailMock, sendEmail } from '../../utils/messaging';

const SETTING_NAV = ['My Profile', 'Business', 'Finance', 'Billing', 'Custom Fields', 'Sources', 'Stages', 'Labels', 'Product Categories', 'Expense Categories', 'Task Statuses', 'SMTP', 'WhatsApp', 'Reminders'];

const DEFAULT_SOURCES = ['FB Ads', 'Direct', 'Broker', 'Google Ads', 'Referral', 'WhatsApp', 'Website', 'Other'];
const DEFAULT_STAGES = ['New Enquiry', 'Enquiry Contacted', 'Budget Negotiation', 'Advance Paid', 'Won', 'Lost'];
const DEFAULT_LABELS = ['Hot', 'Warm', 'Cold', 'VIP', 'Pending'];
const DEFAULT_CFIELDS = []; // { name: 'Requirement', type: 'text'|'number'|'dropdown', options: 'A,B' }
const DEFAULT_PROD_CATS = ['Electronics', 'Home Appliances', 'Services', 'Furniture', 'General'];
const DEFAULT_EXP_CATS = ['Software', 'Hardware', 'Travel', 'Office', 'Marketing', 'Utilities', 'Salaries', 'Misc'];
const DEFAULT_TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];

export default function Settings({ user, profile, isExpired, initialTab }) {
  const [active, setActive] = useState(initialTab || 'My Profile');
  const [userProfile, setUserProfile] = useState({
    fullName: profile?.fullName || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
  });
  const [biz, setBiz] = useState({
    bizName: profile?.bizName || '', 
    bizEmail: profile?.bizEmail || '',
    bizPhone: profile?.bizPhone || '',
    address: profile?.address || '',
    gstin: profile?.gstin || '', pan: profile?.pan || '',
    website: profile?.website || '',
    logo: profile?.logo || null,
  });
  const [fin, setFin] = useState({
    qPrefix: profile?.qPrefix || 'QUO-',
    qNextNum: profile?.qNextNum || 1,
    qTerms: profile?.qTerms || '1. Valid for 30 days.\n2. 50% advance to start work.',
    qNotes: profile?.qNotes || 'Thank you for your business!',
    iPrefix: profile?.iPrefix || 'INV-',
    iNextNum: profile?.iNextNum || 1,
    iTerms: profile?.iTerms || '1. Please pay within 7 days.\n2. Interest @ 18% for late payment.',
    iNotes: profile?.iNotes || 'Thank you for choosing us!',
    bankName: profile?.bankName || '',
    accountNo: profile?.accountNo || '',
    ifsc: profile?.ifsc || '',
    accHolder: profile?.accHolder || '',
    qrCode: profile?.qrCode || null,
  });
  const [smtpHost, setSmtpHost] = useState(profile?.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(profile?.smtpPort || '587');
  const [smtpUser, setSmtpUser] = useState(profile?.smtpUser || '');
  const [smtpPass, setSmtpPass] = useState(profile?.smtpPass || '');
  const [waToken, setWaToken] = useState(profile?.waToken || '');
  const [waFrom, setWaFrom] = useState(profile?.waFrom || '');
  const [newSource, setNewSource] = useState('');
  const [newStage, setNewStage] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newExpCat, setNewExpCat] = useState('');
  const [newProdCat, setNewProdCat] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('');
  const [newCF, setNewCF] = useState({ name: '', type: 'text', options: '' });
  const [reminders, setReminders] = useState(profile?.reminders || {
    amc: { days: 30, msg: 'Hello {client}, your AMC contract is expiring on {date}. Please contact us for renewal.' },
    sub: { days: 7, msg: 'Hello {client}, your subscription payment of {amount} is due on {date}.' },
    followup: { days: 1, msg: 'Reminder: Follow-up with {client} is scheduled for {date}.' }
  });
  const [editingCFIndex, setEditingCFIndex] = useState(null);
  const toast = useToast();

  const { data } = db.useQuery({ userProfiles: { $: { where: { userId: user.id } } } });
  const profileId = data?.userProfiles?.[0]?.id;
  const sources = data?.userProfiles?.[0]?.sources || DEFAULT_SOURCES;
  const stages = data?.userProfiles?.[0]?.stages || DEFAULT_STAGES;
  const labels = data?.userProfiles?.[0]?.labels || DEFAULT_LABELS;
  const customFields = data?.userProfiles?.[0]?.customFields || DEFAULT_CFIELDS;
  const productCats = data?.userProfiles?.[0]?.productCats || DEFAULT_PROD_CATS;
  const expCats = data?.userProfiles?.[0]?.expCats || DEFAULT_EXP_CATS;
  const taskStatuses = data?.userProfiles?.[0]?.taskStatuses || DEFAULT_TASK_STATUSES;

  const handleFile = (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) return toast('File too large (max 500KB)', 'error');
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
  };

  const saveUserProfile = async () => {
    if (!userProfile.email.includes('@')) return toast('Valid email required', 'error');
    const payload = { ...userProfile, userId: user.id };
    if (profileId) await db.transact(db.tx.userProfiles[profileId].update(payload));
    toast('Profile updated!', 'success');
  };

  const saveBiz = async () => {
    const payload = { ...biz, userId: user.id };
    if (profileId) await db.transact(db.tx.userProfiles[profileId].update(payload));
    toast('Business details saved!', 'success');
  };

  const saveFin = async () => {
    const payload = { ...fin, userId: user.id };
    if (profileId) await db.transact(db.tx.userProfiles[profileId].update(payload));
    toast('Finance settings saved!', 'success');
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
    const payload = { smtpHost, smtpPort, smtpUser, smtpPass, smtpSender: smtpUser, userId: user.id };
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update(payload)); }
    toast('SMTP settings saved!', 'success');
  };

  const testSMTP = async () => {
    if (!smtpHost || !smtpUser || !smtpPass) return toast('Please save SMTP settings first', 'error');
    const testEmail = prompt('Recipient Email:', userProfile.email);
    if (!testEmail) return;
    const testSubject = prompt('Email Subject:', 'TechCRM SMTP Test');
    if (!testSubject) return;
    const testBody = prompt('Email Content:', 'This is a test email sent directly via your SMTP server.');
    if (!testBody) return;

    try {
      toast('Sending test email via SMTP...', 'info');
      const smtpConfig = { smtpHost, smtpPort, smtpUser, smtpPass, bizName: biz.bizName };
      const result = await sendEmail(testEmail, testSubject, testBody, smtpConfig, user.id);
      
      if (result === 'OK') {
        toast('Test email sent successfully! 🚀', 'success');
      } else {
        toast(`Error: ${result}`, 'warning');
      }
    } catch (e) {
      console.error('SMTP Test Error:', e);
      toast(`Failed: ${e.message}`, 'error');
    }
  };

  const saveWA = async () => {
    const payload = { waToken, waFrom, userId: user.id };
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update(payload)); }
    toast('WhatsApp settings saved!', 'success');
  };

  const saveReminders = async () => {
    const payload = { reminders, userId: user.id };
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update(payload)); }
    toast('Reminder rules updated!', 'success');
  };

  const testTemplate = (key) => {
    const msg = renderTemplate(reminders[key].msg, {
      client: 'Sample Client',
      date: new Date().toLocaleDateString(),
      amount: 1499,
      bizName: biz.bizName || 'My Business'
    });
    alert(`📢 Template Preview:\n\n${msg}\n\n(This is how your automated message will look)`);
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
          {active === 'Billing' && (
            <div>
              <div className="sh" style={{ marginBottom: 20 }}>
                <div>
                  <h3>Current Plan</h3>
                  <div className="sub">Manage your current plan and upgrades</div>
                </div>
                {isExpired && <span className="badge bg-red" style={{ padding: '4px 12px', fontSize: 11 }}>EXPIRED</span>}
              </div>

              <div className="stat-grid" style={{ marginBottom: 30 }}>
                <div className="stat-card sc-blue">
                  <div className="lbl">Current Plan</div>
                  <div className="val">{profile?.plan || 'Free Trial'}</div>
                </div>
                <div className="stat-card sc-purple">
                  <div className="lbl">Valid Until</div>
                  <div className="val" style={{ fontSize: 16 }}>{profile?.planExpiry ? new Date(profile.planExpiry).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>

              <h4 style={{ marginBottom: 15 }}>Upgrade Options</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 15 }}>
                {[
                  { name: 'Trial', duration: 7, price: 0, desc: 'Perfect for exploring the CRM' },
                  { name: 'Premium', duration: 30, price: 2999, desc: 'For growing businesses' },
                  { name: 'START-UP', duration: 365, price: 24999, desc: 'Cost-effective annual plan' },
                  { name: 'Premium Pro', duration: 365, price: 29999, desc: 'Unlimited power for teams' },
                ].map(p => (
                  <div key={p.name} className={`plan-card ${profile?.plan === p.name ? 'featured' : ''}`} style={{ border: profile?.plan === p.name ? '2px solid var(--accent)' : '1px solid var(--border)', padding: 20, borderRadius: 12, position: 'relative' }}>
                    {profile?.plan === p.name && <div style={{ position: 'absolute', top: -10, right: 10, background: 'var(--accent)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>ACTIVE</div>}
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>{p.desc}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, margin: '10px 0', color: 'var(--accent)' }}>
                      {p.price === 0 ? 'Free' : `₹${p.price.toLocaleString()}`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 15 }}>per {p.duration} days</div>
                    
                    {profile?.plan === p.name ? (
                      <button className="btn btn-primary" style={{ width: '100%', opacity: 0.7 }} disabled>Current Plan</button>
                    ) : (
                      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => toast(`Contact Admin to upgrade to ${p.name}`, 'info')}>Upgrade Now</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'My Profile' && (
            <div className="tw">
              <div className="tw-head"><h3>My Profile</h3><button className="btn btn-primary btn-sm" onClick={saveUserProfile}>Save Profile</button></div>
              <div style={{ padding: '20px' }}>
                <div className="sub" style={{ marginBottom: 20 }}>Your personal contact information used for login and account management.</div>
                <div className="fgrid">
                  <div className="fg span2"><label>Full Name</label><input value={userProfile.fullName} onChange={e => setUserProfile(p => ({ ...p, fullName: e.target.value }))} /></div>
                  <div className="fg"><label>Personal Email</label><input type="email" value={userProfile.email} onChange={e => setUserProfile(p => ({ ...p, email: e.target.value }))} /></div>
                  <div className="fg"><label>Personal Phone</label><input value={userProfile.phone} onChange={e => setUserProfile(p => ({ ...p, phone: e.target.value }))} /></div>
                </div>
              </div>
            </div>
          )}

          {active === 'Business' && (
            <div className="tw">
              <div className="tw-head"><h3>Business Profile</h3><button className="btn btn-primary btn-sm" onClick={saveBiz}>Save Business</button></div>
              <div style={{ padding: '20px' }}>
                <div className="sub" style={{ marginBottom: 20 }}>Public business information used for invoices and professional documents.</div>
                <div className="fgrid">
                  <div className="fg span2"><label>Business Name</label><input value={biz.bizName} onChange={e => setBiz(b => ({ ...b, bizName: e.target.value }))} /></div>
                  <div className="fg span2"><label>Business Address</label><textarea value={biz.address} onChange={e => setBiz(b => ({ ...b, address: e.target.value }))} style={{ minHeight: 60 }} /></div>
                  <div className="fg"><label>Official Email</label><input type="email" value={biz.bizEmail} onChange={e => setBiz(b => ({ ...b, bizEmail: e.target.value }))} /></div>
                  <div className="fg"><label>Official Phone</label><input value={biz.bizPhone} onChange={e => setBiz(b => ({ ...b, bizPhone: e.target.value }))} /></div>
                  <div className="fg"><label>GSTIN</label><input value={biz.gstin} onChange={e => setBiz(b => ({ ...b, gstin: e.target.value }))} placeholder="22AAAAA0000A1Z5" /></div>
                  <div className="fg"><label>PAN</label><input value={biz.pan} onChange={e => setBiz(b => ({ ...b, pan: e.target.value }))} placeholder="AAAPZ1234C" /></div>
                  <div className="fg span2"><label>Website</label><input value={biz.website} onChange={e => setBiz(b => ({ ...b, website: e.target.value }))} /></div>
                  <div className="fg span2">
                    <label>Business Logo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 5 }}>
                      {biz.logo && <img src={biz.logo} alt="Logo" style={{ height: 60, width: 60, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 8 }} />}
                      <div style={{ flex: 1 }}>
                        <input type="file" accept="image/*" onChange={e => handleFile(e, (res) => setBiz(b => ({ ...b, logo: res })))} style={{ fontSize: 12 }} />
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Recommended: Square PNG/JPG, Max 500KB.</div>
                      </div>
                      {biz.logo && <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => setBiz(b => ({ ...b, logo: null }))}>Remove</button>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {active === 'Finance' && (
            <div className="tw">
              <div className="tw-head"><h3>Quotation & Invoice Settings</h3><button className="btn btn-primary btn-sm" onClick={saveFin}>Save Settings</button></div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                  {/* Quotations */}
                  <div>
                    <h4 style={{ marginBottom: 15, color: 'var(--accent)' }}>Quotations</h4>
                    <div className="fgrid">
                      <div className="fg"><label>Prefix</label><input value={fin.qPrefix} onChange={e => setFin(f => ({ ...f, qPrefix: e.target.value }))} /></div>
                      <div className="fg"><label>Starting Number</label><input type="number" value={fin.qNextNum} onChange={e => setFin(f => ({ ...f, qNextNum: parseInt(e.target.value) || 1 }))} /></div>
                      <div className="fg span2"><label>Default Terms & Conditions</label><textarea value={fin.qTerms} onChange={e => setFin(f => ({ ...f, qTerms: e.target.value }))} style={{ minHeight: 80 }} /></div>
                      <div className="fg span2"><label>Default Notes</label><textarea value={fin.qNotes} onChange={e => setFin(f => ({ ...f, qNotes: e.target.value }))} style={{ minHeight: 60 }} /></div>
                    </div>
                  </div>

                  {/* Invoices */}
                  <div>
                    <h4 style={{ marginBottom: 15, color: 'var(--green)' }}>Invoices</h4>
                    <div className="fgrid">
                      <div className="fg"><label>Prefix</label><input value={fin.iPrefix} onChange={e => setFin(f => ({ ...f, iPrefix: e.target.value }))} /></div>
                      <div className="fg"><label>Starting Number</label><input type="number" value={fin.iNextNum} onChange={e => setFin(f => ({ ...f, iNextNum: parseInt(e.target.value) || 1 }))} /></div>
                      <div className="fg span2"><label>Default Terms & Conditions</label><textarea value={fin.iTerms} onChange={e => setFin(f => ({ ...f, iTerms: e.target.value }))} style={{ minHeight: 80 }} /></div>
                      <div className="fg span2"><label>Default Notes</label><textarea value={fin.iNotes} onChange={e => setFin(f => ({ ...f, iNotes: e.target.value }))} style={{ minHeight: 60 }} /></div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 30, paddingTop: 20, borderTop: '2px dashed var(--border)' }}>
                  <h4 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Payment & Bank Details
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 30 }}>
                    <div className="fgrid">
                      <div className="fg span2"><label>Account Holder Name</label><input value={fin.accHolder} onChange={e => setFin(f => ({ ...f, accHolder: e.target.value }))} /></div>
                      <div className="fg"><label>Bank Name</label><input value={fin.bankName} onChange={e => setFin(f => ({ ...f, bankName: e.target.value }))} /></div>
                      <div className="fg"><label>Account Number</label><input value={fin.accountNo} onChange={e => setFin(f => ({ ...f, accountNo: e.target.value }))} /></div>
                      <div className="fg"><label>IFSC Code</label><input value={fin.ifsc} onChange={e => setFin(f => ({ ...f, ifsc: e.target.value }))} /></div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block' }}>Payment QR Code</label>
                      <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 15, textAlign: 'center', background: 'var(--bg-soft)' }}>
                        {fin.qrCode ? (
                          <div style={{ position: 'relative' }}>
                            <img src={fin.qrCode} alt="QR" style={{ width: '100%', maxWidth: 150, borderRadius: 8 }} />
                            <button className="btn btn-sm" style={{ position: 'absolute', top: -10, right: -10, background: '#fee2e2', color: '#991b1b', padding: '2px 6px' }} onClick={() => setFin(f => ({ ...f, qrCode: null }))}>✕</button>
                          </div>
                        ) : (
                          <div style={{ padding: '10px 0' }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>📱</div>
                            <input type="file" accept="image/*" onChange={e => handleFile(e, (res) => setFin(f => ({ ...f, qrCode: res })))} style={{ fontSize: 11, width: '100%' }} />
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>Upload UPI/Payment QR</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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

          {active === 'Product Categories' && (
            <div className="tw">
              <div className="tw-head"><h3>Product Categories</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={newProdCat} onChange={e => setNewProdCat(e.target.value)} placeholder="New product category..." style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addItem('productCats', productCats, newProdCat, setNewProdCat)}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {productCats.map((c, i) => (
                    <span key={i} className="badge bg-blue" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px' }}>
                      {c} <span style={{ cursor: 'pointer' }} onClick={() => removeItem('productCats', productCats, i)}>✕</span>
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
              <div className="tw-head">
                <h3>Email Settings (Direct SMTP)</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                   <button className="btn btn-secondary btn-sm" onClick={testSMTP}>Test Connection</button>
                   <button className="btn btn-primary btn-sm" onClick={saveSMTP}>Save</button>
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <div className="sub" style={{ marginBottom: 15 }}>
                  Enter your SMTP server details below. Works with Gmail, Outlook, Hostinger, or any SMTP provider.
                </div>
                <div className="fgrid">
                  <div className="fg"><label>SMTP Host</label><input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="e.g., smtp.gmail.com" /></div>
                  <div className="fg"><label>SMTP Port</label><input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587 or 465" /></div>
                  <div className="fg"><label>Email / Username</label><input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="your@email.com" /></div>
                  <div className="fg"><label>Password / App Password</label><input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="••••••••" /></div>
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12, fontSize: 12, marginTop: 12, color: '#166534' }}>
                  💡 <strong>Gmail Users:</strong> Use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 600 }}>App Password</a> (not your main password). Set Host to <code>smtp.gmail.com</code>, Port to <code>587</code>.
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
              <div className="tw-head"><h3>Reminder Rules & Templates</h3><button className="btn btn-primary btn-sm" onClick={saveReminders}>Save Rules</button></div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {[
                    { key: 'amc', name: 'AMC Expiry Alert', desc: 'Alert sent before AMC contracts expire.' },
                    { key: 'sub', name: 'Subscription Due', desc: 'Alert sent before subscription payments are due.' },
                    { key: 'followup', name: 'Follow-Up Due', desc: 'Alert sent before a lead follow-up is scheduled.' }
                  ].map(rule => (
                    <div key={rule.key} style={{ paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{rule.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{rule.desc}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="number" value={reminders[rule.key].days} onChange={e => setReminders(r => ({ ...r, [rule.key]: { ...r[rule.key], days: parseInt(e.target.value) || 0 } }))} style={{ width: 60, padding: '6px 8px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, textAlign: 'center' }} />
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>days before</span>
                          </div>
                          <button className="btn btn-secondary btn-sm" onClick={() => testTemplate(rule.key)} style={{ padding: '4px 10px' }}>👁 Test</button>
                        </div>
                      </div>
                      <div className="fg">
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>Message Template</label>
                        <textarea 
                          value={reminders[rule.key].msg} 
                          onChange={e => setReminders(r => ({ ...r, [rule.key]: { ...r[rule.key], msg: e.target.value } }))} 
                          style={{ minHeight: 60, fontSize: 13, lineHeight: 1.5 }}
                          placeholder="Type your message template here..."
                        />
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                          Placeholders: <code>{`{client}`}</code>, <code>{`{date}`}</code> {rule.key === 'sub' && <>, <code>{`{amount}`}</code></>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
