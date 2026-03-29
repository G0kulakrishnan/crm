import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { useToast } from '../../context/ToastContext';
import { fmtD } from '../../utils/helpers';

export default function Distributors({ user, ownerId, perms }) {
  const [tab, setTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [approveModal, setApproveModal] = useState(null);
  const [commission, setCommission] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const { data, isLoading } = db.useQuery({
    partnerApplications: { $: { where: { userId: ownerId } } },
    partnerCommissions: { $: { where: { userId: ownerId } } }
  });
  const commissions = useMemo(() => data?.partnerCommissions || [], [data?.partnerCommissions]);

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
      <div className="sh">
        <div>
          <h2>Channel Partners</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Direct registration link:{' '}
            <a href="/partner/register" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              /partner/register
            </a>
          </p>
        </div>
      </div>
      
      <div className="tabs">
        {['Pending', 'Approved', 'Rejected', 'Payouts'].map(t => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t} {t !== 'Payouts' && `(${applications.filter(a => a.status === t).length})`}
          </div>
        ))}
      </div>

      <div className="tw">
        <div className="tw-head">
          <h3>{tab === 'Payouts' ? 'Commission Payouts' : `${tab} Partners`}</h3>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="tw-scroll">
          {tab === 'Payouts' ? (
            <PayoutsView commissions={commissions} applications={applications} search={search} ownerId={ownerId} user={user} toast={toast} />
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
