import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useToast } from '../../context/ToastContext';
import { fmtD } from '../../utils/helpers';
import { useApp } from '../../context/AppContext';

export default function Distributors({ user, ownerId, perms, initialTab }) {
  const { setActiveView, setSettingsTab } = useApp();
  const [tab, setTab] = useState(initialTab || 'Channel Partners');
  const [search, setSearch] = useState('');
  const [approveModal, setApproveModal] = useState(null);
  const [commission, setCommission] = useState('');
  const [password, setPassword] = useState('');
  const [parentDist, setParentDist] = useState('');
  const [detailsModal, setDetailsModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [onboardModal, setOnboardModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [onboardForm, setOnboardForm] = useState({ name: '', email: '', phone: '', companyName: '', role: 'Retailer', commission: 0, password: '', parentDistributorId: '', village: '', city: '', district: '', pincode: '', state: '' });
  const [settingsForm, setSettingsForm] = useState({ reqCompany: 'Optional', reqAddress: 'Optional', reqTax: 'Optional', reqNotes: 'Optional', customFields: [], defaultDistributorCommission: 0, defaultRetailerCommission: 0 });
  const toast = useToast();

  const { data, isLoading } = db.useQuery({
    partnerApplications: { $: { where: { userId: ownerId } } },
    partnerCommissions: { $: { where: { userId: ownerId } } },
    products: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } },
    leads: { $: { where: { userId: ownerId } } },
    customers: { $: { where: { userId: ownerId } } }
  });
  const allLeads = useMemo(() => data?.leads || [], [data?.leads]);
  const allCustomers = useMemo(() => data?.customers || [], [data?.customers]);
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
               (a.companyName || '').toLowerCase().includes(s) ||
               (a.phone || '').toLowerCase().includes(s) ||
               (a.role || '').toLowerCase().includes(s) ||
               (a.village || '').toLowerCase().includes(s) ||
               (a.city || '').toLowerCase().includes(s) ||
               (a.district || '').toLowerCase().includes(s) ||
               (a.state || '').toLowerCase().includes(s) ||
               (a.pincode || '').toLowerCase().includes(s) ||
               String(a.commission || '').includes(s);
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
          village: onboardForm.village.trim(),
          city: onboardForm.city.trim(),
          district: onboardForm.district.trim(),
          pincode: onboardForm.pincode.trim(),
          state: onboardForm.state.trim(),
          status: 'Approved',
          appliedAt: Date.now(),
          approvedAt: Date.now(),
          userId: ownerId
        }),
        db.tx.activityLogs[id()].update({
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
          partnerFormConfig: settingsForm,
          defaultDistributorCommission: parseFloat(settingsForm.defaultDistributorCommission) || 0,
          defaultRetailerCommission: parseFloat(settingsForm.defaultRetailerCommission) || 0
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
    setSettingsForm({
      ...ex,
      defaultDistributorCommission: profile?.defaultDistributorCommission || 0,
      defaultRetailerCommission: profile?.defaultRetailerCommission || 0
    });
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
        db.tx.activityLogs[id()].update({
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
      <div className="sh" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
        <div>
          <h2>Channel Partners</h2>
          <div className="sub">Control center for your distribution network</div>
          <button 
            className="btn-link" 
            style={{ fontSize: 11, color: 'var(--accent)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => { setActiveView('Settings'); setSettingsTab('Business'); }}
          >
            ⚙ Edit Main Business Profile ({profile.bizName || 'Company'})
          </button>
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
          }}> ➕ Onboard Partner</button>
        </div>
      </div>
      
      <div className="tabs">
        {['Channel Partners', 'Products', 'Pending', 'Approved', 'Rejected', 'Payouts', 'Reports'].map(t => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t} {!['Channel Partners', 'Products', 'Payouts', 'Reports'].includes(t) && `(${applications.filter(a => a.status === t).length})`}
          </div>
        ))}
      </div>

      <div className="tw">
        <div className="tw-head">
          <h3>{tab === 'Payouts' ? 'Commission Payouts' : tab === 'Products' ? 'Partner Products' : tab === 'Channel Partners' ? 'Channel Partners' : `${tab} Partners`}</h3>
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
          ) : tab === 'Reports' ? (
            <ReportsView commissions={commissions} applications={applications.filter(a => a.status === 'Approved')} ownerId={ownerId} />
          ) : tab === 'Channel Partners' ? (
            <HierarchyView 
              availableDistributors={availableDistributors} 
              allApprovedPartners={applications.filter(a => a.status === 'Approved')}
              ownerId={ownerId} 
              user={user} 
              toast={toast} 
              profile={profile}
              search={search}
              globalLeads={allLeads}
              globalCustomers={allCustomers}
            />
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
                            setCommission(a.role === 'Distributor'
                              ? (profile?.defaultDistributorCommission || '')
                              : (profile?.defaultRetailerCommission || ''));
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
                  <h4 style={{ marginBottom: 8, color: '#334155', fontSize: 14 }}>Default Commission Rates</h4>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Pre-fills when approving a new partner. Still changeable per-partner.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 13, fontWeight: 500 }}>Distributor Default %</label>
                      <input type="number" step="0.1" min="0" max="100" value={settingsForm.defaultDistributorCommission} onChange={e => setSettingsForm(p => ({ ...p, defaultDistributorCommission: e.target.value }))} placeholder="e.g. 10" />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 13, fontWeight: 500 }}>Retailer Default %</label>
                      <input type="number" step="0.1" min="0" max="100" value={settingsForm.defaultRetailerCommission} onChange={e => setSettingsForm(p => ({ ...p, defaultRetailerCommission: e.target.value }))} placeholder="e.g. 5" />
                    </div>
                  </div>
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
                    <select required value={onboardForm.role} onChange={e => {
                        const role = e.target.value;
                        const defComm = role === 'Distributor' ? (profile?.defaultDistributorCommission || 0) : (profile?.defaultRetailerCommission || 0);
                        setOnboardForm(p => ({ ...p, role, commission: defComm }));
                      }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                  <div className="form-group">
                    <label>Village / Area</label>
                    <input type="text" value={onboardForm.village} onChange={e => setOnboardForm(p => ({ ...p, village: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>City / Town</label>
                    <input type="text" value={onboardForm.city} onChange={e => setOnboardForm(p => ({ ...p, city: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                  <div className="form-group">
                    <label>District</label>
                    <input type="text" value={onboardForm.district} onChange={e => setOnboardForm(p => ({ ...p, district: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input type="text" value={onboardForm.pincode} onChange={e => setOnboardForm(p => ({ ...p, pincode: e.target.value }))} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 15 }}>
                  <label>State</label>
                  <input type="text" value={onboardForm.state} onChange={e => setOnboardForm(p => ({ ...p, state: e.target.value }))} />
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
              <div style={{ marginTop: 25, display: 'flex', gap: 10, justifyContent: 'center' }}>
                 {detailsModal.phone && (
                   <>
                     <a href={`tel:${detailsModal.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', textDecoration: 'none' }} title="Call">
                       <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                     </a>
                     <a href={`https://wa.me/${detailsModal.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: '#e8fdf0', color: '#16a34a', textDecoration: 'none' }} title="WhatsApp">
                       <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                     </a>
                   </>
                 )}
                 {detailsModal.email && (
                   <a href={`mailto:${detailsModal.email}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6', color: '#4b5563', textDecoration: 'none' }} title="Email">
                     <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                   </a>
                 )}
              </div>
            </div>
            <div className="mo-foot">
               <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => setDetailsModal(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DATE_FILTERS = ['Today', 'Yesterday', 'This Month', 'This Year', 'Custom'];

function ReportsView({ commissions, applications, ownerId }) {
  const [filter, setFilter] = useState('This Month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [groupBy, setGroupBy] = useState('Partner');

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

  const filteredComms = useMemo(() => {
    return commissions.filter(c => {
      const t = c.updatedAt || c.createdAt;
      return t >= dateRange.start && t <= dateRange.end;
    });
  }, [commissions, dateRange]);

  const reportData = useMemo(() => {
    const stats = {};
    
    filteredComms.forEach(c => {
      const p = applications.find(a => a.id === c.partnerId);
      const key = groupBy === 'Partner' ? (p?.name || 'Unknown') : (p?.district || p?.city || 'Unknown Location');
      
      if (!stats[key]) {
        stats[key] = {
          id: p?.id || key,
          name: key,
          role: p?.role || '-',
          location: p?.district ? `${p.district}, ${p.state || ''}` : p?.city || '-',
          revenue: 0,
          earnings: 0,
          count: 0
        };
      }
      
      const estRev = c.invoiceTotal || (c.commissionPct > 0 ? (c.amount / (c.commissionPct / 100)) : (c.amount * 10));
      stats[key].revenue += estRev;
      stats[key].earnings += (c.amount || 0);
      stats[key].count += 1;
    });

    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [filteredComms, applications, groupBy]);

  const tops = useMemo(() => {
    const retailers = reportData.filter(r => r.role === 'Retailer').sort((a, b) => b.revenue - a.revenue);
    const distributors = reportData.filter(r => r.role === 'Distributor').sort((a, b) => b.revenue - a.revenue);
    
    // For top location, we deduplicate by invoiceId to avoid double counting the same order in the same location
    const locStats = {};
    const locMap = {};
    filteredComms.forEach(c => {
      const p = applications.find(a => a.id === c.partnerId);
      const loc = p?.district || p?.city || 'Unknown';
      if (!locStats[loc]) locStats[loc] = 0;
      
      const val = (c.invoiceTotal || (c.commissionPct > 0 ? (c.amount / (c.commissionPct / 100)) : (c.amount * 10)));
      if (c.invoiceId) {
        if (!locMap[`${loc}-${c.invoiceId}`]) {
           locMap[`${loc}-${c.invoiceId}`] = true;
           locStats[loc] += val;
        }
      } else {
        locStats[loc] += val;
      }
    });
    const topLoc = Object.entries(locStats).sort((a, b) => b[1] - a[1])[0];

    return {
      retailer: retailers[0],
      distributor: distributors[0],
      location: topLoc ? { name: topLoc[0], revenue: topLoc[1] } : null
    };
  }, [reportData, filteredComms, applications]);

  const totals = useMemo(() => {
    let rev = 0;
    let earn = 0;
    let cnt = 0;
    const invMap = {};

    filteredComms.forEach(c => {
       earn += (c.amount || 0);
       const val = (c.invoiceTotal || (c.commissionPct > 0 ? (c.amount / (c.commissionPct / 100)) : (c.amount * 10)));
       
       if (!c.invoiceId) {
         rev += val;
         cnt += 1;
       } else if (!invMap[c.invoiceId]) {
         invMap[c.invoiceId] = true;
         rev += val;
         cnt += 1;
       }
    });

    return { revenue: rev, count: cnt, earnings: earn };
  }, [filteredComms]);

  const exportCSV = () => {
    const headers = groupBy === 'Partner' 
      ? ['Partner Name', 'Role', 'Location', 'Total Business (₹)', 'Earnings (₹)', 'Orders']
      : ['Location', 'Total Business (₹)', 'Total Earnings (₹)', 'Volume'];
    
    const rows = reportData.map(r => groupBy === 'Partner' 
      ? [r.name, r.role, r.location, r.revenue, r.earnings, r.count]
      : [r.name, r.revenue, r.earnings, r.count]
    );

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Partner_Performance_${filter}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="sh" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Distribution Performance</h2>
          <div className="sub">Track business growth across your partner network</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
          📥 Export CSV
        </button>
      </div>

      {/* Date Filters */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {DATE_FILTERS.map(f => (
          <div 
            key={f} 
            className={`tab ${filter === f ? 'active' : ''}`} 
            onClick={() => setFilter(f)}
          >
            {f}
          </div>
        ))}
      </div>

      {filter === 'Custom' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, background: 'var(--bg)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label style={{ fontSize: 11 }}>Start Date</label>
            <input type="date" value={customRange.start} onChange={e => setCustomRange(p => ({ ...p, start: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label style={{ fontSize: 11 }}>End Date</label>
            <input type="date" value={customRange.end} onChange={e => setCustomRange(p => ({ ...p, end: e.target.value }))} />
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card sc-blue">
          <div className="lbl">Total Business</div>
          <div className="val">₹{totals.revenue.toLocaleString()}</div>
          <div className="sub">{totals.count} successful orders</div>
        </div>
        <div className="stat-card sc-green">
          <div className="lbl">🏆 Top Retailer</div>
          <div className="val" style={{ fontSize: 16 }}>{tops.retailer ? tops.retailer.name : 'N/A'}</div>
          <div className="sub">{tops.retailer ? `₹${tops.retailer.revenue.toLocaleString()} Revenue` : 'No data'}</div>
        </div>
        <div className="stat-card sc-yellow">
          <div className="lbl">🏆 Top Distributor</div>
          <div className="val" style={{ fontSize: 16 }}>{tops.distributor ? tops.distributor.name : 'N/A'}</div>
          <div className="sub">{tops.distributor ? `₹${tops.distributor.revenue.toLocaleString()} Revenue` : 'No data'}</div>
        </div>
        <div className="stat-card sc-teal">
          <div className="lbl">📍 Top Location</div>
          <div className="val" style={{ fontSize: 16 }}>{tops.location ? tops.location.name : 'N/A'}</div>
          <div className="sub">{tops.location ? `₹${tops.location.revenue.toLocaleString()} Business` : 'No data'}</div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="tw">
        <div className="tw-head">
          <h3>Partner Performance</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>List by</span>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ padding: '5px 10px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit' }}>
              <option value="Partner">Individual Partners</option>
              <option value="Location">Geographic Districts</option>
            </select>
          </div>
        </div>
        <div className="tw-scroll">
          <table>
            <thead>
              <tr>
                <th>{groupBy === 'Partner' ? 'Partner Name' : 'District / City'}</th>
                {groupBy === 'Partner' && <th>Role</th>}
                {groupBy === 'Partner' && <th>Location</th>}
                <th style={{ textAlign: 'right' }}>Total Business (₹)</th>
                <th style={{ textAlign: 'right' }}>Earnings (₹)</th>
                <th style={{ textAlign: 'right' }}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>No performance data found for {filter.toLowerCase()}.</td></tr>
              ) : reportData.map((r, i) => (
                <tr key={i} style={{ background: i === 0 ? '#f0f9ff' : undefined }}>
                  <td style={{ fontWeight: 600 }}>
                    {i === 0 && <span style={{ marginRight: 6 }}>🏆</span>}
                    {r.name}
                  </td>
                  {groupBy === 'Partner' && (
                    <>
                      <td><span className="badge" style={{ background: r.role === 'Distributor' ? '#ede9fe' : '#eff6ff', color: r.role === 'Distributor' ? '#6d28d9' : '#1e40af' }}>{r.role}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{r.location}</td>
                    </>
                  )}
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{r.revenue.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', color: '#9333ea', fontWeight: 600 }}>₹{r.earnings.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
      // Batch execute
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
    if (stat !== 'Pending Payout') return; 
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
      <div className="tw-scroll" style={{ padding: 0 }}>
        <table style={{ margin: 0 }}>
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
      </div>
    </>
  );
}

function ProductsView({ products, search }) {
  const partnerProducts = useMemo(() => {
    return products.filter(p => p.isPartnerAvailable)
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  return (
    <div className="tw-scroll" style={{ padding: 0 }}>
      <table style={{ margin: 0 }}>
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
    </div>
  );
}

function HierarchyView({ availableDistributors, allApprovedPartners, ownerId, user, toast, profile, search, globalLeads, globalCustomers }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(profile?.partnerPageSize || 25);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerDetailsId, setPartnerDetailsId] = useState(null);
  const [newParentId, setNewParentId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCommission, setNewCommission] = useState(0);
  const [newAddress, setNewAddress] = useState('');
  const [newVillage, setNewVillage] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newPincode, setNewPincode] = useState('');
  const [newState, setNewState] = useState('');
  const [newTaxId, setNewTaxId] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [colModal, setColModal] = useState(false);

  // totalCount and totalPages are computed after search filtering below

  const searchedPartners = useMemo(() => {
    if (!search) return allApprovedPartners;
    const s = search.toLowerCase();
    return allApprovedPartners.filter(a =>
      (a.name || '').toLowerCase().includes(s) ||
      (a.email || '').toLowerCase().includes(s) ||
      (a.companyName || '').toLowerCase().includes(s) ||
      (a.phone || '').toLowerCase().includes(s) ||
      (a.role || '').toLowerCase().includes(s) ||
      (a.village || '').toLowerCase().includes(s) ||
      (a.city || '').toLowerCase().includes(s) ||
      (a.district || '').toLowerCase().includes(s) ||
      (a.state || '').toLowerCase().includes(s) ||
      (a.pincode || '').toLowerCase().includes(s) ||
      String(a.commission || '').includes(s)
    );
  }, [allApprovedPartners, search]);

  const totalCount = searchedPartners.length;
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalCount / pageSize);

  const partners = useMemo(() => {
    if (pageSize === 'all') return searchedPartners;
    return searchedPartners.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [searchedPartners, currentPage, pageSize]);

  const savedCols = profile?.partnerCols;
  const allPossibleCols = ['Name', 'Role', 'Parent', 'Phone', 'Email', 'Commission', 'Company', 'Address'];
  const activeCols = savedCols || ['Name', 'Role', 'Parent', 'Phone', 'Commission', 'Actions'];

  const [tempCols, setTempCols] = useState(activeCols);
  const [tempPageSize, setTempPageSize] = useState(pageSize);

  const getParentName = (p) => {
    if (p.role === 'Distributor') return profile?.bizName || profile?.businessName || 'Company';
    if (!p.parentDistributorId) return 'Direct';
    const parent = allApprovedPartners.find(d => d.id === p.parentDistributorId);
    return parent ? parent.name : 'Unknown';
  };

  const openEdit = (p) => {
    setEditingPartner(p);
    setNewParentId(p.parentDistributorId || '');
    setNewCompanyName(p.companyName || '');
    setNewPhone(p.phone || '');
    setNewEmail(p.email || '');
    setNewCommission(p.commission || 0);
    setNewAddress(p.address || '');
    setNewVillage(p.village || '');
    setNewCity(p.city || '');
    setNewDistrict(p.district || '');
    setNewPincode(p.pincode || '');
    setNewState(p.state || '');
    setNewTaxId(p.taxId || '');
    setNewNotes(p.notes || '');
    setNewPassword('');
  };

  const handleSave = async () => {
    if (!editingPartner) return;
    setSaving(true);
    try {
      // 1. Update password if provided
      if (newPassword) {
        if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'set-partner-password',
            email: editingPartner.email.trim(),
            password: newPassword,
            ownerUserId: ownerId,
            partnerId: editingPartner.id
          })
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Failed to update partner password');
      }

      // 2. Update database fields
      const oldParent = allApprovedPartners.find(d => d.id === editingPartner.parentDistributorId);
      const newParent = allApprovedPartners.find(d => d.id === newParentId);
      
      const updateData = {
        companyName: newCompanyName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        address: newAddress.trim(),
        village: newVillage.trim(),
        city: newCity.trim(),
        district: newDistrict.trim(),
        pincode: newPincode.trim(),
        state: newState.trim(),
        taxId: newTaxId.trim(),
        notes: newNotes.trim(),
        commission: parseFloat(newCommission) || 0,
        updatedAt: Date.now()
      };
      if (editingPartner.role === 'Retailer') {
        updateData.parentDistributorId = newParentId || null;
      }

      await db.transact(
        db.tx.partnerApplications[editingPartner.id].update(updateData),
        db.tx.activityLogs[id()].update({
          entityId: editingPartner.id,
          entityType: 'partner',
          text: `Partner "${editingPartner.name}" updated by admin.${newPassword ? ' Password was reset.' : ''}`,
          userId: ownerId,
          actorId: user.id,
          userName: user.email,
          createdAt: Date.now()
        })
      );
      toast('Partner details updated!', 'success');
      setEditingPartner(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveViewConfig = async (cols, size) => {
    try {
      await db.transact(db.tx.userProfiles[profile.id].update({ partnerCols: cols, partnerPageSize: size }));
      toast('View configuration saved', 'success');
      setColModal(false);
    } catch (err) {
      toast('Error saving config: ' + err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Search Header Area */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-soft)' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => {
          setTempCols(activeCols);
          setTempPageSize(pageSize);
          setColModal(true);
        }}>⚙ Configure View</button>
      </div>

      {/* Pagination Controls Top */}
      <div style={{ padding: '8px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)', gap: 15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Show</span>
          <select 
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 700, outline: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '2px 4px', borderRadius: 4, fontSize: 11 }}
            value={pageSize}
            onChange={e => {
                const newSize = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                setPageSize(newSize);
                setCurrentPage(1);
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value="all">All</option>
          </select>
        </div>

        {pageSize !== 'all' && totalPages > 1 && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
            <span style={{ fontSize: 12, alignSelf: 'center' }}>Page {currentPage} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>

      <div className="tw-scroll" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              {activeCols.includes('Name') && <th>Name</th>}
              {activeCols.includes('Role') && <th>Role</th>}
              {activeCols.includes('Parent') && <th>Parent</th>}
              {activeCols.includes('Phone') && <th>Phone</th>}
              {activeCols.includes('Email') && <th>Email</th>}
              {activeCols.includes('Commission') && <th>Commission</th>}
              {activeCols.includes('Company') && <th>Company</th>}
              {activeCols.includes('Address') && <th>Address</th>}
              {activeCols.includes('Actions') && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No partners found in this view.</td></tr>
            ) : partners.map((p, i) => (
              <tr key={p.id}>
                <td style={{ color: 'var(--muted)', fontSize: 11 }}>{(currentPage - 1) * (pageSize === 'all' ? 0 : pageSize) + i + 1}</td>
                {activeCols.includes('Name') && (
                  <td>
                    <button 
                      className="btn-link" 
                      style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', textAlign: 'left' }}
                      onClick={() => setPartnerDetailsId(p.id)}
                    >
                      {p.name}
                    </button>
                  </td>
                )}
                {activeCols.includes('Role') && (
                  <td>
                    <span className="badge" style={{ 
                        background: p.role === 'Distributor' ? '#ede9fe' : '#eff6ff', 
                        color: p.role === 'Distributor' ? '#6d28d9' : '#1e40af' 
                    }}>
                        {p.role}
                    </span>
                  </td>
                )}
                {activeCols.includes('Parent') && (
                    <td>
                        <div style={{ fontSize: 13, fontWeight: 600, color: getParentName(p) === 'Company' ? '#6366f1' : 'inherit' }}>
                            {getParentName(p)}
                        </div>
                    </td>
                )}
                {activeCols.includes('Phone') && <td style={{ fontSize: 13 }}>{p.phone || '-'}</td>}
                {activeCols.includes('Email') && <td style={{ fontSize: 13 }}>{p.email || '-'}</td>}
                {activeCols.includes('Commission') && <td style={{ fontWeight: 600 }}>{p.commission}%</td>}
                {activeCols.includes('Company') && <td style={{ fontSize: 13 }}>{p.companyName || '-'}</td>}
                {activeCols.includes('Address') && <td style={{ fontSize: 12, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.address}>{p.address || '-'}</td>}
                {activeCols.includes('Actions') && (
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls Bottom */}
      <div style={{ padding: '12px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Showing {(currentPage - 1) * (pageSize === 'all' ? 0 : pageSize) + 1} to {Math.min(currentPage * (pageSize === 'all' ? totalCount : pageSize), totalCount)} of {totalCount} partners
          </div>
          {pageSize !== 'all' && totalPages > 1 && (
            <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
                <button className="btn btn-secondary btn-sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
            </div>
          )}
      </div>

      {/* Configure View Modal */}
      {colModal && (
        <div className="mo open">
          <div className="mo-box" style={{ width: 480 }}>
            <div className="mo-head">
              <h3>Configure View</h3>
              <button className="btn-icon" onClick={() => setColModal(false)}>✕</button>
            </div>
            <div className="mo-body" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '60vh', overflowY: 'auto' }}>
              <div>
                <strong style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12, display: 'block' }}>Visible Columns</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {allPossibleCols.concat('Actions').map(c => (
                    <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input 
                        type="checkbox" 
                        checked={tempCols.includes(c)} 
                        disabled={c === 'Name'}
                        onChange={e => {
                            if (e.target.checked) setTempCols([...tempCols, c]);
                            else setTempCols(tempCols.filter(x => x !== c));
                        }} 
                        style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} 
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <strong style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12, display: 'block' }}>Default Page Size</strong>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[25, 50, 100, 'all'].map(size => (
                    <button 
                        key={size} 
                        className={`btn btn-sm ${tempPageSize === size ? 'btn-primary' : 'btn-secondary'}`} 
                        onClick={() => setTempPageSize(size)}
                    >
                        {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mo-foot" style={{ justifyContent: 'space-between' }}>
               <button className="btn btn-secondary btn-sm" onClick={() => {
                   setTempCols(['Name', 'Role', 'Parent', 'Phone', 'Commission', 'Actions']);
                   setTempPageSize(25);
               }}>Reset to Default</button>
               <div style={{ display: 'flex', gap: 8 }}>
                 <button className="btn btn-secondary btn-sm" onClick={() => setColModal(false)}>Cancel</button>
                 <button className="btn btn-primary btn-sm" onClick={() => saveViewConfig(tempCols, tempPageSize)}>Save View</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Partner Modal */}
      {editingPartner && (
        <div className="mo open">
          <div className="mo-box" style={{ width: 680, maxWidth: '95vw' }}>
            <div className="mo-head">
              <h3>Edit Partner Profile</h3>
              <button className="btn-icon" onClick={() => setEditingPartner(null)}>✕</button>
            </div>
            <div className="mo-body tw-scroll" style={{ padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: 20, background: 'var(--bg-soft)', padding: 15, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Partner Name</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>{editingPartner.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Application ID: {editingPartner.id.slice(0,8)}</div>
              </div>

              <div className="fgrid">
                <div className="form-group">
                  <label>Company/Business Name</label>
                  <input value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder="Business Name" />
                </div>
                <div className="form-group">
                  <label>Contact Email</label>
                  <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@company.com" />
                </div>
                <div className="form-group">
                  <label>Commission Rate (%)</label>
                  <input type="number" value={newCommission} onChange={e => setNewCommission(e.target.value)} placeholder="e.g. 10" />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+91..." />
                </div>
                <div className="form-group">
                  <label>Tax ID / GSTIN</label>
                  <input value={newTaxId} onChange={e => setNewTaxId(e.target.value)} placeholder="GSTIN..." />
                </div>
              </div>

              <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <h4 style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 15 }}>Location & Address</h4>
                <div className="fgrid">
                  <div className="form-group">
                    <label>Village / Area</label>
                    <input value={newVillage} onChange={e => setNewVillage(e.target.value)} placeholder="Village" />
                  </div>
                  <div className="form-group">
                    <label>City / Town</label>
                    <input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="City" />
                  </div>
                  <div className="form-group">
                    <label>District</label>
                    <input value={newDistrict} onChange={e => setNewDistrict(e.target.value)} placeholder="District" />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input value={newPincode} onChange={e => setNewPincode(e.target.value)} placeholder="600001" />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input value={newState} onChange={e => setNewState(e.target.value)} placeholder="Tamil Nadu" />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 10 }}>
                  <label>Full Postal Address</label>
                  <textarea value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Enter full address details..." style={{ width: '100%', minHeight: 60 }} />
                </div>
              </div>

              <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div className="fgrid">
                  {editingPartner.role === 'Retailer' && (
                    <div className="form-group">
                      <label>Parent Distributor</label>
                      <select
                        value={newParentId}
                        onChange={e => setNewParentId(e.target.value)}
                      >
                        <option value="">-- No Parent (Direct) --</option>
                        {availableDistributors.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.companyName || 'No Company'})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Reset Password</span>
                      <button type="button" style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} onClick={() => setNewPassword(Math.random().toString(36).slice(-8))}>Generate Random</button>
                    </label>
                    <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Internal Admin Notes</label>
                <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Private notes about this partner..." style={{ width: '100%', minHeight: 60 }} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingPartner(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Partner Details Modal */}
      {partnerDetailsId && (
        <PartnerDetailsModal 
          partnerId={partnerDetailsId} 
          onClose={() => setPartnerDetailsId(null)} 
          onSelectPartner={setPartnerDetailsId}
          ownerId={ownerId} 
          user={user} 
          toast={toast}
          profile={profile}
          allApproved={allApprovedPartners}
          globalLeads={globalLeads}
          globalCustomers={globalCustomers}
        />
      )}
    </div>
  );
}

function PartnerDetailsModal({ partnerId, onClose, onSelectPartner, ownerId, user, toast, profile, allApproved, globalLeads, globalCustomers }) {
  const [tab, setTab] = useState('Overview');
  
  const { data, isLoading } = db.useQuery({
    partnerApplications: { $: { where: { or: [{ id: partnerId }, { parentDistributorId: partnerId }] } } },
    partnerCommissions: { $: { where: { partnerId: partnerId } } }
  });

  const partner = data?.partnerApplications?.find(p => p.id === partnerId);
  const subPartners = data?.partnerApplications?.filter(p => p.parentDistributorId === partnerId && p.status === 'Approved') || [];
  const commissions = data?.partnerCommissions || [];
  const leads = (globalLeads || []).filter(l => l.partnerId === partnerId || l.distributorId === partnerId || l.retailerId === partnerId);
  const customers = (globalCustomers || []).filter(c => c.partnerId === partnerId || c.distributorId === partnerId || c.retailerId === partnerId);
  const parentDist = partner?.role === 'Retailer' && partner?.parentDistributorId ? allApproved?.find(p => p.id === partner.parentDistributorId) : null;

  if (isLoading) return (
    <div className="mo open">
      <div className="mo-box" style={{ width: 800, textAlign: 'center', padding: 40 }}>
        <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
        Loading partner details...
      </div>
    </div>
  );

  if (!partner) return (
    <div className="mo open">
      <div className="mo-box" style={{ width: 400, padding: 20 }}>
        Partner not found.
        <button className="btn btn-secondary mt-md" onClick={onClose}>Close</button>
      </div>
    </div>
  );

  const pendingAmount = commissions
    .filter(c => c.status === 'Pending Payout')
    .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  
  const totalEarned = commissions
    .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

  return (
    <div className="mo open">
      <div className="mo-box" style={{ width: 900, maxWidth: '95vw' }}>
        <div className="mo-head" style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: partner.role === 'Distributor' ? '#ede9fe' : '#eff6ff', borderRadius: 10 }}>
               {partner.role === 'Distributor' ? '🏢' : '🤝'}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{partner.name}</h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 10 }}>
                <span>{partner.companyName || 'Independant'}</span>
                <span>•</span>
                <span className="badge" style={{ padding: '0 6px', background: 'var(--surface)', fontSize: 10 }}>{partner.role}</span>
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)', padding: '0 20px' }}>
           {['Overview', 'Payouts', 'Customers', ...(partner.role === 'Distributor' ? ['Retailers'] : []), 'Profile'].map(t => (
             <button 
               key={t} 
               onClick={() => setTab(t)}
               style={{ 
                 padding: '12px 18px', 
                 background: 'none', 
                 border: 'none', 
                 borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                 color: tab === t ? 'var(--accent)' : 'var(--muted)',
                 fontWeight: tab === t ? 700 : 500,
                 cursor: 'pointer',
                 fontSize: 13
               }}
             >
               {t}
             </button>
           ))}
        </div>

        <div className="mo-body" style={{ padding: 25, maxHeight: '70vh', overflow: 'auto' }}>
          {tab === 'Overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
               <div className="stat-grid">
                  <div className="stat-card sc-blue"><div className="lbl">Total Earned</div><div className="val">₹{totalEarned.toLocaleString()}</div></div>
                  <div className="stat-card sc-yellow"><div className="lbl">Pending Payout</div><div className="val">₹{pendingAmount.toLocaleString()}</div></div>
                  <div className="stat-card sc-green"><div className="lbl">Customers</div><div className="val">{leads.length + customers.length}</div></div>
                  {partner.role === 'Distributor' && (
                    <div className="stat-card sc-purple"><div className="lbl">Retailers</div><div className="val">{subPartners.length}</div></div>
                  )}
                  {parentDist && (
                    <div className="stat-card sc-purple" onClick={() => onSelectPartner?.(parentDist.id)} style={{ cursor: 'pointer' }}>
                        <div className="lbl">Assigned Distributor</div>
                        <div className="val">{parentDist.name}</div>
                    </div>
                  )}
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="tw" style={{ padding: 0 }}>
                    <div className="tw-head"><h3>Recent Activity</h3></div>
                    <div style={{ padding: 15, fontSize: 13 }}>
                       <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Basic performance metrics for {partner.name}.</p>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ padding: 12, background: 'var(--bg-soft)', borderRadius: 8, border: '1px solid var(--border)' }}>
                             <div style={{ fontSize: 11, color: 'var(--muted)' }}>Latest Earning</div>
                             <div style={{ fontWeight: 600 }}>{commissions.length > 0 ? `₹${commissions[0].amount} from ${commissions[0].clientName || 'Partner'}` : 'No earnings recorded'}</div>
                          </div>
                       </div>
                    </div>
                  </div>
                  <div className="tw" style={{ padding: 20 }}>
                     <h3 style={{ fontSize: 14, marginBottom: 15 }}>Contact Quick Actions</h3>
                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {partner.phone && (
                          <>
                            <a href={`tel:${partner.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', textDecoration: 'none' }} title="Call">
                              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </a>
                            <a href={`https://wa.me/${partner.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: '#e8fdf0', color: '#16a34a', textDecoration: 'none' }} title="WhatsApp">
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                            </a>
                          </>
                        )}
                        {partner.email && (
                          <a href={`mailto:${partner.email}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: '#f3f4f6', color: '#4b5563', textDecoration: 'none' }} title="Email">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                          </a>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {tab === 'Payouts' && (
            <div className="tw" style={{ padding: 0 }}>
              <div className="tw-head">
                 <h3>Commission Payout History</h3>
                 <div style={{ fontSize: 13, background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>
                    Pending: ₹{pendingAmount.toLocaleString()}
                 </div>
              </div>
              <div className="tw-scroll">
                 <table style={{ minWidth: 600 }}>
                    <thead>
                       <tr>
                          <th>Date</th>
                          <th>Invoice / Client</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Paid On</th>
                       </tr>
                    </thead>
                    <tbody>
                       {commissions.length === 0 ? (
                         <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No commission records found.</td></tr>
                       ) : commissions.sort((a,b) => (b.updatedAt || b.appliedAt) - (a.updatedAt || a.appliedAt)).map(c => (
                         <tr key={c.id}>
                            <td style={{ fontSize: 12 }}>{fmtD(c.updatedAt || c.appliedAt)}</td>
                            <td>
                               <div style={{ fontWeight: 600 }}>{c.clientName || 'Partner Portal Sales'}</div>
                               <div style={{ fontSize: 11, color: 'var(--muted)' }}>Inv: {c.invoiceNo || '-'}</div>
                            </td>
                            <td style={{ fontWeight: 700 }}>₹{c.amount}</td>
                            <td>
                               <span className={`badge ${c.status === 'Paid' ? 'bg-green' : 'bg-yellow'}`}>{c.status}</span>
                            </td>
                            <td style={{ fontSize: 11 }}>{c.paidAt ? fmtD(c.paidAt) : '-'}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            </div>
          )}

          {tab === 'Customers' && (
            <div className="tw" style={{ padding: 0 }}>
              <div className="tw-head"><h3>Referred Leads & Customers</h3></div>
              <div className="tw-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...leads, ...customers].length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No customers added by this partner yet.</td></tr>
                    ) : [...leads, ...customers].sort((a,b) => (b.createdAt || b.appliedAt) - (a.createdAt || a.appliedAt)).map((c, idx) => (
                      <tr key={c.id || idx}>
                        <td>
                          <span className={`badge ${leads.find(l => l.id === c.id) ? 'bg-blue' : 'bg-green'}`}>
                            {leads.find(l => l.id === c.id) ? 'Lead' : 'Converted Client'}
                          </span>
                        </td>
                        <td><strong>{c.name}</strong></td>
                        <td style={{ fontSize: 12 }}>{c.phone || '-'}</td>
                        <td style={{ fontSize: 12 }}>{c.email || '-'}</td>
                        <td style={{ fontSize: 11 }}>{fmtD(c.createdAt || c.appliedAt || Date.now())}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Retailers' && partner.role === 'Distributor' && (
            <div className="tw" style={{ padding: 0 }}>
               <div className="tw-head"><h3>Associated Retailers</h3></div>
               <div className="tw-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Joined Date</th>
                        <th>Retailer Name</th>
                        <th>Company</th>
                        <th>Contact Email</th>
                        <th>Commission</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right', paddingRight: 20 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                       {subPartners.length === 0 ? (
                         <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No retailers found under this distributor.</td></tr>
                       ) : subPartners.map((sp, idx) => (
                         <tr key={sp.id}>
                           <td style={{ fontSize: 13 }}>{fmtD(sp.approvedAt || sp.appliedAt)}</td>
                           <td><span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onSelectPartner?.(sp.id)}>{sp.name}</span></td>
                           <td style={{ fontSize: 13, color: 'var(--muted)' }}>{sp.companyName || 'Independent'}</td>
                           <td style={{ fontSize: 13, color: 'var(--muted)' }}>{sp.email}</td>
                           <td><strong style={{ color: 'var(--accent)' }}>{sp.commission}%</strong></td>
                           <td><span className="badge" style={{ padding: '4px 10px', background: sp.status === 'Approved' ? 'var(--bg-green)' : 'var(--bg-yellow)', color: sp.status === 'Approved' ? 'var(--dark-green)' : 'var(--dark-yellow)' }}>{sp.status}</span></td>
                           <td style={{ textAlign: 'right', paddingRight: 20 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => onSelectPartner?.(sp.id)}>View Profile</button>
                           </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {tab === 'Profile' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
               <div>
                  <h4 style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 }}>Basic Information</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                     <div><label style={{ fontSize: 11, color: 'var(--muted)' }}>Phone Number</label><div>{partner.phone}</div></div>
                     <div><label style={{ fontSize: 11, color: 'var(--muted)' }}>Email Address</label><div>{partner.email}</div></div>
                     <div><label style={{ fontSize: 11, color: 'var(--muted)' }}>Company Name</label><div>{partner.companyName || '-'}</div></div>
                     <div><label style={{ fontSize: 11, color: 'var(--muted)' }}>Tax ID / GSTIN</label><div>{partner.taxId || '-'}</div></div>
                     {parentDist && (
                        <div>
                           <label style={{ fontSize: 11, color: 'var(--muted)' }}>Assigned Distributor</label>
                           <div style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }} onClick={() => onSelectPartner?.(parentDist.id)}>{parentDist.name} ({parentDist.companyName || 'Independent'})</div>
                        </div>
                     )}
                  </div>
               </div>
               <div>
                  <h4 style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 }}>Location Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                     <div><label style={{ fontSize: 11, color: 'var(--muted)' }}>Village/Area</label><div style={{ fontSize: 13 }}>{partner.village || '-'}</div></div>
                     <div><label style={{ fontSize: 11, color: 'var(--muted)' }}>City/Town</label><div style={{ fontSize: 13 }}>{partner.city || '-'}</div></div>
                     <div><label style={{ fontSize: 11, color: 'var(--muted)' }}>District</label><div style={{ fontSize: 13 }}>{partner.district || '-'}</div></div>
                     <div><label style={{ fontSize: 11, color: 'var(--muted)' }}>Pincode</label><div style={{ fontSize: 13 }}>{partner.pincode || '-'}</div></div>
                     <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: 'var(--muted)' }}>State</label><div style={{ fontSize: 13 }}>{partner.state || '-'}</div></div>
                  </div>

                  <h4 style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 }}>Full Address</h4>
                  <div style={{ padding: 15, background: 'var(--bg-soft)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, minHeight: 60 }}>
                     {partner.address || 'No address details provided.'}
                  </div>
                  
                  <h4 style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginTop: 25, marginBottom: 15, letterSpacing: 1 }}>Additional Form Data</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                     {profile?.partnerFormConfig?.customFields?.map(field => (
                        <div key={field.id}>
                           <label style={{ fontSize: 11, color: 'var(--muted)' }}>{field.label}</label>
                           <div style={{ fontSize: 13 }}>{partner.customData?.[field.id] || '-'}</div>
                        </div>
                     ))}
                  </div>

                  <h4 style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginTop: 25, marginBottom: 10, letterSpacing: 1 }}>Internal Notes</h4>
                  <div style={{ fontSize: 13, color: '#475569' }}>{partner.notes || 'No partner notes.'}</div>
               </div>
            </div>
          )}
        </div>
        
        <div className="mo-foot" style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)' }}>
           <button className="btn btn-secondary" onClick={onClose} style={{ marginLeft: 'auto' }}>Close Detail View</button>
        </div>
      </div>
    </div>
  );
}
