import React from 'react';
import { useApp } from '../../context/AppContext';
const NAV_ITEMS = [
  { group: 'Main' },
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { id: 'leads', label: 'Leads', icon: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.4 0-8 2.7-8 6v1h16v-1c0-3.3-3.6-6-8-6z', badge: true },
  { id: 'customers', label: 'Customers', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { group: 'Finance' },
  { id: 'quotations', label: 'Quotations', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' },
  { id: 'pos', label: 'POS Billing', icon: 'M16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2 M9 3h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M12 11h.01 M12 14h.01 M12 17h.01' },
  { id: 'invoices', label: 'Invoices', icon: 'M3 3h18v18H3V3z M3 9h18 M9 21V9' },
  { id: 'recurring', label: 'Recurring', icon: 'M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3' },
  { id: 'amc', label: 'AMC', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', badge: true },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
  { id: 'expenses', label: 'Expenses', icon: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { id: 'products', label: 'Products', icon: 'M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' },
  { group: 'Marketing' },
  { id: 'campaigns', label: 'Campaigns', icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' },
  { group: 'Work' },
  { id: 'projects', label: 'Projects', icon: 'M3 3h18v18H3V3z M3 9h18 M9 21V9' },
  { id: 'alltasks', label: 'All Tasks', icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { id: 'teams', label: 'Teams', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { group: 'System' },
  { id: 'automation', label: 'Automation', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  { id: 'messaging-logs', label: 'Messaging Logs', icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6' },
  { id: 'integrations', label: 'Integrations', icon: 'M4 17l6-6-6-6 M12 19h8 M12 5h8 M12 12h8' },
  { id: 'reports', label: 'Reports', icon: 'M18 20V10 M12 20V4 M6 20v-6' },
  { id: 'settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
];

export default function Sidebar({ isSuperadmin, leadCount, amcCount, isExpired }) {
  const { activeView, setActiveView, sidebarExpanded, setSidebarExpanded } = useApp();

  return (
    <aside className={`sidebar${sidebarExpanded ? ' expanded' : ''}`}>
      <div className="sidebar-logo" onClick={() => setSidebarExpanded(v => !v)}>
        <span>TC</span>
        <span className="nav-label" style={{ fontWeight: 800, fontSize: 13 }}>TechCRM</span>
      </div>
      <nav style={{ width: '100%', flex: 1 }}>
        {NAV_ITEMS.map((item, i) => {
          if (item.group) {
            return <div key={i} className="nav-group-label">{item.group}</div>;
          }
          const count = item.id === 'leads' ? leadCount : item.id === 'amc' ? amcCount : 0;
          return (
            <div
              key={item.id}
              className={`nav-item${activeView === item.id ? ' active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ width: 17, height: 17, flexShrink: 0 }}>
                {item.icon.split(' M').map((d, j) => (
                  <path key={j} d={j === 0 ? d : 'M' + d} />
                ))}
              </svg>
              <span className="nav-label">{item.label}</span>
              {item.badge && count > 0 && (
                <span className="badge-c nav-label">{count}</span>
              )}
            </div>
          );
        })}
        {isSuperadmin && (
          <>
            <div className="nav-group-label">Platform</div>
            <div
              className={`nav-item${activeView === 'admin' ? ' active' : ''}`}
              onClick={() => setActiveView('admin')}
            >
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ width: 17, height: 17, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="nav-label">Admin Panel</span>
            </div>
          </>
        )}
      </nav>
    </aside>
  );
}
