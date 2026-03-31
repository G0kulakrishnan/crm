import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useToast } from '../../context/ToastContext';
import { fmtD } from '../../utils/helpers';

export default function PartnerApp({ user, settings, partnerInfo }) {
  const { ownerUserId, partnerId, role } = partnerInfo;
  const [activeTab, setActiveTab] = useState('NewRequirement');
  const toast = useToast();

  const handleLogout = () => {
    localStorage.removeItem('tc_channel_partner');
    db.auth.signOut().then(() => {
      window.location.href = '/';
    });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Navbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {settings?.brandLogo ? (
            <img src={settings.brandLogo} alt="Logo" style={{ height: 32, borderRadius: 6 }} />
          ) : (
            <div style={{ background: '#2563eb', color: '#fff', padding: '6px 10px', borderRadius: 6, fontWeight: 800 }}>{settings?.brandShort || 'T2G'}</div>
          )}
          <div>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 16 }}>Partner Portal</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{settings?.brandName || 'T2GCRM'} • {role}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 4 }}>
            <button 
              onClick={() => setActiveTab('NewRequirement')} 
              style={{ border: 'none', background: activeTab === 'NewRequirement' ? '#fff' : 'transparent', padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: activeTab === 'NewRequirement' ? '#2563eb' : '#64748b', cursor: 'pointer', boxShadow: activeTab === 'NewRequirement' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
            >
              + New Requirement
            </button>
            <button 
              onClick={() => setActiveTab('MyCustomers')} 
              style={{ border: 'none', background: activeTab === 'MyCustomers' ? '#fff' : 'transparent', padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: activeTab === 'MyCustomers' ? '#2563eb' : '#64748b', cursor: 'pointer', boxShadow: activeTab === 'MyCustomers' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
            >
              My Customers
            </button>
            <button 
              onClick={() => setActiveTab('MyEarnings')} 
              style={{ border: 'none', background: activeTab === 'MyEarnings' ? '#fff' : 'transparent', padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: activeTab === 'MyEarnings' ? '#2563eb' : '#64748b', cursor: 'pointer', boxShadow: activeTab === 'MyEarnings' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
            >
              My Earnings
            </button>
            <button 
              onClick={() => setActiveTab('Profile')} 
              style={{ border: 'none', background: activeTab === 'Profile' ? '#fff' : 'transparent', padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: activeTab === 'Profile' ? '#2563eb' : '#64748b', cursor: 'pointer', boxShadow: activeTab === 'Profile' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
            >
              My Profile
            </button>
          </div>
          <button onClick={handleLogout} style={{ border: 'none', background: 'transparent', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 12px' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {activeTab === 'NewRequirement' ? (
            <NewRequirementForm ownerId={ownerUserId} partnerId={partnerId} user={user} />
          ) : activeTab === 'MyCustomers' ? (
            <MyCustomersView ownerId={ownerUserId} partnerId={partnerId} />
          ) : activeTab === 'MyEarnings' ? (
            <MyEarningsView ownerId={ownerUserId} partnerId={partnerId} />
          ) : (
            <ProfileSettingsView ownerId={ownerUserId} partnerId={partnerId} />
          )}
        </div>
      </div>
    </div>
  );
}

// ------ NEW REQUIREMENT FORM COMPONENT ------
function NewRequirementForm({ ownerId, partnerId, user }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '', selectedRequirement: '' });
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const { data, isLoading } = db.useQuery({
    products: { $: { where: { userId: ownerId, isPartnerAvailable: true } } },
    leads: { $: { where: { userId: ownerId } } },
    customers: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } },
    partnerApplications: { $: { where: { id: partnerId } } }
  });

  const products = data?.products || [];
  const ownerProfile = data?.userProfiles?.[0] || {};
  const partnerApp = data?.partnerApplications?.[0];
  const allRequirements = ownerProfile?.requirements || [];
  const visibleRequirements = (ownerProfile?.partnerVisibleRequirements || []).filter(r => allRequirements.includes(r));
  
  const handleToggleProduct = (pId) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(pId)) next.delete(pId); else next.add(pId);
      return next;
    });
  };

  const checkConflict = () => {
    const checkPhone = form.phone.trim().toLowerCase();
    const checkEmail = form.email.trim().toLowerCase();
    if (!checkPhone && !checkEmail) return null;

    const allRecords = [...(data?.leads || []), ...(data?.customers || [])];
    const conflict = allRecords.find(r => {
      const rPhone = String(r.phone || '').trim().toLowerCase();
      const rEmail = String(r.email || '').trim().toLowerCase();
      
      const phoneMatch = checkPhone && rPhone && rPhone === checkPhone;
      const emailMatch = checkEmail && rEmail && rEmail === checkEmail;
      
      // If it matches AND it belongs to someone else (different partner or company directly)
      if ((phoneMatch || emailMatch) && r.partnerId !== partnerId) {
        return true;
      }
      return false;
    });

    return conflict;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || (!form.phone && !form.email)) {
      return toast('Name and at least phone or email is required.', 'error');
    }

    // Checking globally for poaching
    const conflict = checkConflict();
    if (conflict) {
      toast('Oops! This customer is already assigned to another partner or the company directly.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Create a Lead representing this requirement
      const selectedProductNames = products.filter(p => selectedProducts.has(p.id)).map(p => p.name);
      const requirementNotes = [
        form.notes,
        selectedProductNames.length > 0 ? `\n--- Products Interested ---\n${selectedProductNames.join('\n')}` : ''
      ].filter(Boolean).join('\n\n');

      // Determine distributor and retailer IDs based on partner's role
      let distributorId = '';
      let retailerId = '';
      if (partnerApp?.role === 'Distributor') {
        distributorId = partnerId;
      } else if (partnerApp?.role === 'Retailer') {
        retailerId = partnerId;
        distributorId = partnerApp?.parentDistributorId || '';
      }

      const leadId = id();
      await db.transact(
        db.tx.leads[leadId].update({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          custom: { address: form.address.trim() },
          notes: requirementNotes,
          requirement: form.selectedRequirement || '',
          source: ownerProfile?.partnerLeadSource || 'Channel Partners',
          stage: 'New',
          userId: ownerId,
          partnerId,
          distributorId,
          retailerId,
          actorId: user.id,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }),
        db.tx.activityLogs[id()].update({
          entityId: leadId,
          entityType: 'lead',
          text: `Requirement added by Channel Partner`,
          userId: ownerId,
          createdAt: Date.now()
        })
      );

      toast('Requirement submitted successfully!', 'success');
      setForm({ name: '', phone: '', email: '', address: '', notes: '', selectedRequirement: '' });
      setSelectedProducts(new Set());
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div>Loading products catalog...</div>;

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 40%', background: '#fff', padding: 32, borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: 20, marginBottom: 8, color: '#0f172a' }}>Onboard Customer</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>Enter customer details to register them under your account.</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Customer Name *</label>
            <input 
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="E.g. Acme Corp" 
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              required 
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Phone Number *</label>
              <input 
                value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+91..." 
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Email Address</label>
              <input 
                type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="email@..." 
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Address</label>
            <input 
              value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              placeholder="City, Region..." 
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Additional Notes</label>
            <textarea 
              value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Specific color, variant, urgency..." 
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', minHeight: 60 }}
            />
          </div>

          {visibleRequirements.length > 0 && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Requirement Type</label>
              <select 
                value={form.selectedRequirement} 
                onChange={e => setForm(p => ({ ...p, selectedRequirement: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="">-- Select Requirement --</option>
                {visibleRequirements.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          <button 
            type="submit" 
            disabled={submitting}
            style={{ marginTop: 16, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'Submitting...' : 'Submit Requirement'}
          </button>
        </form>
      </div>

      <div style={{ flex: '1 1 50%', background: '#fff', padding: 32, borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 4, color: '#0f172a' }}>Product Catalog</h2>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Select requested products (Optional)</p>
          </div>
          <div style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: 100, fontSize: 13, fontWeight: 700, color: '#334155' }}>
            {selectedProducts.size} Selected
          </div>
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, border: '2px dashed #e2e8f0', borderRadius: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
            <div style={{ color: '#64748b', fontWeight: 600 }}>No products available</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Company hasn't configured partner products yet.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {products.map(p => (
              <div 
                key={p.id} 
                onClick={() => handleToggleProduct(p.id)}
                style={{ 
                  border: `2px solid ${selectedProducts.has(p.id) ? '#2563eb' : '#e2e8f0'}`, 
                  borderRadius: 12, 
                  padding: 16, 
                  cursor: 'pointer',
                  background: selectedProducts.has(p.id) ? '#eff6ff' : '#fff',
                  transition: 'all 0.2s'
                }}
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 120, objectFit: 'contain', marginBottom: 16, background: '#f8fafc', borderRadius: 8 }} />
                ) : (
                  <div style={{ width: '100%', height: 120, background: '#f8fafc', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ width: 40, height: 40 }}>
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                )}
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{p.unit}</div>
                {/* Note: Deliberately hiding rate/price as per requirements */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------ MY CUSTOMERS VIEW ------
function MyCustomersView({ ownerId, partnerId }) {
  const { data, isLoading } = db.useQuery({
    leads: { $: { where: { userId: ownerId, partnerId } } },
    customers: { $: { where: { userId: ownerId, partnerId } } } // If they convert
  });

  const records = useMemo(() => {
    return [
      ...(data?.leads || []).map(l => ({ ...l, __type: 'Lead' })),
      ...(data?.customers || []).map(c => ({ ...c, __type: 'Customer' }))
    ].sort((a, b) => b.createdAt - a.createdAt);
  }, [data]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, color: '#0f172a', margin: 0 }}>My Associated Customers</h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>All clients and leads generated under your partner ID.</p>
        </div>
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ padding: '16px 32px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Date</th>
            <th style={{ padding: '16px 0', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Client Name</th>
            <th style={{ padding: '16px 0', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Contact</th>
            <th style={{ padding: '16px 0', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Status</th>
            <th style={{ padding: '16px 32px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '40px 32px', textAlign: 'center', color: '#94a3b8' }}>
                You haven't onboarded any customers yet.
              </td>
            </tr>
          ) : records.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '16px 32px', fontSize: 14, color: '#475569' }}>{fmtD(r.createdAt)}</td>
              <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{r.name}</td>
              <td style={{ padding: '16px 0', fontSize: 14, color: '#475569' }}>
                <div>{r.phone || '-'}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.email}</div>
              </td>
              <td style={{ padding: '16px 0' }}>
                {r.__type === 'Customer' ? (
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>Active Customer</span>
                ) : (
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>Lead • {r.stage || 'New'}</span>
                )}
              </td>
              <td style={{ padding: '16px 32px', fontSize: 13, color: '#64748b', maxWidth: 300 }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.notes || '-'}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------ MY EARNINGS VIEW ------
function MyEarningsView({ ownerId, partnerId }) {
  const { data, isLoading } = db.useQuery({
    partnerCommissions: { $: { where: { userId: ownerId, partnerId } } }
  });

  const commissions = useMemo(() => {
    return (data?.partnerCommissions || []).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [data]);

  const totalEarned = commissions.filter(c => c.status === 'Paid').reduce((s, c) => s + c.amount, 0);
  const totalPending = commissions.filter(c => c.status === 'Pending Payout').reduce((s, c) => s + c.amount, 0);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, color: '#0f172a', margin: 0 }}>My Earnings</h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>Track your commissions and payouts.</p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
           <div style={{ background: '#fef08a', padding: '8px 16px', borderRadius: 8, textAlign: 'center' }}>
             <div style={{ fontSize: 11, color: '#854d0e', fontWeight: 600, textTransform: 'uppercase' }}>Pending Payout</div>
             <div style={{ fontSize: 16, color: '#713f12', fontWeight: 700 }}>₹{totalPending.toLocaleString()}</div>
           </div>
           <div style={{ background: '#dcfce7', padding: '8px 16px', borderRadius: 8, textAlign: 'center' }}>
             <div style={{ fontSize: 11, color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Paid</div>
             <div style={{ fontSize: 16, color: '#14532d', fontWeight: 700 }}>₹{totalEarned.toLocaleString()}</div>
           </div>
        </div>
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ padding: '16px 32px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Updated</th>
            <th style={{ padding: '16px 0', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Invoice No</th>
            <th style={{ padding: '16px 0', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Client</th>
            <th style={{ padding: '16px 0', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Amount</th>
            <th style={{ padding: '16px 32px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {commissions.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '40px 32px', textAlign: 'center', color: '#94a3b8' }}>
                You haven't earned any commissions yet.
              </td>
            </tr>
          ) : commissions.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
               <td style={{ padding: '16px 32px', fontSize: 13, color: '#475569' }}>{fmtD(c.updatedAt || c.createdAt)}</td>
               <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{c.invoiceNo || '-'}</td>
               <td style={{ padding: '16px 0', fontSize: 14, color: '#475569' }}>{c.clientName || '-'}</td>
               <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>₹{(c.amount || 0).toLocaleString()}</td>
               <td style={{ padding: '16px 32px' }}>
                {c.status === 'Paid' ? (
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>Paid</span>
                ) : c.status === 'Pending Payout' ? (
                  <span style={{ background: '#fef08a', color: '#854d0e', padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>Pending Payout</span>
                ) : (
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 }} title="Waiting for client to pay the invoice">Awaiting Client Val</span>
                )}
               </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
// ------ PROFILE SETTINGS VIEW ------
function ProfileSettingsView({ ownerId, partnerId }) {
  const { data, isLoading } = db.useQuery({
    partnerApplications: { $: { where: { id: partnerId } } }
  });

  const partner = data?.partnerApplications?.[0];
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [resetting, setResetting] = useState(false);
  const toast = useToast();

  React.useEffect(() => {
    if (partner && !form) {
      setForm({
        companyName: partner.companyName || '',
        email: partner.email || '',
        phone: partner.phone || '',
        village: partner.village || '',
        city: partner.city || '',
        district: partner.district || '',
        pincode: partner.pincode || '',
        state: partner.state || '',
        address: partner.address || '',
        taxId: partner.taxId || ''
      });
    }
  }, [partner, form]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Build field-level diff for activity log
      const fieldLabels = {
        companyName: 'Company Name', village: 'Village', city: 'City',
        district: 'District', pincode: 'Pincode', state: 'State',
        address: 'Address', taxId: 'Tax ID'
      };
      const changes = [];
      Object.entries(fieldLabels).forEach(([key, label]) => {
        const oldVal = (partner[key] || '').trim();
        const newVal = (form[key] || '').trim();
        if (oldVal !== newVal) {
          changes.push(`${label}: "${oldVal || '—'}" → "${newVal || '—'}"`);
        }
      });

      const logText = changes.length > 0
        ? `Profile updated by partner: ${changes.join(', ')}`
        : 'Profile updated by partner (no field changes detected)';

      await db.transact(
        db.tx.partnerApplications[partnerId].update({
          ...form,
          updatedAt: Date.now()
        }),
        db.tx.activityLogs[id()].update({
          entityId: partnerId,
          entityType: 'partner',
          text: logText,
          userId: ownerId,
          createdAt: Date.now()
        })
      );
      toast('Profile updated successfully!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPass || newPass.length < 6) return toast('Password must be at least 6 characters', 'error');
    if (newPass !== confirmPass) return toast('Passwords do not match', 'error');
    
    setResetting(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-partner-password',
          email: partner.email,
          password: newPass,
          ownerUserId: ownerId,
          partnerId: partnerId
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update password');
      
      toast('Password updated successfully!', 'success');
      setNewPass('');
      setConfirmPass('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setResetting(false);
    }
  };

  if (isLoading || !form) return <div>Loading profile...</div>;

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, color: '#0f172a', margin: 0 }}>Business Profile</h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>Manage your business information and contact details.</p>
      </div>

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Company Name</label>
            <input value={form.companyName} onChange={f('companyName')} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8 }} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Tax ID / GSTIN</label>
            <input value={form.taxId} onChange={f('taxId')} placeholder="22AAAAA0000A1Z5" style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8 }} />
          </div>
        </div>

        <div className="form-group">
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#64748b', marginBottom: 6 }}>Official Email (Fixed)</label>
          <input value={form.email} readOnly type="email" style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }} />
        </div>
        <div className="form-group">
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#64748b', marginBottom: 6 }}>Official Phone (Fixed)</label>
          <input value={form.phone} readOnly style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }} />
        </div>

        <div style={{ gridColumn: 'span 2', marginTop: -8, marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontStyle: 'italic' }}>Note: Email and Phone are managed by the company. Please contact support to update these.</p>
        </div>

        <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: 20, borderRadius: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <h4 style={{ gridColumn: 'span 2', margin: 0, fontSize: 14, color: '#475569' }}>Location Details</h4>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#64748b', marginBottom: 4 }}>Village / Area</label>
            <input value={form.village} onChange={f('village')} style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#64748b', marginBottom: 4 }}>City / Town</label>
            <input value={form.city} onChange={f('city')} style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#64748b', marginBottom: 4 }}>District</label>
            <input value={form.district} onChange={f('district')} style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#64748b', marginBottom: 4 }}>Pincode</label>
            <input value={form.pincode} onChange={f('pincode')} style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#64748b', marginBottom: 4 }}>State</label>
            <input value={form.state} onChange={f('state')} style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#64748b', marginBottom: 4 }}>Full Postal Address</label>
            <textarea value={form.address} onChange={f('address')} style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, minHeight: 60 }} />
          </div>
        </div>

        <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button 
            type="submit" 
            disabled={saving}
            style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 40, borderTop: '2px dashed #f1f5f9', paddingTop: 32 }}>
        <h3 style={{ fontSize: 18, color: '#0f172a', margin: '0 0 8px 0' }}>Security & Password</h3>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>Update your portal login password.</p>
        
        <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>New Password</label>
            <input 
              type="password" 
              value={newPass} 
              onChange={e => setNewPass(e.target.value)} 
              placeholder="Min 6 characters"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8 }} 
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Confirm New Password</label>
            <input 
              type="password" 
              value={confirmPass} 
              onChange={e => setConfirmPass(e.target.value)} 
              placeholder="Repeat password"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8 }} 
            />
          </div>
          <button 
            onClick={handleUpdatePassword}
            disabled={resetting || !newPass}
            style={{ alignSelf: 'flex-start', padding: '10px 24px', background: '#f8fafc', color: '#334155', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: resetting ? 'not-allowed' : 'pointer' }}
          >
            {resetting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
