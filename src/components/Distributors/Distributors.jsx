import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useToast } from '../../context/ToastContext';
import { fmtD } from '../../utils/helpers';

export default function Distributors({ user, ownerId, perms }) {
  const [tab, setTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [approveModal, setApproveModal] = useState(null);
  const [commission, setCommission] = useState('');
  const [password, setPassword] = useState('');
  const [parentDist, setParentDist] = useState('');
  const [detailsModal, setDetailsModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [onboardModal, setOnboardModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [onboardForm, setOnboardForm] = useState({ name: '', email: '', phone: '', companyName: '', role: 'Retailer', commission: 0, password: '', parentDistributorId: '' });
  const [settingsForm, setSettingsForm] = useState({ reqCompany: 'Optional', reqAddress: 'Optional', reqTax: 'Optional', reqNotes: 'Optional', customFields: [] });
  const toast = useToast();

  const { data, isLoading } = db.useQuery({
    partnerApplications: { $: { where: { userId: ownerId } } },
    partnerCommissions: { $: { where: { userId: ownerId } } },
    products: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } }
  });
  const commissions = useMemo(() => data?.partnerCommissions || [], [data?.partnerCommissions]);
  const products = useMemo(() => data?.products || [], [data?.products]);
  const profile = data?.userProfiles?.[0] || {};

  const applications = useMemo(() => data?.partnerApplications || [], [data?.partnerApplications]);
  const availableDistributors = useMemo(() => applications.filter(a => a.status === 'Approved' && a.role === 'Distributor'), [applications]);
  
  const filtered = useMemo(() => {
    return applications
      .filter(a => a.status === tab)
      .filter(a => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (a.name || '').toLowerCase().includes(s) || 
               (a.email || '').toLowerCase().includes(s) || 
               (a.companyName || '').toLowerCase().includes(s);
      })
      .sort((a, b) => b.appliedAt - a.appliedAt);
  }, [applications, tab, search]);

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!onboardForm.password || onboardForm.password.length < 6) return toast('Password min 6 chars', 'error');
    if (!onboardForm.name || !onboardForm.email || !onboardForm.phone) return toast('Name, Email, Phone required', 'error');
    
    setSubmitting(true);
    try {
      const pId = id();
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-partner-password',
          email: onboardForm.email.trim(),
          password: onboardForm.password,
          ownerUserId: ownerId,
          partnerId: pId
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create partner login');

      await db.transact(
        db.tx.partnerApplications[pId].update({
          name: onboardForm.name.trim(),
          email: onboardForm.email.trim(),
          phone: onboardForm.phone.trim(),
          companyName: onboardForm.companyName.trim(),
          role: onboardForm.role,
          parentDistributorId: onboardForm.role === 'Retailer' ? (onboardForm.parentDistributorId || null) : null,
          commission: parseFloat(onboardForm.commission) || 0,
          status: 'Approved',
          appliedAt: Date.now(),
          approvedAt: Date.now(),
          userId: ownerId
        }),
        db.tx.activityLogs[db.id()].update({
          entityId: pId, entityType: 'partner',
          text: `Manually onboarded Partner ${onboardForm.name} as ${onboardForm.role}.`,
          userId: ownerId, actorId: user.id, userName: user.email, createdAt: Date.now()
        })
      );

      toast('Partner onboarded successfully!', 'success');
      setOnboardModal(false);
      setOnboardForm({ name: '', email: '', phone: '', companyName: '', role: 'Retailer', commission: 0, password: '' });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    if (!profile.id) return toast('Profile not found', 'error');
    setSubmitting(true);
    try {
      await db.transact(
        db.tx.userProfiles[profile.id].update({
          partnerFormConfig: settingsForm
        })
      );
      toast('Form settings saved!', 'success');
      setSettingsModal(false);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openSettings = () => {
    const ex = profile?.partnerFormConfig || { reqCompany: 'Optional', reqAddress: 'Optional', reqTax: 'Optional', reqNotes: 'Optional', customFields: [] };
    if (!ex.customFields) ex.customFields = [];
    setSettingsForm(ex);
    setSettingsModal(true);
  };

  if (isLoading) return <div className="p-xl">Loading...</div>;

  const handleApprove = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) return toast('Password must be at least 6 characters', 'error');
    if (!commission) return toast('Please specify a default commission percentage', 'error');
    
    setSubmitting(true);
    try {
      // 1. Create the partner auth credential via API
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-partner-password',
          email: approveModal.email.trim(),
          password: password,
          ownerUserId: ownerId,
          partnerId: approveModal.id
        })
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create partner login');

      // 2. Update the application status in DB
      await db.transact(
        db.tx.partnerApplications[approveModal.id].update({
          status: 'Approved',
          commission: parseFloat(commission) || 0,
          parentDistributorId: approveModal.role === 'Retailer' ? (parentDist || null) : null,
          approvedAt: Date.now()
        }),
        db.tx.activityLogs[db.id()].update({
          entityId: approveModal.id,
          entityType: 'partner',
          text: `Partner application approved as ${approveModal.role} with ${commission}% commision.`,
          userId: ownerId,
          actorId: user.id,
          userName: user.email,
          createdAt: Date.now()
        })
      );

      toast('Partner approved successfully!', 'success');
      setApproveModal(null);
      setPassword('');
      setCommission('');
      setParentDist('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (appId) => {
    if (!confirm('Are you sure you want to reject this application?')) return;
    await db.transact(
      db.tx.partnerApplications[appId].update({ status: 'Rejected', rejectedAt: Date.now() })
    );
    toast('Application rejected.', 'error');
  };

  return (
    <div>
      <div className="sh" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2>Channel Partners</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Control center for your distributor and retailer network.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', fontSize: 13, color: '#475569', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {`${window.location.origin}/${profile?.slug || 'my_business'}/partner/register`}
            </div>
            <button className="btn btn-secondary btn-sm" style={{ border: 'none', borderRadius: 0, borderLeft: '1px solid #e2e8f0', background: '#fff', padding: '6px 12px' }} onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/${profile?.slug || 'my_business'}/partner/register`);
              toast('Link copied!', 'success');
            }}>
              Copy
            </button>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={openSettings}>⚙️ Form Config</button>
          <button className="btn btn-primary btn-sm" onClick={() => {
             setOnboardForm(p => ({ ...p, password: Math.random().toString(36).slice(-8) }));
             setOnboardModal(true);
          }}>➕ Onboard Partner</button>
        </div>
      </div>
      
      <div className="tabs">
        {['Pending', 'Approved', 'Rejected', 'Payouts', 'Products', 'Hierarchy'].map(t => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t} {!['Payouts', 'Products', 'Hierarchy'].includes(t) && `(${applications.filter(a => a.status === t).length})`}
          </div>
        ))}
      </div>

      <div className="tw">
        <div className="tw-head">
          <h3>{tab === 'Payouts' ? 'Commission Payouts' : tab === 'Products' ? 'Partner Products' : tab === 'Hierarchy' ? 'Network Hierarchy' : `${tab} Partners`}</h3>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="tw-scroll">
          {tab === 'Payouts' ? (
            <PayoutsView commissions={commissions} applications={applications} search={search} ownerId={ownerId} user={user} toast={toast} />
          ) : tab === 'Products' ? (
            <ProductsView products={products} search={search} />
          ) : tab === 'Hierarchy' ? (
            <HierarchyView applications={applications} availableDistributors={availableDistributors} ownerId={ownerId} user={user} toast={toast} />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Contact</th>
                  {tab === 'Approved' && <th>Commission</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No {tab.toLowerCase()} applications.</td></tr>
                ) : filtered.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontSize: 12 }}>{fmtD(a.appliedAt)}</td>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td>{a.companyName || '-'}</td>
                    <td><span className="badge" style={{ background: a.role === 'Distributor' ? '#ede9fe' : '#e0f2fe', color: a.role === 'Distributor' ? '#6d28d9' : '#0369a1' }}>{a.role}</span></td>
                    <td>
                      <div style={{ fontSize: 12 }}>{a.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.phone}</div>
                    </td>
                    {tab === 'Approved' && <td>{a.commission ? `${a.commission}%` : '-'}</td>}
                    <td>
                      {tab === 'Pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setDetailsModal(a)}>View</button>
                          <button className="btn btn-primary btn-sm" onClick={() => {
                            setApproveModal(a);
                            setPassword(Math.random().toString(36).slice(-8)); 
                          }}>Approve</button>
                          <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleReject(a.id)}>Reject</button>
                        </div>
                      )}
                      {tab === 'Approved' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setDetailsModal(a)}>View Details</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {approveModal && (
        <div className="mo open">
          <div className="mo-box" style={{ width: 420 }}>
            <div className="mo-head">
              <h3>Approve Partner</h3>
              <button className="btn-icon" onClick={() => setApproveModal(null)}>✕</button>
            </div>
            <div className="mo-body" style={{ padding: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                You are approving <strong>{approveModal.name}</strong> as a <strong>{approveModal.role}</strong>. 
                Please set their commission and provide a secure password they can use to log in.
              </p>
              
              <form onSubmit={handleApprove}>
                {approveModal.role === 'Retailer' && (
                  <div className="form-group" style={{ marginBottom: 15 }}>
                    <label>Assign to Parent Distributor (Optional)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select 
                        value={parentDist} 
                        onChange={e => setParentDist(e.target.value)}
                        style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8 }}
                      >
                        <option value="">-- No Parent (Direct) --</option>
                        {availableDistributors.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.companyName || 'No Company'})</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>This retailer will be mapped under the selected distributor in your hierarchy.</div>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 15 }}>
                  <label>Commission Percentage (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={commission} 
                    onChange={e => setCommission(e.target.value)} 
                    placeholder="e.g. 15" 
                    required 
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8 }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>They will automatically receive this cut from all sales they secure.</div>
                </div>

                <div className="form-group" style={{ marginBottom: 15 }}>
                  <label>Partner Login Password</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                      type="text" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn-secondary" onClick={() => setPassword(Math.random().toString(36).slice(-8))}>Generate</button>
                  </div>
                  <div style={{ fontSize: 11, color: '#ca8a04', marginTop: 4 }}>Note: You must securely share this password to them. They will log in using their email ({approveModal.email}).</div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setApproveModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Approving...' : 'Confirm Approval'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {settingsModal && (
        <div className="mo open">
          <div className="mo-box" style={{ width: 460 }}>
            <div className="mo-head">
              <h3>Public Form Config</h3>
              <button className="btn-icon" onClick={() => setSettingsModal(null)}>✕</button>
            </div>
            <div className="mo-body" style={{ padding: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                Configure the fields shown to users dynamically on your public registration page. Name, Email, Phone, and Role are permanently mandatory.
              </p>
              
              <form onSubmit={handleSettingsSave}>
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ marginBottom: 12, color: '#334155', fontSize: 14 }}>Standard Fields</h4>
                  {['Company', 'Address', 'Tax', 'Notes'].map(field => {
                    const key = `req${field}`;
                    return (
                      <div className="form-group" style={{ marginBottom: 10 }} key={field}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{field === 'Tax' ? 'Tax ID' : field} Field</span>
                          <select 
                            value={settingsForm[key]} 
                            onChange={e => setSettingsForm(p => ({ ...p, [key]: e.target.value }))}
                            style={{ width: 140, padding: '4px 8px', fontSize: 13 }}
                          >
                            <option value="Hidden">Hidden</option>
                            <option value="Optional">Optional</option>
                            <option value="Required">Required</option>
                          </select>
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginBottom: 20, borderTop: '1px solid #e2e8f0', paddingTop: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h4 style={{ margin: 0, color: '#334155', fontSize: 14 }}>Custom Fields</h4>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSettingsForm(p => ({ ...p, customFields: [...p.customFields, { id: id(), label: '', type: 'Text', required: false }] }))} style={{ fontSize: 12, padding: '4px 8px' }}>
                      ➕ Add Field
                    </button>
                  </div>
                  
                  {settingsForm.customFields.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}>No custom fields added yet. Need more data? Add a field here!</p>
                  ) : (
                    settingsForm.customFields.map((cf, idx) => (
                      <div key={cf.id} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center', background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <input 
                          type="text" 
                          placeholder="Field Label (e.g. Website URL)" 
                          value={cf.label}
                          onChange={e => {
                            const nf = [...settingsForm.customFields];
                            nf[idx].label = e.target.value;
                            setSettingsForm({ ...settingsForm, customFields: nf });
                          }}
                          style={{ flex: 1, padding: '6px 8px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 4 }}
                          required
                        />
                        <select 
                          value={cf.type}
                          onChange={e => {
                            const nf = [...settingsForm.customFields];
                            nf[idx].type = e.target.value;
                            setSettingsForm({ ...settingsForm, customFields: nf });
                          }}
                          style={{ padding: '6px 8px', fontSize: 13, width: 90, border: '1px solid #cbd5e1', borderRadius: 4 }}
                        >
                          <option value="Text">Text</option>
                          <option value="Number">Number</option>
                          <option value="Date">Date</option>
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer', margin: 0 }}>
                          <input 
                            type="checkbox" 
                            checked={cf.required}
                            onChange={e => {
                              const nf = [...settingsForm.customFields];
                              nf[idx].required = e.target.checked;
                              setSettingsForm({ ...settingsForm, customFields: nf });
                            }}
                          /> Req.
                        </label>
                        <button type="button" onClick={() => {
                          const nf = settingsForm.customFields.filter((_, i) => i !== idx);
                          setSettingsForm({ ...settingsForm, customFields: nf });
                        }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: '0 4px' }} title="Remove Field">🗑️</button>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSettingsModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {onboardModal && (
        <div className="mo open">
          <div className="mo-box" style={{ width: 500 }}>
            <div className="mo-head">
              <h3>Onboard Partner</h3>
              <button className="btn-icon" onClick={() => setOnboardModal(false)}>✕</button>
            </div>
            <div className="mo-body" style={{ padding: 20, maxHeight: '80vh', overflow: 'auto' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                Manually register a partner. This bypasses the public form and instantly adds them to your approved list.
              </p>
              
              <form onSubmit={handleOnboardSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input type="text" required value={onboardForm.name} onChange={e => setOnboardForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Role *</label>
                    <select required value={onboardForm.role} onChange={e => setOnboardForm(p => ({ ...p, role: e.target.value }))}>
                      <option value="Distributor">Distributor</option>
                      <option value="Retailer">Retailer</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                  <div className="form-group">
                    <label>Email *</label>
                    <input type="email" required value={onboardForm.email} onChange={e => setOnboardForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Phone *</label>
                    <input type="tel" required value={onboardForm.phone} onChange={e => setOnboardForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 15 }}>
                  <label>Company Name</label>
                  <input type="text" value={onboardForm.companyName} onChange={e => setOnboardForm(p => ({ ...p, companyName: e.target.value }))} />
                </div>

                <div className="form-group" style={{ marginBottom: 15 }}>
                  <label>Starting Commission (%) *</label>
                  <input type="number" step="0.1" required value={onboardForm.commission} onChange={e => setOnboardForm(p => ({ ...p, commission: e.target.value }))} />
                </div>

                {onboardForm.role === 'Retailer' && (
                  <div className="form-group" style={{ marginBottom: 15 }}>
                    <label>Assign to Parent Distributor (Optional)</label>
                    <select value={onboardForm.parentDistributorId} onChange={e => setOnboardForm(p => ({ ...p, parentDistributorId: e.target.value }))}>
                      <option value="">-- No Parent (Direct) --</option>
                      {availableDistributors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.companyName || 'No Company'})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 15 }}>
                  <label>Initial Login Password *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" required value={onboardForm.password} onChange={e => setOnboardForm(p => ({ ...p, password: e.target.value }))} style={{ flex: 1 }} />
                    <button type="button" className="btn btn-secondary" onClick={() => setOnboardForm(p => ({ ...p, password: Math.random().toString(36).slice(-8) }))}>Generate</button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setOnboardModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Partner'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {detailsModal && (
        <div className="mo open">
          <div className="mo-box" style={{ width: 500 }}>
            <div className="mo-head">
              <h3>Partner Details</h3>
              <button className="btn-icon" onClick={() => setDetailsModal(null)}>✕</button>
            </div>
            <div className="mo-body" style={{ padding: 25, maxHeight: '80vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
                <div>
                   <h2 style={{ margin: 0 }}>{detailsModal.name}</h2>
                   <div className="badge" style={{ background: detailsModal.role === 'Distributor' ? '#ede9fe' : '#e0f2fe', color: detailsModal.role === 'Distributor' ? '#6d28d9' : '#0369a1', marginTop: 8 }}>{detailsModal.role}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: 13, color: 'var(--muted)' }}>Status</div>
                   <div style={{ fontWeight: 700, color: detailsModal.status === 'Approved' ? '#16a34a' : detailsModal.status === 'Rejected' ? '#dc2626' : '#ca8a04' }}>{detailsModal.status}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 25 }}>
                <div>
                   <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Email Address</label>
                   <div style={{ fontSize: 14 }}>{detailsModal.email}</div>
                </div>
                <div>
                   <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Phone Number</label>
                   <div style={{ fontSize: 14 }}>{detailsModal.phone}</div>
                </div>
                <div>
                   <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Company Name</label>
                   <div style={{ fontSize: 14 }}>{detailsModal.companyName || '-'}</div>
                </div>
                <div>
                   <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Tax ID / GSTIN</label>
                   <div style={{ fontSize: 14 }}>{detailsModal.taxId || '-'}</div>
                </div>
              </div>

              <div style={{ marginBottom: 25 }}>
                 <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Business Address</label>
                 <div style={{ fontSize: 14, background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 4, border: '1px solid #e2e8f0' }}>{detailsModal.address || 'No address provided.'}</div>
              </div>

              {((profile?.partnerFormConfig?.customFields || []).length > 0) && (
                <div style={{ marginBottom: 25 }}>
                   <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 10 }}>Additional Form Data</label>
                   <div style={{ background: '#f1f5f9', padding: 15, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      {profile.partnerFormConfig.customFields.map(cf => (
                        <div key={cf.id} style={{ marginBottom: 12 }}>
                           <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{cf.label}</div>
                           <div style={{ fontSize: 14, color: '#1e293b' }}>{detailsModal.customData?.[cf.id] || <em style={{ color: '#94a3b8' }}>No answer</em>}</div>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              <div style={{ marginBottom: 25 }}>
                 <label style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Initial Notes</label>
                 <div style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>{detailsModal.notes || '-'}</div>
              </div>

              <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                 <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDetailsModal(null)}>Close</button>
                 {detailsModal.status === 'Pending' && (
                   <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                     setDetailsModal(null);
                     setApproveModal(detailsModal);
                     setPassword(Math.random().toString(36).slice(-8)); 
                   }}>Proceed to Approve</button>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PayoutsView({ commissions, applications, search, ownerId, user, toast }) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const records = useMemo(() => {
    return commissions.map(c => {
      const p = applications.find(a => a.id === c.partnerId);
      return { ...c, partnerName: p?.name || 'Unknown', partnerCompany: p?.companyName || '' };
    }).filter(c => {
      if (!search) return true;
      const s = search.toLowerCase();
      return c.partnerName.toLowerCase().includes(s) || 
             c.clientName?.toLowerCase().includes(s) || 
             c.invoiceNo?.toLowerCase().includes(s) || 
             c.status?.toLowerCase().includes(s);
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [commissions, applications, search]);

  const handleMarkPaid = async () => {
    if (selectedIds.size === 0) return toast('Select commissions to mark as paid', 'error');
    if (!confirm(`Mark ${selectedIds.size} commissions as Paid?`)) return;

    try {
      const txs = [...selectedIds].map(id => 
        db.tx.partnerCommissions[id].update({
          status: 'Paid',
          paidAt: Date.now(),
          updatedAt: Date.now()
        })
      );
      // Batch execute in 25s
      for (let i = 0; i < txs.length; i += 25) {
        await db.transact(txs.slice(i, i + 25));
      }
      toast(`Marked ${selectedIds.size} commissions as Paid.`, 'success');
      setSelectedIds(new Set());
    } catch (e) {
      toast('Failed to update: ' + e.message, 'error');
    }
  };

  const toggleSelect = (id, stat) => {
    if (stat !== 'Pending Payout') return; // only allow paying ones that are ready
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <>
      {selectedIds.size > 0 && (
        <div style={{ background: '#f0fdf4', padding: '10px 16px', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><strong style={{ color: '#166534' }}>{selectedIds.size}</strong> pending payouts selected</div>
          <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff' }} onClick={handleMarkPaid}>💸 Mark as Paid</button>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th style={{ width: 40 }}></th>
            <th>Updated</th>
            <th>Partner</th>
            <th>Invoice</th>
            <th>Client</th>
            <th>Amount Earned</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No commissions recorded yet.</td></tr>
          ) : records.map(c => (
            <tr key={c.id}>
              <td>
                <input 
                  type="checkbox" 
                  checked={selectedIds.has(c.id)} 
                  onChange={() => toggleSelect(c.id, c.status)} 
                  disabled={c.status !== 'Pending Payout'} 
                />
              </td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtD(c.updatedAt || c.createdAt)}</td>
              <td>
                <div style={{ fontWeight: 600 }}>{c.partnerName}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.partnerCompany}</div>
              </td>
              <td><span className="badge bg-gray">{c.invoiceNo}</span></td>
              <td style={{ fontSize: 13 }}>{c.clientName}</td>
              <td style={{ fontWeight: 700 }}>₹{(c.amount || 0).toLocaleString()}</td>
              <td>
                {c.status === 'Paid' ? (
                  <span className="badge bg-green">Paid</span>
                ) : c.status === 'Pending Payout' ? (
                  <span className="badge" style={{ background: '#fef08a', color: '#854d0e' }}>Ready to Pay</span>
                ) : (
                  <span className="badge bg-gray" title="Waiting for client to pay the invoice">Awaiting Client Val</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ProductsView({ products, search }) {
  const partnerProducts = useMemo(() => {
    return products.filter(p => p.isPartnerAvailable)
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  return (
    <table>
      <thead>
        <tr>
          <th>Product Name</th>
          <th>Category</th>
          <th>Stock</th>
          <th>Price Setting</th>
          <th>Visibility</th>
        </tr>
      </thead>
      <tbody>
        {partnerProducts.length === 0 ? (
          <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No products listed for partners.</td></tr>
        ) : partnerProducts.map(p => (
          <tr key={p.id}>
            <td style={{ fontWeight: 600 }}>{p.name}</td>
            <td>{p.category || '-'}</td>
            <td>{p.trackStock ? p.stock : 'N/A'}</td>
            <td>Hidden (Commission based)</td>
            <td><span className="badge bg-green">Visible in Portal</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HierarchyView({ applications, availableDistributors, ownerId, user, toast }) {
  const [editingRetailer, setEditingRetailer] = useState(null);
  const [newParentId, setNewParentId] = useState('');
  const [saving, setSaving] = useState(false);

  const distributors = useMemo(() => applications.filter(a => a.status === 'Approved' && a.role === 'Distributor'), [applications]);
  const retailers = useMemo(() => applications.filter(a => a.status === 'Approved' && a.role === 'Retailer'), [applications]);

  const tree = useMemo(() => {
    return distributors.map(d => {
      const children = retailers.filter(r => r.parentDistributorId === d.id);
      return { ...d, children };
    });
  }, [distributors, retailers]);

  const directRetailers = useMemo(() => {
    return retailers.filter(r => !r.parentDistributorId);
  }, [retailers]);

  const openEdit = (r) => {
    setEditingRetailer(r);
    setNewParentId(r.parentDistributorId || '');
  };

  const handleSave = async () => {
    if (!editingRetailer) return;
    setSaving(true);
    try {
      const oldParent = availableDistributors.find(d => d.id === editingRetailer.parentDistributorId);
      const newParent = availableDistributors.find(d => d.id === newParentId);
      await db.transact(
        db.tx.partnerApplications[editingRetailer.id].update({
          parentDistributorId: newParentId || null
        }),
        db.tx.activityLogs[db.id()].update({
          entityId: editingRetailer.id,
          entityType: 'partner',
          text: `Retailer "${editingRetailer.name}" reassigned from "${oldParent?.name || 'Direct'}" to "${newParent?.name || 'Direct'}".`,
          userId: ownerId,
          actorId: user.id,
          userName: user.email,
          createdAt: Date.now()
        })
      );
      toast('Retailer hierarchy updated!', 'success');
      setEditingRetailer(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const RetailerRow = ({ r }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', marginLeft: 20, borderTop: '1px dashed #e2e8f0' }}>
      <div style={{ width: 8, height: 8, background: '#cbd5e1', borderRadius: '50%', flexShrink: 0 }}></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Retailer • {r.companyName || 'Indiv.'}</div>
      </div>
      <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Approved</div>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => openEdit(r)}
        style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
        title="Edit hierarchy"
      >
        ✏️ Edit
      </button>
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 24, padding: 15, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
         <h4 style={{ margin: 0, color: '#1e40af' }}>Network Structure</h4>
         <p style={{ margin: '4px 0 0', fontSize: 13, color: '#1e40af', opacity: 0.8 }}>Visualizing the mapping between your Distributors and their associated Retailers. Use ✏️ Edit to reassign a retailer.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {tree.map(d => (
          <div key={d.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
            <div style={{ padding: '12px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                 <div style={{ width: 32, height: 32, background: '#ede9fe', color: '#6d28d9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>D</div>
                 <div>
                   <div style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</div>
                   <div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.companyName || 'No Company'}</div>
                 </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>Distributor</div>
            </div>
            <div style={{ padding: '10px 20px' }}>
               {d.children.length === 0 ? (
                 <div style={{ padding: '8px 40px', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No retailers mapped under this distributor.</div>
               ) : (
                 d.children.map(r => <RetailerRow key={r.id} r={r} />)
               )}
            </div>
          </div>
        ))}

        {directRetailers.length > 0 && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff', marginTop: 10 }}>
            <div style={{ padding: '12px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                 <div style={{ width: 32, height: 32, background: '#f1f5f9', color: '#475569', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>-</div>
                 <div>
                   <div style={{ fontWeight: 700, fontSize: 14 }}>Direct Retailers</div>
                   <div style={{ fontSize: 12, color: 'var(--muted)' }}>Reporting directly to Company</div>
                 </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Unmapped</div>
            </div>
            <div style={{ padding: '10px 20px' }}>
               {directRetailers.map(r => <RetailerRow key={r.id} r={r} />)}
            </div>
          </div>
        )}

        {tree.length === 0 && directRetailers.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 14 }}>
            No approved partners yet. Approve distributors and retailers to see the hierarchy here.
          </div>
        )}
      </div>

      {editingRetailer && (
        <div className="mo open">
          <div className="mo-box" style={{ width: 420 }}>
            <div className="mo-head">
              <h3>Reassign Retailer</h3>
              <button className="btn-icon" onClick={() => setEditingRetailer(null)}>✕</button>
            </div>
            <div className="mo-body" style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Retailer</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{editingRetailer.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{editingRetailer.companyName || 'No Company'}</div>
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label>Assign to Parent Distributor</label>
                <select
                  value={newParentId}
                  onChange={e => setNewParentId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8 }}
                >
                  <option value="">-- No Parent (Direct) --</option>
                  {availableDistributors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.companyName || 'No Company'})</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                  Current: <strong>{availableDistributors.find(d => d.id === editingRetailer.parentDistributorId)?.name || 'Direct (no parent)'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingRetailer(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
