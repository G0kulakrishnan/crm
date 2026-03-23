import React, { useState, useMemo, useEffect, useRef } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useApp } from '../../context/AppContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../context/ToastContext';
import { DEFAULT_STAGES, DEFAULT_SOURCES, DEFAULT_LABELS } from '../../utils/helpers';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NotifPanel from './NotifPanel';
import useAutomationEngine from '../../hooks/useAutomationEngine';
import Dashboard from '../Dashboard/Dashboard';
import LeadsView from '../Leads/LeadsView';
import Quotations from '../Finance/Quotations';
import Invoices from '../Finance/Invoices';
import POSBilling from '../Finance/POSBilling';
import AMC from '../Clients/AMC';
import Customers from '../Clients/Customers';
import Expenses from '../Business/Expenses';
import Products from '../Business/Products';
import Vendors from '../Business/Vendors';
import PurchaseOrders from '../Business/PurchaseOrders';
import Campaigns from '../Marketing/Campaigns';
import Projects from '../Work/Projects';
import AllTasks from '../Work/AllTasks';
import Teams from '../Work/Teams';
import AutomationView from '../Automation/AutomationView';
import Reports from '../Reports/Reports';
import Settings from '../Settings/Settings';
import MessagingLogs from '../System/MessagingLogs';
import AdminPanel from '../Admin/AdminPanel';
import ApiDocs from '../Admin/ApiDocs';
import Integrations from '../System/Integrations';
import UserProfile from '../Settings/UserProfile';
import EcomSettings from '../Ecommerce/EcomSettings';
import EcomOrders from '../Ecommerce/EcomOrders';
import Appointments from '../Appointments/Appointments';

const TRIAL_DAYS = 7;
const SUPERADMIN_KEY = 'santhanam.gokul@gmail.com';
const DEFAULT_PLANS = [
  { name: 'Trial', duration: 7, price: 0 },
  { name: 'Premium', duration: 30, price: 2999 },
  { name: 'START-UP', duration: 365, price: 24999 },
  { name: 'Premium Pro', duration: 365, price: 29999 },
];

