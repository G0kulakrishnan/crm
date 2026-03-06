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

export default function MainApp({ user }) {
  // Start automation background worker
  useAutomationEngine(user);

  const { activeView, notifOpen } = useApp();
  const [notifications, setNotifications] = useState([]);

  // Query all user data from InstantDB for this user
  const { isLoading, data } = db.useQuery({
    leads: { $: { where: { userId: user.id } } },
    amc: { $: { where: { userId: user.id } } },
    subs: { $: { where: { userId: user.id } } },
    userProfiles: {}, 
  });

  const leads = data?.leads || [];
  const amc = data?.amc || [];
  const subs = data?.subs || [];
  const allProfiles = data?.userProfiles || [];
  const profile = allProfiles.find(p => p.userId === user.id);
  const isSuperadmin = profile?.role === 'superadmin' || user.email === 'santhanam.gokul@gmail.com';

  // Auto-create or upgrade profile with 7-day trial
  React.useEffect(() => {
    if (!isLoading && data) {
      if (!profile) {
        const isFirst = allProfiles.length === 0;
        db.transact(db.tx.userProfiles[id()].update({
          userId: user.id,
          email: user.email,
          role: (isFirst || user.email === 'santhanam.gokul@gmail.com') ? 'superadmin' : 'user',
          plan: 'Trial',
          planExpiry: Date.now() + (TRIAL_DAYS * 24 * 60 * 60 * 1000),
          createdAt: Date.now()
        }));
      } else if ((allProfiles.length === 1 || user.email === 'santhanam.gokul@gmail.com') && profile.role !== 'superadmin') {
        // Upgrade the only existing user or specific email to superadmin
        db.transact(db.tx.userProfiles[profile.id].update({ role: 'superadmin' }));
      }
    }
  }, [isLoading, data, profile, allProfiles.length]);

  // Build notifications
  const liveNotifs = useMemo(() => {
    const now = new Date();
    const notifs = [];
    amc.forEach(a => {
      const diff = Math.ceil((new Date(a.endDate) - now) / (1000 * 60 * 60 * 24));
      if (diff <= 30 && diff >= 0)
        notifs.push({ id: 'amc-' + a.id, unread: true, title: `🛡 AMC Expiring: ${a.client}`, desc: `Contract ${a.contractNo} expires in ${diff} day${diff !== 1 ? 's' : ''}`, time: new Date().toLocaleString() });
      if (diff < 0)
        notifs.push({ id: 'amcx-' + a.id, unread: true, title: `❌ AMC Expired: ${a.client}`, desc: `Contract ${a.contractNo} has expired`, time: new Date().toLocaleString() });
    });
    subs.forEach(s => {
      const diff = Math.ceil((new Date(s.nextPayment) - now) / (1000 * 60 * 60 * 24));
      if (diff <= 7 && diff >= 0)
        notifs.push({ id: 'sub-' + s.id, unread: true, title: `💰 Payment Due: ${s.client}`, desc: `₹${(s.amount || 0).toLocaleString()} for ${s.plan} due in ${diff} day${diff !== 1 ? 's' : ''}`, time: new Date().toLocaleString() });
    });
    const overdue = leads.filter(l => l.followup && new Date(l.followup) < now);
    if (overdue.length)
      notifs.push({ id: 'fu-overdue', unread: true, title: `⏰ ${overdue.length} Overdue Follow-up${overdue.length > 1 ? 's' : ''}`, desc: `Leads: ${overdue.map(l => l.name).join(', ')}`, time: new Date().toLocaleString() });
    return notifs;
  }, [amc, subs, leads]);

  const amcExpiring = amc.filter(a => {
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

  if (isLoading || (data && !profile && !isSuperadmin)) {
    return (
      <div className="loading-screen">
        <div className="logo">TC</div>
        <div className="spinner" />
        <p>Configuring your workspace...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar isSuperadmin={isSuperadmin} leadCount={leads.length} amcCount={amcExpiring} />
      <div className="main">
        <Topbar user={{ ...user, profile }} notifCount={liveNotifs.filter(n => n.unread).length} />
        <div className="content">
          {views[activeView] || views.dashboard}
        </div>
      </div>
      <NotifPanel
        notifications={liveNotifs}
        onMarkRead={(id) => {}}
        onMarkAllRead={() => {}}
      />
    </div>
  );
}
