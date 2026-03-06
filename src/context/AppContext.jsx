import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

// Default plans shown on signup
export const DEFAULT_PLANS = [
  { id: 'trial', name: 'Trial', duration: 7, regular: 0, sale: 0, maxLeads: 50, maxUsers: 1, features: ['Leads', 'Quotations'] },
  { id: 'premium', name: 'Premium', duration: 30, regular: 3999, sale: 2999, maxLeads: 500, maxUsers: 5, features: ['Leads', 'Quotations', 'Invoices', 'Projects'] },
  { id: 'startup', name: 'START-UP', duration: 365, regular: 34999, sale: 24999, maxLeads: 0, maxUsers: 10, features: ['All Features'] },
  { id: 'pro', name: 'Premium Pro', duration: 365, regular: 39999, sale: 29999, maxLeads: 0, maxUsers: 0, features: ['All Features + Priority Support'] },
];

export function AppProvider({ children, user }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <AppContext.Provider value={{
      user,
      activeView, setActiveView,
      sidebarExpanded, setSidebarExpanded,
      notifOpen, setNotifOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
