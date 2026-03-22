import React, { useState } from 'react';

const API_LIST = [
  { 
    group: 'Authentication', 
    path: '/api/auth', 
    method: 'POST', 
    desc: 'Unified authentication gateway for user identity and security.',
    actions: [
      { name: 'Login', body: { action: 'login', email: 'user@example.com', password: 'yourpassword' }, resp: { success: true, user: { id: '...', email: '...' } } },
      { name: 'Register', body: { action: 'register', email: 'user@example.com', password: 'yourpassword', name: 'John Doe' }, resp: { success: true, id: '...' } },
      { name: 'OTP Verify', body: { action: 'verify-otp', email: 'user@example.com', otp: '123456' }, resp: { success: true, token: '...' } }
    ]
  },
  { 
    group: 'Finance', 
    path: '/api/finance', 
    method: 'POST', 
    desc: 'Operations related to billing, POS checkout, and stock management.',
    actions: [
      { 
        name: 'Generate Bill', 
        body: { action: 'generate-bill', cart: [{ name: 'Laptop', qty: 1, rate: 50000, tax: 18 }], customer: { name: 'Gokul', phone: '9876543210' }, userId: 'owner-id', actorId: 'user-id' },
        resp: { success: true, billId: '...', pdfUrl: '...' }
      }
    ]
  },
  { 
    group: 'Messaging', 
    path: '/api/notify', 
    method: 'POST', 
    desc: 'Send transactional emails or WhatsApp messages.',
    actions: [
      { name: 'Send Email', body: { type: 'email', to: 'client@example.com', subject: 'Invoice #123', body: 'Please find attached...' }, resp: { success: true, msgId: '...' } },
      { name: 'Send WhatsApp', body: { type: 'whatsapp', to: '919876543210', message: 'Hi, your order is ready!' }, resp: { success: true, sid: '...' } }
    ]
  },
  { 
    group: 'Unified Data (CRUD)', 
    path: '/api/data', 
    method: 'ALL', 
    desc: 'Standardized CRUD for all business modules (Leads, Tasks, Projects, etc.).',
    actions: [
      { name: 'List Records (GET)', method: 'GET', query: 'module=leads&ownerId=xyz', resp: { success: true, data: [{ id: '1', name: 'Lead A' }] } },
      { name: 'Create Product (POST)', method: 'POST', body: { module: 'products', ownerId: '...', name: 'iPhone 15', price: 79900, stock: 10, category: 'Electronics' }, resp: { success: true, id: 'prod_123' } },
      { name: 'Update Customer (PATCH)', method: 'PATCH', body: { module: 'customers', id: 'cust_456', email: 'newemail@example.com', ownerId: '...' }, resp: { success: true, message: 'Updated' } },
      { name: 'Delete Task (DELETE)', method: 'DELETE', body: { module: 'tasks', id: 'task_789', ownerId: '...' }, resp: { success: true, message: 'Deleted' } }
    ]
  }
];

export default function ApiDocs() {
  const [apiSearch, setApiSearch] = useState('');

  const filtered = API_LIST.filter(g => 
    g.group.toLowerCase().includes(apiSearch.toLowerCase()) || 
    g.desc.toLowerCase().includes(apiSearch.toLowerCase()) ||
    g.actions.some(a => a.name.toLowerCase().includes(apiSearch.toLowerCase()))
  );

  return (
    <div style={{ paddingBottom: 60 }}>
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
      </div>

      <div style={{ marginBottom: 20, padding: '0 20px' }}>
        <div className="tw" style={{ padding: 20, background: '#fefce8', border: '1px solid #fef08a', borderRadius: 10 }}>
          <h4 style={{ color: '#854d0e', marginBottom: 8, fontSize: 14 }}>⚠️ Core Authentication & Context</h4>
          <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>
            Every request (except public login/register) requires <strong>ownerId</strong> (the workspace ID) and <strong>actorId</strong> (the user ID performing the action). 
            Pass these in the request body for POST/PATCH or as query parameters for GET.
          </p>
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
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>{group.desc} <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700, marginLeft: 10 }}>{group.path}</span></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {group.actions.map((action, aIdx) => (
                  <div key={aIdx} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                    <div style={{ padding: '12px 18px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 4, background: action.method === 'GET' ? '#10b981' : action.method === 'DELETE' ? '#ef4444' : '#6366f1', color: '#fff' }}>
                          {action.method || group.method}
                        </span>
                        <strong style={{ fontSize: 14 }}>{action.name}</strong>
                      </div>
                    </div>
                    
                    <div style={{ padding: 18 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                            Payload / Parameters
                            <span style={{ fontWeight: 400, textTransform: 'none' }}>{action.query ? 'Query Strings' : 'JSON Body'}</span>
                          </div>
                          <pre style={{ margin: 0, fontSize: 12, background: '#f8fafc', color: '#334155', padding: '14px', borderRadius: 8, border: '1px solid #e2e8f0', minHeight: 120, overflowX: 'auto' }}>
                            {action.query || JSON.stringify(action.body, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Expected Response</div>
                          <pre style={{ margin: 0, fontSize: 12, background: '#e0f2fe', color: '#0369a1', padding: '14px', borderRadius: 8, border: '1px solid #bae6fd', minHeight: 120, overflowX: 'auto' }}>
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