export default function MainApp({ user, settings }) {
  const { activeView, notifOpen, setActiveView, settingsTab } = useApp();
  const toast = useToast();
  
  // 1. Initial State for Team Info
  const [teamInfo, setTeamInfo] = useState(() => {
    try {
      const stored = localStorage.getItem('tc_team_member');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  // 2. Discovery: If no teamInfo, check if this user IS a team member somewhere
  const isSuperadmin = user.email === SUPERADMIN_KEY;
  const discQuery = (!teamInfo && user.email && !isSuperadmin) 
    ? { teamMembers: { $: { where: { email: String(user.email).toLowerCase() }, limit: 1 } } } 
    : null;
  const { data: discovery, isLoading: reqLoading } = db.useQuery(discQuery);
  const discoveryLoading = discQuery ? reqLoading : false;
  const isDiscovering = !teamInfo && !!user.email && discoveryLoading;

  // Sync discovered team info
  useEffect(() => {
    if (discovery?.teamMembers?.[0] && !teamInfo) {
      const discovered = {
        isTeamMember: true,
        ownerUserId: discovery.teamMembers[0].userId,
        teamMemberId: discovery.teamMembers[0].id
      };
      console.log("🔍 [MainApp] Discovered team membership:", discovered);
      setTeamInfo(discovered);
      localStorage.setItem('tc_team_member', JSON.stringify(discovered));
    }
  }, [discovery, teamInfo]);

  // 3. Main Data Fetch (target the owner's data)
  const targetUserId = (teamInfo?.isTeamMember && !isSuperadmin) ? teamInfo.ownerUserId : user.id;
  const isTeamMember = !!teamInfo?.isTeamMember && !isSuperadmin;

  const { isLoading: mainLoading, data, error } = db.useQuery({
    userProfiles: { $: { where: { userId: targetUserId } } },
    memberProfiles: user.id ? { $: { where: { userId: user.id }, limit: 1 } } : null,
    teamMembers: { $: { where: { userId: targetUserId } } },
    amc: { $: { where: { userId: targetUserId } } },
    leads: { $: { where: { userId: targetUserId } } },
    subs: { $: { where: { userId: targetUserId } } },
    checkProfiles: { userProfiles: { $: { limit: 1 } } }, 
  });

  if (error) console.error("MainApp Query Error:", error);

  const leads = data?.leads || [];
  const amc = data?.amc || [];
  const subs = data?.subs || [];
  const teamMembers = data?.teamMembers || [];
  let profile = data?.userProfiles?.[0];
  const memberProfile = data?.memberProfiles?.[0];

  const visibleLeads = useMemo(() => {
    const savedLeadStages = profile?.leadStages;
    if (!savedLeadStages || savedLeadStages.length === 0) return leads;
    // Only count leads whose stage is in the active/visible stages list
    return leads.filter(l => savedLeadStages.includes(l.stage));
  }, [leads, profile?.leadStages]);

  // Security: Cleanse profile for team members (remove tokens/passwords)
  if (isTeamMember && profile) {
    const { 
      waToken, waPhoneNumberId, 
      smtpHost, smtpPort, smtpUser, smtpPass,
      ...safeProfile 
    } = profile;
    safeProfile.isWaEnabled = !!waToken && !!waPhoneNumberId;
    safeProfile.isSmtpEnabled = !!smtpHost && !!smtpUser && !!smtpPass;
    profile = safeProfile;
  }
  
  // Permissions hook
  const perms = usePermissions(user, profile, teamMembers);

  // 2. Load Automation Engine (for background checks)
  useAutomationEngine(user, targetUserId);

  const isExpired = profile?.planExpiry && profile.planExpiry < Date.now();

  // Strict guard to prevent infinite transaction loops
  const syncRef = useRef(false);

  useEffect(() => {
    // 1. Critical Guards: Wait for everything to settle
    if (discoveryLoading || mainLoading || !data) return;
    
    // 2. Strong Team Member Protection: 
    // Always prioritize team discovery over accidental local profiles
    const discoveredMember = discovery?.teamMembers?.[0];
    const isActuallyAMember = isTeamMember || !!discoveredMember;

    if (isActuallyAMember) {
      // Create member profile if it doesn't exist
      if (!memberProfile && !syncRef.current && user.id) {
         syncRef.current = true;
         const memberId = id();
         const teamRec = discoveredMember || teamMembers.find(m => m.id === teamInfo?.teamMemberId);
         db.transact(db.tx.memberProfiles[memberId].update({
            userId: user.id,
            ownerUserId: targetUserId,
            email: user.email,
            name: teamRec?.name || '',
            phone: teamRec?.phone || '',
            createdAt: Date.now()
         })).then(() => syncRef.current = false).catch(() => syncRef.current = false);
      }
      return;
    }

    const rawReg = localStorage.getItem('tc_reg_data');
    const regData = rawReg ? JSON.parse(rawReg) : {};

    if (!profile && !syncRef.current) {
      syncRef.current = true;
      const role = (user.email === SUPERADMIN_KEY) ? 'superadmin' : 'user';

      console.log("🛠 [MainApp] Creating user profile for:", user.email, "Role:", role);
      
      const profileId = id();
      db.transact(db.tx.userProfiles[profileId].update({
        userId: user.id,
        email: user.email,
        fullName: regData.fullName || '',
        phone: regData.phone || '',
        bizName: regData.bizName || '',
        role: role,
        plan: regData.selectedPlan || 'Trial',
        planExpiry: Date.now() + (TRIAL_DAYS * 24 * 60 * 60 * 1000),
        stages: DEFAULT_STAGES,
        sources: DEFAULT_SOURCES,
        labels: DEFAULT_LABELS,
        invoiceTemplate: 'Spreadsheet',
        quotationTemplate: 'Spreadsheet',
        createdAt: Date.now()
      })).then(() => {
        console.log("✅ [MainApp] Profile created successfully:", profileId);
        localStorage.removeItem('tc_reg_data');
      }).catch(e => {
        console.error("❌ [MainApp] Profile creation failed", e);
        syncRef.current = false; // Allow retry on failure
      });
    } else if (profile) {
      // Sync metadata if missing or incorrect
      const isUuid = profile.email && profile.email.length === 36 && !profile.email.includes('@');
      const needsEmail = !profile.email || profile.email === '' || isUuid;
      const needsPhone = !profile.phone && (user.phone || regData.phone); 
      const needsAdmin = user.email === SUPERADMIN_KEY && profile.role !== 'superadmin';
      const needsUserId = !profile.userId && user.id;
      const needsExpiry = !profile.planExpiry;

      if (needsEmail || needsPhone || needsAdmin || needsUserId || needsExpiry) {
        const updates = {};
        if (needsEmail) updates.email = user.email;
        if (needsPhone) updates.phone = user.phone || regData.phone;
        if (needsAdmin) updates.role = 'superadmin';
        if (needsUserId) updates.userId = user.id;
        if (needsExpiry) {
          const planDuration = DEFAULT_PLANS.find(p => p.name === (profile.plan || 'Trial'))?.duration || 7;
          updates.planExpiry = Date.now() + (planDuration * 24 * 60 * 60 * 1000);
        }
        
        console.log("⚡ [MainApp] Metadata Sync Required:", updates);
        db.transact(db.tx.userProfiles[profile.id].update(updates))
          .then(() => console.log("✅ [MainApp] Metadata synced successfully"))
          .catch(e => console.error("❌ [MainApp] Metadata sync failed", e));
      }
    }

    // 3. Strict Role Cleanup: Demote unauthorized superadmins
    if (profile && profile.role === 'superadmin' && user.email !== SUPERADMIN_KEY) {
      console.warn("🛡 [MainApp] Unauthorized Superadmin detected. Demoting:", user.email);
      db.transact(db.tx.userProfiles[profile.id].update({ role: 'user' }))
        .then(() => { toast('Profile role updated', 'info'); console.log("✅ [MainApp] User demoted to 'user'"); })
        .catch(e => console.error("❌ [MainApp] Demotion failed", e));
    }
  }, [discoveryLoading, mainLoading, data, profile, user.id, user.email, teamInfo]);

  // Notifications calculation
  const liveNotifs = useMemo(() => {
    const now = new Date();
    const notifs = [];
    const isTeam = perms && !perms.isOwner;

    amc.forEach(a => {
      if (isTeam && a.actorId !== user.id) return;
      const diff = Math.ceil((new Date(a.endDate) - now) / (1000 * 60 * 60 * 24));
      if (diff <= 30 && diff >= 0)
        notifs.push({ id: 'amc-' + a.id, unread: true, title: `🛡 AMC Expiring: ${a.client}`, desc: `Contract ${a.contractNo} expires in ${diff} day${diff !== 1 ? 's' : ''}`, time: new Date().toLocaleString() });
    });

    subs.forEach(s => {
      if (isTeam && s.actorId !== user.id) return;
      const diff = Math.ceil((new Date(s.nextPayment) - now) / (1000 * 60 * 60 * 24));
      if (diff <= 7 && diff >= 0)
        notifs.push({ id: 'sub-' + s.id, unread: true, title: `💰 Payment Due: ${s.client}`, desc: `₹${(s.amount || 0).toLocaleString()} for ${s.plan} due in ${diff} day${diff !== 1 ? 's' : ''}`, time: new Date().toLocaleString() });
    });

    const leadFilter = l => {
      if (!isTeam) return true;
      const isAssigned = l.assign === user.email || (perms?.name && l.assign === perms.name) || perms?.isAdmin || perms?.isManager;
      const isCreator = l.actorId === user.id;
      return isAssigned || isCreator;
    };

    const overdueLeads = visibleLeads.filter(l => leadFilter(l) && l.followup && new Date(l.followup) < now);
    if (overdueLeads.length)
      notifs.push({ id: 'fu-overdue', unread: true, title: `⏰ ${overdueLeads.length} Overdue Follow-up${overdueLeads.length > 1 ? 's' : ''}`, desc: `Leads: ${overdueLeads.map(l => l.name).join(', ')}`, time: new Date().toLocaleString() });

    return notifs;
  }, [amc, subs, visibleLeads, perms, user]);

  const amcExpiringCount = amc.filter(a => {
    const isTeam = perms && !perms.isOwner;
    if (isTeam && a.actorId !== user.id) return false;
    const d = Math.ceil((new Date(a.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return d <= 30 && d >= 0;
  }).length;

  const views = {
    dashboard: { component: <Dashboard user={user} ownerId={targetUserId} perms={perms} />, label: 'Dashboard' },
    leads: { component: <LeadsView user={user} perms={perms} ownerId={targetUserId} />, label: 'Leads' },
    quotations: { component: <Quotations user={user} perms={perms} ownerId={targetUserId} settings={settings} />, label: 'Quotations' },
    invoices: { component: <Invoices user={user} perms={perms} ownerId={targetUserId} settings={settings} />, label: 'Invoices' },
    pos: { component: <POSBilling user={user} perms={perms} ownerId={targetUserId} settings={settings} />, label: 'Invoices' }, 
    customers: { component: <Customers user={user} perms={perms} ownerId={targetUserId} />, label: 'Customers' },
    amc: { component: <AMC user={user} perms={perms} ownerId={targetUserId} />, label: 'AMC' },
    expenses: { component: <Expenses user={user} perms={perms} ownerId={targetUserId} />, label: 'Expenses' },
    products: { component: <Products user={user} perms={perms} ownerId={targetUserId} />, label: 'Products' },
    vendors: { component: <Vendors user={user} perms={perms} ownerId={targetUserId} />, label: 'Vendors' },
    'purchase-orders': { component: <PurchaseOrders user={user} perms={perms} ownerId={targetUserId} />, label: 'PurchaseOrders' },
    campaigns: { component: <Campaigns user={user} perms={perms} ownerId={targetUserId} />, label: 'Campaigns' },
    projects: { component: <Projects user={user} perms={perms} ownerId={targetUserId} />, label: 'Projects' },
    alltasks: { component: <AllTasks user={user} perms={perms} ownerId={targetUserId} />, label: 'Tasks' },
    teams: { component: <Teams user={user} ownerId={targetUserId} perms={perms} />, label: 'Teams' }, 
    automation: { component: <AutomationView user={user} perms={perms} ownerId={targetUserId} />, label: 'Automation' },
    integrations: { component: <Integrations user={user} ownerId={targetUserId} />, label: 'Integrations' },
    'messaging-logs': { component: <MessagingLogs user={user} ownerId={targetUserId} />, label: 'MessagingLogs' },
    reports: { component: <Reports user={user} perms={perms} ownerId={targetUserId} profile={profile} />, label: 'Reports' },
    'ecom-settings': { component: <EcomSettings ownerId={targetUserId} globalSettings={settings} perms={perms} />, label: 'Ecommerce' },
    'ecom-orders': { component: <EcomOrders ownerId={targetUserId} perms={perms} />, label: 'Ecommerce' },
    appointments: { component: <Appointments ownerId={targetUserId} perms={perms} settings={settings} />, label: 'Appointments' },
    'appointment-settings': { component: <Appointments ownerId={targetUserId} perms={perms} initialTab="settings" settings={settings} />, label: 'Appointments' },
    userprofile: { component: <UserProfile user={user} profile={profile} perms={perms} memberProfile={memberProfile} ownerId={targetUserId} />, label: 'Public' },
    settings: { component: <Settings user={user} profile={profile} isExpired={isExpired} ownerId={targetUserId} initialTab={settingsTab} perms={perms} teamInfo={teamMembers.find(m => m.id === teamInfo?.teamMemberId)} memberProfile={memberProfile} settings={settings} />, label: 'Settings' },
    admin: { component: isSuperadmin ? <AdminPanel user={user} /> : null, label: 'Admin' },
    apidocs: { component: isSuperadmin ? <ApiDocs ownerId={targetUserId} /> : null, label: 'API Docs' },
  };

  // 1. Guard against unauthorised views for team members
  useEffect(() => {
    if (!perms || perms.isOwner) return;

    // Check if the current view is allowed
    const viewConfig = views[activeView];
    const permKey = viewConfig?.label || '';
    const canSeeCurrent = activeView === 'dashboard' ? perms.can('Dashboard', 'view') : 
                        activeView === 'userprofile' ? true :
                        activeView === 'settings' ? false : // Strict block for members
                        perms.can(permKey, 'list');

    if (!canSeeCurrent) {
      // Find the first module they DO have access to
      const firstAvailableKey = Object.keys(views).find(key => {
        const conf = views[key];
        if (!conf || !conf.label) return false;
        if (key === 'userprofile') return true;
        if (key === 'dashboard') return perms.can('Dashboard', 'view');
        if (key === 'settings') return false; // Strict block for members
        return perms.can(conf.label, 'list');
      });

      if (firstAvailableKey && firstAvailableKey !== activeView) {
        setActiveView(firstAvailableKey);
      }
    }
  }, [perms, activeView, setActiveView]);



  if (isDiscovering || mainLoading || !perms) {
    return (
      <div className="loading-screen">
        <div className="logo">{settings?.brandShort || ''}</div>
        <div className="spinner" />
        <p>{isDiscovering ? 'Discovering Workspace...' : `Loading ${settings?.brandName || ''}...`}</p>
      </div>
    );
  }

  const currentView = views[activeView] || views.dashboard;

  return (
    <div className="app">
      <Sidebar 
        isSuperadmin={isSuperadmin} 
        leadCount={visibleLeads.length} 
        amcCount={amcExpiringCount} 
        isExpired={isExpired} 
        perms={perms}
        settings={settings}
      />
      <div className="main">
        <Topbar user={{ ...user, profile }} notifCount={liveNotifs.filter(n => n.unread).length} isExpired={isExpired} teamInfo={teamInfo} teamMembers={teamMembers} />
        <div className="content">
          {currentView.component ? React.cloneElement(currentView.component, { perms }) : <div className="p-xl">View not found or access denied</div>}
        </div>
      </div>
      <NotifPanel notifications={liveNotifs} onMarkRead={() => {}} onMarkAllRead={() => {}} />
    </div>
  );
}

