import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const EMPTY_CUSTOMER = { name: '', email: '', phone: '', custom: {} };

export default function Customers({ user }) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [noteText, setNoteText] = useState('');
  const toast = useToast();

  const { data } = db.useQuery({
    customers: { $: { where: { userId: user.id } } },
    userProfiles: { $: { where: { userId: user.id } } },
    projects: { $: { where: { userId: user.id } } },
    quotes: { $: { where: { userId: user.id } } },
    invoices: { $: { where: { userId: user.id } } },
    tasks: { $: { where: { userId: user.id } } },
    activityLogs: { $: { where: { userId: user.id } } },
    amc: { $: { where: { userId: user.id } } },
    subscriptions: { $: { where: { userId: user.id } } },
    recur: { $: { where: { userId: user.id } } },
  });
  const customers = data?.customers || [];
  const customFields = data?.userProfiles?.[0]?.customFields || [];
  const projects = data?.projects || [];
  const quotes = data?.quotes || [];
  const invoices = data?.invoices || [];
  const tasks = data?.tasks || [];
  const activityLogs = data?.activityLogs || [];
  const amcList = data?.amc || [];
  const subsList = data?.subscriptions || [];
  const recurList = data?.recur || [];

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
  const openEdit = (c) => { setEditData(c); setForm({ name: c.name, email: c.email || '', phone: c.phone || '', custom: c.custom || {} }); setModal(true); };

  const saveCustomer = async () => {
    if (!form.name.trim()) { toast('Name is required', 'error'); return; }
    if (!form.email.trim()) { toast('Email is mandatory for clients', 'error'); return; }
    try {
      if (editData) {
        await db.transact(db.tx.customers[editData.id].update({ ...form, userId: user.id, updatedAt: Date.now() }));
        toast('Customer updated!', 'success');
      } else {
        await db.transact(db.tx.customers[id()].update({ ...form, userId: user.id, createdAt: Date.now() }));
        toast(`Customer "${form.name}" created!`, 'success');
      }
      setModal(false);
    } catch (e) { toast('Error saving customer', 'error'); }
  };

  const deleteCustomer = async (cId) => {
    if (!confirm('Delete this customer?')) return;
    await db.transact(db.tx.customers[cId].delete());
    toast('Customer deleted', 'error');
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const cf = (k) => (e) => setForm(p => ({ ...p, custom: { ...(p.custom || {}), [k]: e.target.value } }));

  const [viewCustomer, setViewCustomer] = useState(null);

  if (viewCustomer) {
    const c = viewCustomer;
    // Matching by name for related records (as names are typed in other modules usually)
    const cName = c.name.toLowerCase();
    
    // Safety check in case the client field doesn't exist
    const cReq = (x) => (x.client || x.customer || '').toLowerCase() === cName;
    
    const relProjects = projects.filter(cReq);
    const relQuotes = quotes.filter(cReq);
    const relInvoices = invoices.filter(cReq);
    const relTasks = tasks.filter(t => (t.client || '').toLowerCase() === cName || (t.customer || '').toLowerCase() === cName);
    
    // CRM entities matching client name
    const relAmc = amcList.filter(cReq);
    const relSubs = subsList.filter(cReq);
    const relRecur = recurList.filter(cReq);
    
    // Sort logs newest first
    const cLogs = activityLogs.filter(l => l.entityId === c.id).sort((a,b) => b.createdAt - a.createdAt);

    const addNote = async () => {
      if (!noteText.trim()) return;
      await db.transact(db.tx.activityLogs[id()].update({
        entityId: c.id,
        entityType: 'customer',
        text: noteText.trim(),
        userId: user.id,
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
                {c.phone && <span>☏ {c.phone}</span>}
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit Details</button>
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
          <div className="stat-card sc-blue"><div className="lbl">AMC / Subs</div><div className="val">{relAmc.length + relSubs.length + relRecur.length}</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          
          {/* Projects Box */}
          <div className="tw">
            <div className="tw-head"><h3>Projects</h3></div>
            {relProjects.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No projects found for {c.name}.</div> : (
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
            )}
          </div>

          {/* Invoices Box */}
          <div className="tw">
            <div className="tw-head"><h3>Invoices</h3></div>
            {relInvoices.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No invoices found for {c.name}.</div> : (
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
            )}
          </div>

          {/* Quotes Box */}
          <div className="tw">
            <div className="tw-head"><h3>Quotations</h3></div>
            {relQuotes.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No quotes found for {c.name}.</div> : (
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
            )}
          </div>

          {/* Tasks Box */}
          <div className="tw">
            <div className="tw-head"><h3>Tasks</h3></div>
            {relTasks.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No tasks found for {c.name}.</div> : (
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
            )}
          </div>

          {/* Subscriptions & AMC Box */}
          <div className="tw">
            <div className="tw-head"><h3>Subscriptions & AMC</h3></div>
            {(relAmc.length === 0 && relSubs.length === 0 && relRecur.length === 0) ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No active contracts/subs found.</div> : (
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
                  {relSubs.map(s => (
                    <tr key={s.id}>
                      <td><strong>Sub ({s.service})</strong></td>
                      <td style={{ fontWeight: 600 }}>₹{s.amount} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>/{s.frequency}</span></td>
                      <td><span className={`badge ${s.status === 'Active' ? 'bg-green' : 'bg-gray'}`}>{s.status}</span></td>
                    </tr>
                  ))}
                  {relRecur.map(r => (
                    <tr key={r.id}>
                      <td><strong>Recur. Inv</strong></td>
                      <td style={{ fontWeight: 600 }}>₹{r.amount} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>/{r.frequency}</span></td>
                      <td><span className={`badge ${r.status === 'Active' ? 'bg-green' : 'bg-gray'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <div className="mo open" onClick={e => e.target === e.currentTarget && setModal(false)}>
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
                  {customFields.length > 0 && <div className="fg span2" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                    <h4 style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Custom Fields (Optional)</h4>
                    <div className="fgrid">
                      {customFields.map(field => (
                        <div key={field.name} className="fg">
                          <label>{field.name}</label>
                          {field.type === 'dropdown' ? (
                            <select value={form.custom[field.name] || ''} onChange={cf(field.name)}>
                              <option value="">Select...</option>
                              {field.options.split(',').map(o => <option key={o.trim()}>{o.trim()}</option>)}
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

  return (
    <div>
      {/* Header */}
      <div className="sh">
        <div><h2>Customers</h2><div className="sub">Manage converted leads and clients</div></div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Create Customer</button>
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
        <div style={{ overflowX: 'auto' }}>
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
                  <td><strong>{c.name}</strong></td>
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
                        <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { openEdit(c); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>✎ Edit</div>
                        <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#dc2626' }} onClick={() => { deleteCustomer(c.id); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>🗑 Delete</div>
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
        <div className="mo open" onClick={e => e.target === e.currentTarget && setModal(false)}>
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
                
                {/* Dynamic Custom Fields */}
                {customFields.length > 0 && <div className="fg span2" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                  <h4 style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Custom Fields (Optional)</h4>
                  <div className="fgrid">
                    {customFields.map(field => (
                      <div key={field.name} className="fg">
                        <label>{field.name}</label>
                        {field.type === 'dropdown' ? (
                          <select value={form.custom[field.name] || ''} onChange={cf(field.name)}>
                            <option value="">Select...</option>
                            {field.options.split(',').map(o => <option key={o.trim()}>{o.trim()}</option>)}
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
