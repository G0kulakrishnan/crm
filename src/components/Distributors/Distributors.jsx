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
  const [submitting, setSubmitting] = useState(false);
  const [onboardModal, setOnboardModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [onboardForm, setOnboardForm] = useState({ name: '', email: '', phone: '', companyName: '', role: 'Retailer', commission: 0, password: '' });
  const [settingsForm, setSettingsForm] = useState({ reqCompany: 'Optional', reqAddress: 'Optional', reqTax: 'Optional', reqNotes: 'Optional' });
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
    const ex = profile?.partnerFormConfig || { reqCompany: 'Optional', reqAddress: 'Optional', reqTax: 'Optional', reqNotes: 'Optional' };
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
        {['Pending', 'Approved', 'Rejected', 'Payouts', 'Products'].map(t => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t} {!['Payouts', 'Products'].includes(t) && `(${applications.filter(a => a.status === t).length})`}
          </div>
        ))}
      </div>

      <div className="tw">
        <div className="tw-head">
          <h3>{tab === 'Payouts' ? 'Commission Payouts' : tab === 'Products' ? 'Partner Products' : `${tab} Partners`}</h3>
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
                          <button className="btn btn-primary btn-sm" onClick={() => {
                            setApproveModal(a);
                            setPassword(Math.random().toString(36).slice(-8)); // auto-generate pass
                          }}>Approve</button>
                          <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleReject(a.id)}>Reject</button>
                        </div>
                      )}
                      {tab === 'Approved' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => toast('View details not implemented', 'info')}>View</button>
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
                <div className="form-group" style={{ marginBottom: 15 }}>
                  <label>Commission Percentage (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={commission} 
                    onChange={e => setCommission(e.target.value)} 
                    placeholder="e.g. 15" 
                    required 
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
                {['Company', 'Address', 'Tax', 'Notes'].map(field => {
                  const key = `req${field}`;
                  return (
                    <div className="form-group" style={{ marginBottom: 15 }} key={field}>
                      <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{field === 'Tax' ? 'Tax ID' : field} Field</span>
                        <select 
                          value={settingsForm[key]} 
                          onChange={e => setSettingsForm(p => ({ ...p, [key]: e.target.value }))}
                          style={{ width: 140, padding: 4 }}
                        >
                          <option value="Hidden">Hidden</option>
                          <option value="Optional">Optional</option>
                          <option value="Required">Required</option>
                        </select>
                      </label>
                    </div>
                  );
                })}
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
