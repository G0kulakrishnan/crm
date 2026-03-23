import React, { useState } from 'react';
import db from '../../instant';


const API_LIST = [
  { 
    group: 'Authentication', 
    path: '/api/auth', 
    method: 'POST', 
    desc: 'Unified authentication gateway for user identity and security.',
    actions: [
      { name: 'Login', method: 'POST', body: { action: 'login', email: 'user@example.com', password: 'yourpassword' }, resp: { success: true, user: { id: '...', email: '...' } } },
      { name: 'Register', method: 'POST', body: { action: 'register', email: 'user@example.com', password: 'yourpassword', name: 'John Doe' }, resp: { success: true, id: '...' } },
      { name: 'OTP Verify', method: 'POST', body: { action: 'verify-otp', email: 'user@example.com', otp: '123456' }, resp: { success: true, token: '...' } }
    ]
  },
  {
    group: 'Leads (CRM)',
    path: '/api/data/leads',
    method: 'ALL',
    desc: 'Manage potential clients and inquiries.',
    actions: [
      { name: 'Create Lead (POST)', method: 'POST', body: { ownerId: 'WORKSPACE_ID', actorId: 'USER_ID', name: 'John Smith', email: 'john@example.com', phone: '9876543210', source: 'Website', stage: 'New', notes: 'Initial inquiry' }, resp: { success: true, id: '12345...' } },
      { name: 'List Leads (GET)', method: 'GET', query: 'ownerId=WORKSPACE_ID', resp: { success: true, data: [{ id: '123', name: 'John Smith', stage: 'New' }] } },
      { name: 'Update Lead (PATCH)', method: 'PATCH', body: { id: 'LEAD_ID', ownerId: 'WORKSPACE_ID', stage: 'Contacted' }, resp: { success: true, message: 'Updated' } },
      { name: 'Delete Lead (DELETE)', method: 'DELETE', body: { id: 'LEAD_ID', ownerId: 'WORKSPACE_ID' }, resp: { success: true, message: 'Deleted' } }
    ]
  },
  {
    group: 'Customers',
    path: '/api/data/customers',
    method: 'ALL',
    desc: 'Manage your verified clients and their details.',
    actions: [
      { name: 'Create Customer (POST)', method: 'POST', body: { ownerId: '...', actorId: '...', name: 'Acme Corp', email: 'billing@acme.com', phone: '9988776655', address: '123 Street', state: 'Tamil Nadu', country: 'India', gstin: '22AAAAA0000A1Z5' }, resp: { success: true, id: '...' } },
      { name: 'List Customers (GET)', method: 'GET', query: 'ownerId=...', resp: { success: true, data: [{ id: '...', name: 'Acme Corp' }] } },
      { name: 'Update Customer (PATCH)', method: 'PATCH', body: { id: 'CUST_ID', ownerId: '...', email: 'new@acme.com' }, resp: { success: true, message: 'Updated' } },
      { name: 'Delete Customer (DELETE)', method: 'DELETE', body: { id: 'CUST_ID', ownerId: '...' }, resp: { success: true, message: 'Deleted' } }
    ]
  },
  {
    group: 'Projects',
    path: '/api/data/projects',
    method: 'ALL',
    desc: 'Manage ongoing work and client projects.',
    actions: [
      { name: 'Create Project (POST)', method: 'POST', body: { ownerId: '...', actorId: '...', name: 'Website Redesign', client: 'Acme Corp', status: 'In Progress', budget: 50000, deadline: '2026-12-31' }, resp: { success: true, id: '...' } },
      { name: 'List Projects (GET)', method: 'GET', query: 'ownerId=...', resp: { success: true, data: [{ id: '...', name: 'Website Redesign', status: 'In Progress' }] } },
      { name: 'Update Project (PATCH)', method: 'PATCH', body: { id: 'PROJ_ID', ownerId: '...', status: 'Completed' }, resp: { success: true, message: 'Updated' } },
      { name: 'Delete Project (DELETE)', method: 'DELETE', body: { id: 'PROJ_ID', ownerId: '...' }, resp: { success: true, message: 'Deleted' } }
    ]
  },
  {
    group: 'Tasks',
    path: '/api/data/tasks',
    method: 'ALL',
    desc: 'Manage individual tasks within projects or independently.',
    actions: [
      { name: 'Create Task (POST)', method: 'POST', body: { ownerId: '...', actorId: '...', title: 'Design Homepage', projectId: 'PROJ_ID', priority: 'High', status: 'Pending', assignedTo: 'Designer Name' }, resp: { success: true, id: '...' } },
      { name: 'List Tasks (GET)', method: 'GET', query: 'ownerId=...', resp: { success: true, data: [{ id: '...', title: 'Design Homepage', status: 'Pending' }] } },
      { name: 'Update Task (PATCH)', method: 'PATCH', body: { id: 'TASK_ID', ownerId: '...', status: 'Completed' }, resp: { success: true, message: 'Updated' } },
      { name: 'Delete Task (DELETE)', method: 'DELETE', body: { id: 'TASK_ID', ownerId: '...' }, resp: { success: true, message: 'Deleted' } }
    ]
  },
  {
    group: 'Quotations',
    path: '/api/data/quotations',
    method: 'ALL',
    desc: 'Generate and manage sales quotes.',
    actions: [
      { name: 'Create Quote (POST)', method: 'POST', body: { no: 'QUOTE/2026/001', client: 'Acme Corp', date: '2026-03-22', validUntil: '2026-04-05', status: 'Created', items: [{ name: 'Web Dev', qty: 1, rate: 10000, taxRate: 18 }], sub: 10000, taxAmt: 1800, total: 11800 }, resp: { success: true, id: '...' } },
      { name: 'List Quotes (GET)', method: 'GET', query: 'ownerId=...', resp: { success: true, data: [{ id: '...', no: 'QUOTE/2026/001' }] } },
      { name: 'Update Quote (PATCH)', method: 'PATCH', body: { id: 'QUOTE_ID', ownerId: '...', status: 'Sent' }, resp: { success: true, message: 'Updated' } },
      { name: 'Delete Quote (DELETE)', method: 'DELETE', body: { id: 'QUOTE_ID', ownerId: '...' }, resp: { success: true, message: 'Deleted' } }
    ]
  },
  {
    group: 'Invoices',
    path: '/api/data/invoices',
    method: 'ALL',
    desc: 'Generate, manage, and track tax invoices.',
    actions: [
      { name: 'Create Invoice (POST)', method: 'POST', body: { no: 'INV/2026/001', client: 'Acme Corp', date: '2026-03-22', dueDate: '2026-04-05', status: 'Draft', items: [{ name: 'Web Dev', qty: 1, rate: 10000, taxRate: 18 }], sub: 10000, taxAmt: 1800, total: 11800, isAmc: false }, resp: { success: true, id: '...' } },
      { name: 'List Invoices (GET)', method: 'GET', query: 'ownerId=...', resp: { success: true, data: [{ id: '...', no: 'INV/2026/001', total: 11800 }] } },
      { name: 'Update Invoice & Payment (PATCH)', method: 'PATCH', body: { id: 'INV_ID', ownerId: '...', status: 'Partially Paid', payments: [{ amount: 5000, date: 1711234567890 }] }, resp: { success: true, message: 'Updated' } },
      { name: 'Delete Invoice (DELETE)', method: 'DELETE', body: { id: 'INV_ID', ownerId: '...' }, resp: { success: true, message: 'Deleted' } }
    ]
  },
  { 
    group: 'POS Billing', 
    path: '/api/finance', 
    method: 'POST', 
    desc: 'Retail checkout logic processing.',
    actions: [
      { name: 'Generate Retail Bill', method: 'POST', body: { action: 'generate-bill', cart: [{ id: 'PROD_ID', name: 'Wireless Mouse', qty: 2, rate: 500, tax: 18 }], customer: { id: 'CUST_ID', name: 'Walk-in', phone: '9000000000' }, payMode: 'UPI', userId: 'WORKSPACE_ID', actorId: 'USER_ID' }, resp: { success: true, invoice: { no: 'BILL/2026/001', total: 1180 } } }
    ]
  },
  { 
    group: 'Messaging', 
    path: '/api/notify', 
    method: 'POST', 
    desc: 'Send transactional emails or WhatsApp messages.',
    actions: [
      { name: 'Send Email', method: 'POST', body: { type: 'email', to: 'client@example.com', subject: 'Invoice #123', body: 'Hi, find attached...', ownerId: 'WORKSPACE_ID' }, resp: { success: true, msgId: '...' } },
      { name: 'Send WhatsApp (Prompt)', method: 'POST', body: { type: 'whatsapp', to: '919876543210', message: 'Your order is ready!', ownerId: 'WORKSPACE_ID' }, resp: { success: true, sid: '...' } },
      { name: 'Send WhatsApp (Template)', method: 'POST', body: { type: 'whatsapp', to: '919876543210', templateId: '329129', variables: ['12345', 'Service A', '2026-03-25'], ownerId: 'WORKSPACE_ID' }, resp: { success: true, sid: '...' } }
    ]
  },
  {
    group: 'Ecommerce (Public)',
    path: '/api/ecom/checkout',
    method: 'POST',
    desc: 'Public endpoint for store checkouts, creating leads/orders automatically.',
    actions: [
      { 
        name: 'Submit Order', 
        method: 'POST', 
        body: { 
          ownerId: 'WORKSPACE_ID', 
          ecomName: 'slug', 
          customer: { name: 'Jane Doe', email: 'jane@example.com', phone: '9876543210', address: '123 Main St' },
          items: [{ name: 'Product A', qty: 1, rate: 100 }],
          total: 100
        }, 
        resp: { success: true, orderId: '...' } 
      },
      {
        name: 'Validation: Strict Match',
        method: 'POST',
        desc: 'Returns error if email exists with diff phone, or phone exists with diff email.',
        body: { customer: { email: 'existing@mail.com', phone: 'NEW_PHONE' } },
        resp: { success: false, error: 'Mail ID or phone number mismatch' }
      }
    ]
  },
  {
    group: 'Appointments (Public)',
    path: '/api/appointments/book',
    method: 'POST',
    desc: 'Public booking endpoint for client appointments.',
    actions: [
      { 
        name: 'Book Slot', 
        method: 'POST', 
        body: { 
          ownerId: 'WORKSPACE_ID', 
          serviceId: 'SERVICE_ID', 
          slot: '2026-03-25T10:00:00Z',
          customer: { name: 'Alice Smith', email: 'alice@example.com', phone: '9988776655' }
        }, 
        resp: { success: true, bookingId: '...' } 
      },
      {
        name: 'Error: Data Mismatch',
        method: 'POST',
        body: { customer: { email: 'existing@mail.com', phone: 'DIFFERENT_PHONE' } },
        resp: { success: false, error: 'Mail ID or phone number mismatch' }
      }
    ]
  }
];

