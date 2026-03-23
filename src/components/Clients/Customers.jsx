import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { INDIAN_STATES, COUNTRIES } from '../../utils/helpers';

const EMPTY_CUSTOMER = { name: '', email: '', phone: '', address: '', state: '', country: 'India', pincode: '', gstin: '', custom: {} };

export default function Customers({ user, perms, ownerId }) {
  const canCreate = perms?.can('Customers', 'create') === true;
  const canEdit = perms?.can('Customers', 'edit') === true;
  const canDelete = perms?.can('Customers', 'delete') === true;

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [noteText, setNoteText] = useState('');
  const toast = useToast();

  const { data } = db.useQuery({
    customers: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } },
    projects: { $: { where: { userId: ownerId } } },
    quotes: { $: { where: { userId: ownerId } } },
    invoices: { $: { where: { userId: ownerId } } },
    tasks: { $: { where: { userId: ownerId } } },
    activityLogs: { $: { where: { userId: ownerId } } },
    amc: { $: { where: { userId: ownerId } } },
    leads: { $: { where: { userId: ownerId } } },
  });
  const customers = useMemo(() => {
    return data?.customers || [];
  }, [data?.customers]);

  const customFields = data?.userProfiles?.[0]?.customFields || [];
  const projects = data?.projects || [];
  const quotes = data?.quotes || [];
  const invoices = data?.invoices || [];
  const tasks = data?.tasks || [];
  const activityLogs = data?.activityLogs || [];
  const amcList = data?.amc || [];
  const leads = data?.leads || [];

  const filtered = useMemo(() => {
    return customers.filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      // search in name, email, phone, and all custom fields
      const customVals = c.custom ? Object.values(c.custom) : [];
      return [c.name, c.email, c.phone, ...customVals].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [customers, search]);

  const openCreate = () => { setEditData(null); setForm(EMPTY_CUSTOMER); setModal(true); };
  const openEdit = (c) => { setEditData(c); setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '', state: c.state || '', country: c.country || 'India', pincode: c.pincode || '', gstin: c.gstin || '', custom: c.custom || {} }); setModal(true); };

  const logActivity = async (customerId, text) => {
    await db.transact(db.tx.activityLogs[id()].update({
      entityId: customerId,
      entityType: 'customer',
      text,
      userId: ownerId,
      actorId: user.id,
      userName: user.email,
      createdAt: Date.now()
    }));
  };

  const saveCustomer = async () => {
    if (editData && !canEdit) { toast('Permission denied: cannot edit customers', 'error'); return; }
    if (!editData && !canCreate) { toast('Permission denied: cannot create customers', 'error'); return; }
    if (!form.name.trim()) { toast('Name is required', 'error'); return; }
    if (!form.email.trim()) { toast('Email is mandatory for clients', 'error'); return; }
    try {
      const txs = [];
      if (editData) {
        const changes = [];
        const fields = { name: 'Name', phone: 'Phone', email: 'Email', address: 'Address', state: 'State', country: 'Country', pincode: 'Pincode', gstin: 'GSTIN' };
        Object.entries(fields).forEach(([k, label]) => {
          if (editData[k] !== form[k]) {
            const oldVal = editData[k] || 'None';
            const newVal = form[k] || 'None';
            changes.push(`${label} changed from "${oldVal}" to "${newVal}"`);
          }
        });

        const oldCustom = editData.custom || {};
        const newCustom = form.custom || {};
        customFields.forEach(cf => {
          if (oldCustom[cf.name] !== newCustom[cf.name]) {
            changes.push(`${cf.name} (Custom) changed from "${oldCustom[cf.name] || 'None'}" to "${newCustom[cf.name] || 'None'}"`);
          }
        });

        txs.push(db.tx.customers[editData.id].update({ ...form, userId: ownerId, actorId: user.id, updatedAt: Date.now() }));
        
        // Sync to Lead if name matches (case-insensitive & trimmed)
        const lMatch = leads.find(l => (l.name || '').trim().toLowerCase() === (editData.name || '').trim().toLowerCase());
        if (lMatch) {
          txs.push(db.tx.leads[lMatch.id].update({ name: form.name, email: form.email, phone: form.phone }));
          txs.push(db.tx.activityLogs[id()].update({
            entityId: lMatch.id, entityType: 'lead', text: `Contact details synced from Customer update (${form.name}).`,
            userId: ownerId, actorId: user.id, userName: user.email, createdAt: Date.now()
          }));
        }

        if (changes.length > 0) {
          txs.push(db.tx.activityLogs[id()].update({
            entityId: editData.id, entityType: 'customer', text: changes.join(' | '),
            userId: ownerId, actorId: user.id, userName: user.email, createdAt: Date.now()
          }));
        }
        await db.transact(txs);
        toast('Customer updated!', 'success');
      } else {
        const newId = id();
        txs.push(db.tx.customers[newId].update({ ...form, userId: ownerId, actorId: user.id, createdAt: Date.now() }));
        txs.push(db.tx.activityLogs[id()].update({
          entityId: newId, entityType: 'customer', text: 'Customer created',
          userId: ownerId, actorId: user.id, userName: user.email, createdAt: Date.now()
        }));
        await db.transact(txs);
        toast(`Customer "${form.name}" created!`, 'success');
      }
      setModal(false);
    } catch (e) { toast('Error saving customer', 'error'); }
  };

  const deleteCustomer = async (cId) => {
    if (!canDelete) { toast('Permission denied: cannot delete customers', 'error'); return; }
    if (!confirm('Delete customer?')) return;
    await db.transact(db.tx.customers[cId].delete());
    toast('Customer deleted', 'error');
  };

  const syncWonLeads = async () => {
    const wonStage = data?.userProfiles?.[0]?.wonStage || 'Won';
    const wonLeads = leads.filter(l => l.stage === wonStage);
    if (wonLeads.length === 0) return toast('No "Won" leads found to sync.', 'info');

    const txs = [];
    let count = 0;

    wonLeads.forEach(l => {
      // Check if already a customer
      const exists = customers.find(c => 
        (l.email && c.email === l.email) || 
        (l.phone && c.phone === l.phone) ||
        (c.name.trim().toLowerCase() === l.name.trim().toLowerCase())
      );
      if (!exists) {
        const newId = id();
        txs.push(db.tx.customers[newId].update({
          name: l.name,
          email: l.email || '',
          phone: l.phone || '',
          address: l.address || '',
          userId: ownerId,
          actorId: user.id,
          createdAt: Date.now()
        }));
        txs.push(db.tx.activityLogs[id()].update({
          entityId: newId, entityType: 'customer', text: `Customer created via Sync from Lead "${l.name}"`,
          userId: ownerId, actorId: user.id, userName: user.email, createdAt: Date.now()
        }));
        count++;
      }
    });

    if (txs.length > 0) {
      await db.transact(txs);
      toast(`Synced ${count} leads to customers!`, 'success');
    } else {
      toast('All "Won" leads are already customers.', 'info');
    }
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const cf = (k) => (e) => setForm(p => ({ ...p, custom: { ...(p.custom || {}), [k]: e.target.value } }));

  const [viewCustomer, setViewCustomer] = useState(null);

  if (viewCustomer) {
    const c = viewCustomer;
    // Matching by name for related records (as names are typed in other modules usually)
    const cName = c.name.toLowerCase();
    
    // Safety check in case the client field doesn't exist
    const cReq = (x) => (x?.client || x?.customer || '').toLowerCase() === cName;
    
    const relProjects = projects.filter(cReq);
    const relQuotes = quotes.filter(cReq);
    const relInvoices = invoices.filter(cReq);
    const relTasks = tasks.filter(t => (t?.client || '').toLowerCase() === cName || (t?.customer || '').toLowerCase() === cName);
    
    // CRM entities matching client name
    const relAmc = amcList.filter(cReq);
    
    // Sort logs newest first
    const cLogs = (activityLogs || []).filter(l => l.entityId === c.id).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

    const addNote = async () => {
    if (!canEdit) { toast('Permission denied: cannot add notes', 'error'); return; }
    if (!noteText.trim()) return;
      await db.transact(db.tx.activityLogs[id()].update({
        entityId: c.id,
        entityType: 'customer',
        text: noteText.trim(),
        userId: ownerId,
        actorId: user.id,
        userName: user.email,
        createdAt: Date.now()
      }));
      setNoteText('');
      toast('Note added', 'success');
    };
    
    return (
      <div>
        <div className="sh" style={{ marginBottom: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-icon" onClick={() => setViewCustomer(null)}>← Back</button>
            <div>
              <h2 style={{ fontSize: 24, margin: 0 }}>{c.name}</h2>
              <div className="sub" style={{ fontSize: 13, marginTop: 4 }}>
                {c.email && <span style={{ marginRight: 15 }}>✉ {c.email}</span>}
                {c.phone && <span style={{ marginRight: 15 }}>☏ {c.phone}</span>}
                {c.gstin && <span>GSTIN: {c.gstin}</span>}
              </div>
            </div>
          </div>
          {canEdit && <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit Details</button>}
        </div>

        {customFields.length > 0 && Object.keys(c.custom || {}).length > 0 && (
          <div className="tw" style={{ padding: 18, marginBottom: 20 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>Custom Fields</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {customFields.map(cf => c.custom?.[cf.name] && (
                <div key={cf.name}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{cf.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.custom[cf.name]}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="stat-grid" style={{ marginBottom: 25 }}>
          <div className="stat-card sc-blue"><div className="lbl">Projects</div><div className="val">{relProjects.length}</div></div>
          <div className="stat-card sc-yellow"><div className="lbl">Quotations</div><div className="val">{relQuotes.length}</div></div>
          <div className="stat-card sc-green"><div className="lbl">Invoices</div><div className="val">{relInvoices.length}</div></div>
          <div className="stat-card sc-purple"><div className="lbl">Tasks</div><div className="val">{relTasks.length}</div></div>
          <div className="stat-card sc-blue"><div className="lbl">AMC</div><div className="val">{relAmc.length}</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          
          {/* Projects Box */}
          <div className="tw">
            <div className="tw-head"><h3>Projects</h3></div>
            {relProjects.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No projects found for {c.name}.</div> : (
              <div className="tw-scroll">
                <table>
                  <thead><tr><th>Name</th><th>Status</th></tr></thead>
                  <tbody>
                    {relProjects.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.name}</strong></td>
                        <td><span className={`badge bg-gray`}>{p.status || 'Active'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Invoices Box */}
          <div className="tw">
            <div className="tw-head"><h3>Invoices</h3></div>
            {relInvoices.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No invoices found for {c.name}.</div> : (
              <div className="tw-scroll">
                <table>
                  <thead><tr><th>No</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {relInvoices.map(inv => (
                      <tr key={inv.id}>
                        <td><strong>{inv.no}</strong></td>
                        <td style={{ fontWeight: 700 }}>₹{inv.total}</td>
                        <td><span className={`badge ${inv.status === 'Paid' ? 'bg-green' : inv.status === 'Overdue' ? 'bg-red' : 'bg-gray'}`}>{inv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quotes Box */}
          <div className="tw">
            <div className="tw-head"><h3>Quotations</h3></div>
            {relQuotes.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No quotes found for {c.name}.</div> : (
              <div className="tw-scroll">
                <table>
                  <thead><tr><th>No</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {relQuotes.map(q => (
                      <tr key={q.id}>
                        <td><strong>{q.no}</strong></td>
                        <td style={{ fontWeight: 700 }}>₹{q.total}</td>
                        <td><span className={`badge ${q.status === 'Accepted' ? 'bg-green' : 'bg-gray'}`}>{q.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tasks Box */}
          <div className="tw">
            <div className="tw-head"><h3>Tasks</h3></div>
            {relTasks.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No tasks found for {c.name}.</div> : (
              <div className="tw-scroll">
                <table>
                  <thead><tr><th>Title</th><th>Status</th></tr></thead>
                  <tbody>
                    {relTasks.map(t => (
                      <tr key={t.id}>
                        <td><strong>{t.title}</strong></td>
                        <td><span className={`badge ${t.stage === 'Completed' ? 'bg-green' : 'bg-blue'}`}>{t.stage}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AMC Box */}
          <div className="tw">
            <div className="tw-head"><h3>AMC Contracts</h3></div>
            {relAmc.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No active AMC contracts found.</div> : (
              <div className="tw-scroll">
                <table>
                  <thead><tr><th>Type</th><th>Plan / Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {relAmc.map(a => (
                      <tr key={a.id}>
                        <td><strong>AMC</strong> <span style={{ fontSize: 11, color: 'var(--muted)' }}>({a.contractNo})</span></td>
                        <td style={{ fontWeight: 600 }}>₹{a.amount} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>({a.plan})</span></td>
                        <td><span className={`badge ${a.status === 'Active' ? 'bg-green' : 'bg-red'}`}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Activity Logs Box */}
        <div className="tw" style={{ marginTop: 20 }}>
          <div className="tw-head"><h3>Activity Logs & Notes</h3></div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Type a note or log an activity..." style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
              <button className="btn btn-primary" onClick={addNote}>Add Note</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cLogs.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 20, background: '#f8fafc', borderRadius: 8 }}>No activity recorded yet for {c.name}.</div> : 
                cLogs.map(l => (
                  <div key={l.id} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{l.userName || 'System'}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(l.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: '#333' }}>{l.text}</div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
        
        {/* Using the same modal block below (by just un-returning) requires breaking it out, but we can just duplicate the modal logic for the single view page edit */}
        {modal && (
          <div className="mo open">
            <div className="mo-box">
              <div className="mo-head">
                <h3>Edit Customer</h3>
                <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
              </div>
              <div className="mo-body">
                <div className="fgrid">
                  <div className="fg span2"><label>Name *</label><input value={form.name} onChange={f('name')} placeholder="Full name" /></div>
                  <div className="fg"><label>Email *</label><input type="email" value={form.email} onChange={f('email')} /></div>
                  <div className="fg"><label>Phone</label><input value={form.phone} onChange={f('phone')} placeholder="+91..." /></div>
                  <div className="fg span2"><label>Address</label><textarea value={form.address} onChange={f('address')} placeholder="Full address" style={{ minHeight: 60 }} /></div>
                  <div className="fg"><label>Country</label>
                    <select value={form.country} onChange={f('country')}>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label>State</label>
                    <select value={form.state} onChange={f('state')}>
                      <option value="">Select State...</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label>Pincode</label><input value={form.pincode} onChange={f('pincode')} placeholder="Postal code" /></div>
                  <div className="fg"><label>GSTIN</label><input value={form.gstin} onChange={f('gstin')} placeholder="GST Number" /></div>
                  {customFields.length > 0 && <div className="fg span2" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                    <h4 style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Custom Fields (Optional)</h4>
                    <div className="fgrid">
                      {customFields.map(field => (
                        <div key={field.name} className="fg">
                          <label>{field.name}</label>
                          {field.type === 'dropdown' ? (
                            <select value={(form.custom || {})[field.name] || ''} onChange={cf(field.name)}>
                              <option value="">Select...</option>
                              {(field.options || '').split(',').map(o => <option key={o.trim()}>{o.trim()}</option>)}
                            </select>
                          ) : (
                            <input type={field.type === 'number' ? 'number' : 'text'} value={form.custom[field.name] || ''} onChange={cf(field.name)} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>}
                </div>
              </div>
              <div className="mo-foot">
                <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveCustomer}>Save Customer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!data) return <div className="p-xl" style={{ textAlign: 'center', color: 'var(--muted)' }}><div className="spinner" style={{ margin: '0 auto 10px' }}></div>Loading Customers...</div>;

  return (
    <div>
      {/* Header */}
      <div className="sh">
        <div><h2>Customers</h2><div className="sub">Manage converted leads and clients</div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canEdit && <button className="btn btn-secondary btn-sm" onClick={syncWonLeads}>Sync Won Leads</button>}
          {canCreate && <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Create Customer</button>}
        </div>
      </div>

      {/* Table */}
      <div className="tw">
        <div className="tw-head">
          <h3>All Customers ({filtered.length})</h3>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="tw-scroll">
          <table style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Created</th>
                {customFields.map(cf => <th key={cf.name}>{cf.name}</th>)}
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6 + customFields.length} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No customers found</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                  <td>
                    <strong>{c.name}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      {c.phone && (
                        <>
                          <a href={`tel:${c.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', textDecoration: 'none' }} title="Call">
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          </a>
                          <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#e8fdf0', color: '#16a34a', textDecoration: 'none' }} title="WhatsApp">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                          </a>
                          <a href={`sms:${c.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#f5f3ff', color: '#7c3aed', textDecoration: 'none' }} title="SMS">
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                          </a>
                        </>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#f3f4f6', color: '#4b5563', textDecoration: 'none' }} title="Email">
                          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{c.phone || '-'}</td>
                  <td style={{ fontSize: 12 }}>{c.email || '-'}</td>
                  <td style={{ fontSize: 11 }}>{fmtD(c.createdAt || Date.now())}</td>
                  {customFields.map(cf => (
                    <td key={cf.name} style={{ fontSize: 11 }}>{c.custom?.[cf.name] || '-'}</td>
                  ))}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setViewCustomer(c)}>View</button>
                      <button className="btn-icon" onClick={(e) => {
                        const dm = e.currentTarget.nextElementSibling;
                        document.querySelectorAll('.dd-menu').forEach(el => el !== dm && (el.style.display = 'none'));
                        dm.style.display = dm.style.display === 'block' ? 'none' : 'block';
                      }}>⋮</button>
                      <div className="dd-menu" style={{ display: 'none', position: 'absolute', right: 0, top: 28, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 100, overflow: 'hidden' }}>
                        {canEdit && <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { openEdit(c); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>✎ Edit</div>}
                        {canDelete && <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#dc2626' }} onClick={() => { deleteCustomer(c.id); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>🗑 Delete</div>}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="mo open">
          <div className="mo-box">
            <div className="mo-head">
              <h3>{editData ? 'Edit Customer' : 'Create Customer'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg span2"><label>Name *</label><input value={form.name} onChange={f('name')} placeholder="Full name" /></div>
                <div className="fg"><label>Email *</label><input type="email" value={form.email} onChange={f('email')} /></div>
                <div className="fg"><label>Phone</label><input value={form.phone} onChange={f('phone')} placeholder="+91..." /></div>
                <div className="fg span2"><label>Address</label><textarea value={form.address} onChange={f('address')} placeholder="Full address" style={{ minHeight: 60 }} /></div>
                <div className="fg"><label>Country</label>
                  <select value={form.country} onChange={f('country')}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="fg"><label>State</label>
                  <select value={form.state} onChange={f('state')}>
                    <option value="">Select State...</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Pincode</label><input value={form.pincode} onChange={f('pincode')} placeholder="Postal code" /></div>
                <div className="fg"><label>GSTIN</label><input value={form.gstin} onChange={f('gstin')} placeholder="GST Number" /></div>
                
                {/* Dynamic Custom Fields */}
                {customFields.length > 0 && <div className="fg span2" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                  <h4 style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Custom Fields (Optional)</h4>
                  <div className="fgrid">
                    {customFields.map(field => (
                      <div key={field.name} className="fg">
                        <label>{field.name}</label>
                        {field.type === 'dropdown' ? (
                          <select value={(form.custom || {})[field.name] || ''} onChange={cf(field.name)}>
                            <option value="">Select...</option>
                            {(field.options || '').split(',').map(o => <option key={o.trim()}>{o.trim()}</option>)}
                          </select>
                        ) : (
                          <input type={field.type === 'number' ? 'number' : 'text'} value={form.custom[field.name] || ''} onChange={cf(field.name)} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>}
              </div>
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveCustomer}>Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
