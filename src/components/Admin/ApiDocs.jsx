import React, { useState } from 'react';

const API_LIST = [
  { group: 'Authentication', path: '/api/auth', method: 'POST', desc: 'Unified auth handler: register, login, verify-otp, roles, change-password, reset-password.', params: 'action (login|register|verify-otp|roles|...), email, password, ...', body: { action: 'login', email: 'user@example.com', password: '...' } },
  { group: 'Finance', path: '/api/finance', method: 'POST', desc: 'Unified finance handler: generates POS bills and manages stock.', params: 'action (generate-bill), cart (array), customer (object), userId, actorId', body: { action: 'generate-bill', cart: [{ name: 'Item', qty: 1, rate: 100 }], customer: { name: 'Client' }, userId: 'owner-uuid', actorId: 'user-id' } },
  { group: 'Messaging', path: '/api/notify', method: 'POST', desc: 'Unified notification handler: sends Emails and WhatsApp messages.', params: 'type (email|whatsapp), to, subject, body/message, ownerId', body: { type: 'email', to: 'user@example.com', subject: 'Hello', body: 'Test message', ownerId: '...' } },
  { group: 'Unified Data', path: '/api/data', method: 'GET', desc: 'Fetches a list of records for any module (leads, projects, tasks, customers, etc.).', params: 'module, ownerId', body: {} },
  { group: 'Unified Data', path: '/api/data', method: 'POST', desc: 'Creates a new record. (Projects: auto-won leads | Leads: logs creation).', params: 'module, ownerId, actorId, userName, [logText], [projectId], ...data', body: { module: 'tasks', ownerId: '...', title: 'New Task', projectId: '...' } },
  { group: 'Unified Data', path: '/api/data', method: 'PATCH', desc: 'Updates a record. Logs changes if logText is provided.', params: 'module, ownerId, id, [logText], ...updates', body: { module: 'leads', ownerId: '...', id: '...', status: 'Contacted' } },
  { group: 'Unified Data', path: '/api/data', method: 'DELETE', desc: 'Deletes a record. (Projects: cascading delete tasks).', params: 'module, ownerId, id, [logText]', body: { module: 'projects', ownerId: '...', id: '...' } },
];

export default function ApiDocs() {
  const [apiSearch, setApiSearch] = useState('');

  return (
    <div>
      <div className="sh">
        <div>
          <h2>API Documentation</h2>
          <div className="sub">Technical reference for CRM backend endpoints</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => {
          const blob = new Blob([JSON.stringify(API_LIST, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'crm_api_docs.json';
          a.click();
          URL.revokeObjectURL(url);
        }}>
          📥 Download JSON
        </button>
      </div>

      <div className="tw">
        <div className="tw-head">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Developer API Reference</h3>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>Documentation for external integrations and mobile apps.</div>
          </div>
          <div className="sw">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input 
              className="si" 
              style={{ minWidth: 220 }}
              placeholder="Search endpoints..." 
              value={apiSearch}
              onChange={e => setApiSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          {API_LIST.filter(a => a.path.toLowerCase().includes(apiSearch.toLowerCase()) || a.group.toLowerCase().includes(apiSearch.toLowerCase()) || a.desc.toLowerCase().includes(apiSearch.toLowerCase())).map((api, idx) => (
            <div key={idx} style={{ marginBottom: 24, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', overflow: 'hidden' }}>
              <div style={{ background: 'var(--bg-soft)', padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>{api.method}</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: 14 }}>{api.path}</strong>
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>{api.group}</span>
              </div>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 13, marginBottom: 12 }}>{api.desc}</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Required Parameters</div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    {api.params}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Usage Example (JSON)</div>
                  <pre style={{ margin: 0, fontSize: 12, background: '#1e293b', color: '#f1f5f9', padding: '14px', borderRadius: 8, overflowX: 'auto' }}>
                    {JSON.stringify(api.body, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
