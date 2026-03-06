import React, { useState, useMemo, useEffect, useRef } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useApp } from '../../context/AppContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NotifPanel from './NotifPanel';
import useAutomationEngine from '../../hooks/useAutomationEngine';
import Dashboard from '../Dashboard/Dashboard';
import LeadsView from '../Leads/LeadsView';
import Quotations from '../Finance/Quotations';
import Invoices from '../Finance/Invoices';
import Recurring from '../Finance/Recurring';
import AMC from '../Clients/AMC';
import Subscriptions from '../Clients/Subscriptions';
import Customers from '../Clients/Customers';
import Expenses from '../Business/Expenses';
import Products from '../Business/Products';
import Projects from '../Work/Projects';
import AllTasks from '../Work/AllTasks';
import Teams from '../Work/Teams';
import AutomationView from '../Automation/AutomationView';
import Reports from '../Reports/Reports';
import Settings from '../Settings/Settings';
import AdminPanel from '../Admin/AdminPanel';
import Integrations from '../System/Integrations';

const TRIAL_DAYS = 7;
const SUPERADMIN_KEY = 'santhanam.gokul@gmail.com';

export default function MainApp({ user }) {
  // Start automation background worker
  useAutomationEngine(user);

  const { activeView, notifOpen } = useApp();
  
  // Optimized query: only fetch what we need
  const { isLoading, data, error } = db.useQuery({
    leads: { $: { where: { userId: user.id } } },
    amc: { $: { where: { userId: user.id } } },
    subs: { $: { where: { userId: user.id } } },
    myProfile: { $: { where: { userId: user.id }, schema: 'userProfiles' } },
    anyProfile: { $: { limit: 1, schema: 'userProfiles' } },
  });

  if (error) console.error("MainApp Query Error:", error);

  const leads = data?.leads || [];
  const amc = data?.amc || [];
  const subs = data?.subs || [];
  const profile = data?.myProfile?.[0];
  const isSuperadmin = profile?.role === 'superadmin' || user.email === SUPERADMIN_KEY;

  // Strict guard to prevent infinite transaction loops
  const syncRef = useRef(false);

  useEffect(() => {
    if (!isLoading && data && !syncRef.current) {
      if (!profile) {
        syncRef.current = true;
        const noProfilesExist = (data.anyProfile || []).length === 0;
        const role = (noProfilesExist || user.email === SUPERADMIN_KEY) ? 'superadmin' : 'user';
        
        db.transact(db.tx.userProfiles[id()].update({
          userId: user.id,
          email: user.email,
          role: role,
          plan: 'Trial',
          planExpiry: Date.now() + (TRIAL_DAYS * 24 * 60 * 60 * 1000),
          createdAt: Date.now()
        })).catch(e => console.error("Profile creation failed", e));
      } else if (user.email === SUPERADMIN_KEY && profile.role !== 'superadmin') {
        syncRef.current = true;
        db.transact(db.tx.userProfiles[profile.id].update({ role: 'superadmin' }))
          .catch(e => console.error("Upgrade failed", e));
      }
    }
  }, [isLoading, data, profile, user.id, user.email]);

  // Notifications calculation
  const liveNotifs = useMemo(() => {
    const now = new Date();
    const notifs = [];
    amc.forEach(a => {
      const diff = Math.ceil((new Date(a.endDate) - now) / (1000 * 60 * 60 * 24));
      if (diff <= 30 && diff >= 0)
        notifs.push({ id: 'amc-' + a.id, unread: true, title: `🛡 AMC Expiring: ${a.client}`, desc: `Contract ${a.contractNo} expires in ${diff} day${diff !== 1 ? 's' : ''}`, time: new Date().toLocaleString() });
    });
    subs.forEach(s => {
      const diff = Math.ceil((new Date(s.nextPayment) - now) / (1000 * 60 * 60 * 24));
      if (diff <= 7 && diff >= 0)
        notifs.push({ id: 'sub-' + s.id, unread: true, title: `💰 Payment Due: ${s.client}`, desc: `₹${(s.amount || 0).toLocaleString()} for ${s.plan} due in ${diff} day${diff !== 1 ? 's' : ''}`, time: new Date().toLocaleString() });
    });
    const overdueLeads = leads.filter(l => l.followup && new Date(l.followup) < now);
    if (overdueLeads.length)
      notifs.push({ id: 'fu-overdue', unread: true, title: `⏰ ${overdueLeads.length} Overdue Follow-up${overdueLeads.length > 1 ? 's' : ''}`, desc: `Leads: ${overdueLeads.map(l => l.name).join(', ')}`, time: new Date().toLocaleString() });
    return notifs;
  }, [amc, subs, leads]);

  const amcExpiringCount = amc.filter(a => {
    const d = Math.ceil((new Date(a.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return d <= 30 && d >= 0;
  }).length;

  const views = {
    dashboard: <Dashboard user={user} />,
    leads: <LeadsView user={user} />,
    quotations: <Quotations user={user} />,
    invoices: <Invoices user={user} />,
    recurring: <Recurring user={user} />,
    customers: <Customers user={user} />,
    amc: <AMC user={user} />,
    subscriptions: <Subscriptions user={user} />,
    expenses: <Expenses user={user} />,
    products: <Products user={user} />,
    projects: <Projects user={user} />,
    alltasks: <AllTasks user={user} />,
    teams: <Teams user={user} />,
    automation: <AutomationView user={user} />,
    integrations: <Integrations user={user} />,
    reports: <Reports user={user} />,
    settings: <Settings user={user} profile={profile} />,
    admin: isSuperadmin ? <AdminPanel user={user} /> : null,
  };

  // Only block for absolute loading state or if new user (non-admin) is being provisioned
  if (isLoading || (data && !profile && !isSuperadmin)) {
    return (
      <div className="loading-screen">
        <div className="logo">TC</div>
        <div className="spinner" />
        <p>Configuring TechCRM...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar isSuperadmin={isSuperadmin} leadCount={leads.length} amcCount={amcExpiringCount} />
      <div className="main">
        <Topbar user={{ ...user, profile }} notifCount={liveNotifs.filter(n => n.unread).length} />
        <div className="content">
          {views[activeView] || views.dashboard}
        </div>
      </div>
      <NotifPanel notifications={liveNotifs} onMarkRead={() => {}} onMarkAllRead={() => {}} />
    </div>
  );
}