export default function ApiDocs({ ownerId }) {
  const [apiSearch, setApiSearch] = useState('');
  const { data } = db.useQuery({ 
    userProfiles: { $: { where: { userId: ownerId } } },
    globalSettings: {}
  });
  const profile = data?.userProfiles?.[0];
  const gStats = data?.globalSettings?.[0];
  const baseUrl = gStats?.crmDomain || profile?.website || window.location.origin;

  const getActionPath = (groupPath, action) => {
    if (groupPath.startsWith('/api/data/')) {
       if (action.method === 'GET') return `${groupPath}/list`;
       if (action.method === 'POST') return `${groupPath}/create`;
       if (action.method === 'PATCH') return `${groupPath}/update`;
       if (action.method === 'DELETE') return `${groupPath}/delete`;
    }
    return groupPath;
  };



  const filtered = API_LIST.filter(g => 
    g.group.toLowerCase().includes(apiSearch.toLowerCase()) || 
    g.desc.toLowerCase().includes(apiSearch.toLowerCase()) ||
    g.actions.some(a => a.name.toLowerCase().includes(apiSearch.toLowerCase()))
  );

  return (
    <div className="reports-view api-docs-view">
      <style>{`
        @media print {
          .no-print, .btn, .btn-sm, .sidebar, .topbar, .sh button, .btn-icon { display: none !important; }
          body, .app, .main, .content, .api-docs-view { background: #fff !important; padding: 0 !important; margin: 0 !important; width: 100% !important; overflow: visible !important; }
          .sh { padding: 0 !important; margin-bottom: 20px !important; border: none !important; box-shadow: none !important; }
          .tw { border: none !important; box-shadow: none !important; background: #fff !important; }
          .tw-head { border-bottom: 2px solid #eee !important; padding: 10px 0 !important; }
          pre { white-space: pre-wrap !important; word-break: break-all !important; border: 1px solid #ddd !important; }
          .badge { border: 1px solid #ddd !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          h2, h3, h4 { color: #000 !important; }
          a { text-decoration: none !important; color: #000 !important; }
          /* Ensure column layout in print */
          .api-docs-view .tw pre { font-size: 10px !important; }
        }
        .api-docs-view .btn-icon { opacity: 0.6; transition: opacity 0.2s; }
        .api-docs-view .btn-icon:hover { opacity: 1; }
      `}</style>
      <div className="sh">
        <div>
          <h2>API Documentation</h2>
          <div className="sub">Technical reference for CRM backend integration</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => {
          const blob = new Blob([JSON.stringify(API_LIST, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'crm_full_api_docs.json';
          a.click();
          URL.revokeObjectURL(url);
        }}>
          📥 Export Full Specs (JSON)
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
          📄 Download as PDF
        </button>
      </div>

      <div style={{ marginBottom: 30, padding: '0 20px' }}>
        <div className="tw" style={{ padding: 24, background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h3 style={{ marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🛠️</span> Developer System Overview
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>1. Real-time Infrastructure (InstantDB SDK)</h4>
              <p style={{ fontSize: 13, lineHeight: '1.6', color: 'var(--text-soft)' }}>
                For real-time features like chat or live dashboard updates, use the <strong>InstantDB SDK</strong> in Flutter instead of raw HTTP.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>App ID:</span>
                <code style={{ fontSize: 12, flex: 1, letterSpacing: 1 }}>19c2...cfd</code>
                <button className="btn-icon" onClick={() => {
                  navigator.clipboard.writeText('19c240f7-1ba0-486a-95b4-adb651f63cfd');
                  alert('App ID Copied!');
                }}>📋</button>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>2. Authentication Workflow</h4>
              <p style={{ fontSize: 13, lineHeight: '1.6', color: 'var(--text-soft)' }}>
                Login returns a <strong>token</strong> (for SDK) and an <strong>ownerUserId</strong> (Workspace Identifier). 
                Save these locally.
              </p>
              <ul style={{ fontSize: 12, marginTop: 8, paddingLeft: 18, color: 'var(--text-soft)' }}>
                <li>Every data request <strong>MUST</strong> include <code>ownerId</code> (set this to <code>ownerUserId</code> from login).</li>
                <li><code>actorId</code> should be the logged-in user's own ID.</li>
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>3. File & Image Handling</h4>
              <p style={{ fontSize: 13, lineHeight: '1.6', color: 'var(--text-soft)' }}>
                This backend persists images (logos, QR codes) as **Base64 encoded strings**. 
                Convert mobile gallery images to Base64 before sending in `POST/PATCH` payloads.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>4. Standardized API Endpoints</h4>
              <p style={{ fontSize: 13, lineHeight: '1.6', color: 'var(--text-soft)' }}>
                All CRUD operations now follow an explicit path-based structure for maximum clarity:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                 <span className="badge bg-green">/list</span>
                 <span className="badge bg-blue">/create</span>
                 <span className="badge bg-yellow">/update</span>
                 <span className="badge bg-red">/delete</span>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="tw">
        <div className="tw-head">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Interactive Developer Reference</h3>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>Comprehensive request/response schemas for all consolidated handlers.</div>
          </div>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input 
              className="si" 
              style={{ minWidth: 220 }}
              placeholder="Search actions or handlers..." 
              value={apiSearch}
              onChange={e => setApiSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div style={{ padding: '0 20px 20px' }}>
          {filtered.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: 40 }}>
              <div style={{ marginBottom: 16, borderLeft: '4px solid var(--accent)', paddingLeft: 12 }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>{group.group}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <code style={{ background: 'var(--bg-soft)', color: 'var(--accent)', fontWeight: 700, padding: '2px 8px', borderRadius: 4, fontSize: 13 }}>{group.path}</code>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>{group.desc}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {group.actions.map((action, aIdx) => (
                  <div key={aIdx} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                    <div style={{ padding: '12px 18px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 4, background: action.method === 'GET' ? '#10b981' : action.method === 'DELETE' ? '#ef4444' : action.method === 'PATCH' ? '#f59e0b' : '#6366f1', color: '#fff' }}>
                          {action.method || group.method}
                        </span>
                        <strong style={{ fontSize: 14 }}>{action.name.replace(/\(.*\)/, '').trim()}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <code style={{ fontSize: 11, background: '#fff', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--muted)' }}>
                          {baseUrl.replace(/^https?:\/\//, '')}{getActionPath(group.path, action)}{action.query ? `?${action.query}` : ''}
                        </code>
                        <button className="btn-icon" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => {
                          const fullUrl = `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}${getActionPath(group.path, action)}${action.query ? `?${action.query}` : ''}`;
                          navigator.clipboard.writeText(fullUrl);
                          alert('URL Copied!');
                        }}>📋</button>
                      </div>
                    </div>
                    
                    <div style={{ padding: 18 }}>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, width: '100%' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                            Payload / Parameters
                            <span style={{ fontWeight: 400, textTransform: 'none' }}>{action.query ? 'Query Strings' : 'JSON Body'}</span>
                          </div>
                          <pre style={{ margin: 0, fontSize: 12, background: '#f8fafc', color: '#334155', padding: '14px', borderRadius: 8, border: '1px solid #e2e8f0', minHeight: 120, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                            {action.query || JSON.stringify(action.body, null, 2)}
                          </pre>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Expected Response</div>
                          <pre style={{ margin: 0, fontSize: 12, background: '#e0f2fe', color: '#0369a1', padding: '14px', borderRadius: 8, border: '1px solid #bae6fd', minHeight: 120, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(action.resp, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

