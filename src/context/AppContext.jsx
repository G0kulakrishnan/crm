import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

// Default plans shown on signup
export const DEFAULT_PLANS = [
  { id: 'trial', name: 'Trial', duration: 7, regular: 0, sale: 0, maxLeads: 50, maxUsers: 1, features: ['Leads', 'Quotations'] },
  { id: 'premium', name: 'Premium', duration: 30, regular: 3999, sale: 2999, maxLeads: 500, maxUsers: 5, features: ['Leads', 'Quotations', 'Invoices', 'Projects'] },
  { id: 'startup', name: 'START-UP', duration: 365, regular: 34999, sale: 24999, maxLeads: 0, maxUsers: 10, features: ['All Features'] },
  { id: 'pro', name: 'Premium Pro', duration: 365, regular: 39999, sale: 29999, maxLeads: 0, maxUsers: 0, features: ['All Features + Priority Support'] },
];

export function AppProvider({ children, user }) {
  const [activeView, setActiveView] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) return hash;
    return localStorage.getItem('tc_activeView') || 'dashboard';
  });
  const [settingsTab, setSettingsTab] = useState('My Profile');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Sync state upward to URL and LocalStorage
  useEffect(() => {
    localStorage.setItem('tc_activeView', activeView);
    if (window.location.hash !== `#${activeView}`) {
      window.location.hash = activeView;
    }
  }, [activeView]);

  // Listen to browser Back/Forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== activeView) {
        setActiveView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeView]);

  return (
    <AppContext.Provider value={{
      user,
      activeView, setActiveView,
      settingsTab, setSettingsTab,
      sidebarExpanded, setSidebarExpanded,
      mobileSidebarOpen, setMobileSidebarOpen,
      notifOpen, setNotifOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
