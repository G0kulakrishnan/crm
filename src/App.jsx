import React from 'react';
import db from './instant';
import { ToastProvider } from './context/ToastContext';
import { AppProvider } from './context/AppContext';
import AuthScreen from './components/Auth/AuthScreen';
import MainApp from './components/Layout/MainApp';
import StorePage from './components/Ecommerce/StorePage';
import TrackingPage from './components/Ecommerce/TrackingPage';
import BookingPage from './components/Appointments/BookingPage';
import UserManual from './components/System/UserManual';
import PartnerRegistration from './components/Partners/PartnerRegistration';
import PartnerApp from './components/Partners/PartnerApp';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("T2GCRM Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>🚧</div>
          <h1 style={{ marginBottom: 10 }}>Oops! Something went wrong.</h1>
          <p style={{ color: '#64748b', marginBottom: 20 }}>The application encountered a runtime error and crashed.</p>
          <div style={{ background: '#f1f5f9', padding: 20, borderRadius: 8, maxWidth: 600, width: '100%', textAlign: 'left', marginBottom: 20, overflowX: 'auto' }}>
            <code style={{ color: '#dc2626', fontSize: 13, whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</code>
          </div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload Application</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const { isLoading, user, error } = db.useAuth();
  const { data } = db.useQuery({ globalSettings: {} });
  const rawSettings = data?.globalSettings?.[0] || {};
  const settings = {
    brandName: rawSettings.brandName || '',
    brandShort: rawSettings.brandShort || '',
    title: rawSettings.title || '',
    favicon: rawSettings.favicon || '',
    crmDomain: rawSettings.crmDomain || '',
    brandLogo: rawSettings.brandLogo || '',
    showBranding: rawSettings.showBranding !== false,
    plans: rawSettings.plans ? JSON.parse(rawSettings.plans) : null,
  };

  React.useEffect(() => {
    document.title = settings.title || settings.brandName || 'T2GCRM';
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (settings.favicon) {
      link.href = settings.favicon;
    }
  }, [settings.title, settings.brandName, settings.favicon]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="logo">{settings.brandShort || 'T2G'}</div>
        <div className="spinner" />
        <p>Loading {settings.brandName || 'T2GCRM'}...</p>
      </div>
    );
  }

  const path = window.location.pathname.toLowerCase();
  const isPublicStore = path.endsWith('/store');
  const isPublicOrders = path.endsWith('/orders');
  const isPublicBooking = path.endsWith('/book') || path.endsWith('/appointment');
  const isPublicManual = path.endsWith('/manual');
  const isPartnerReg = path.includes('/partner/register');

  if (isPublicManual) return <UserManual isPublic={true} settings={settings} />;
  if (isPublicStore) return <StorePage />;
  if (isPublicOrders) return <TrackingPage />;
  if (isPublicBooking) return <BookingPage />;
  if (isPartnerReg) return <PartnerRegistration params={{ slug: path.split('/')[1] !== 'partner' ? path.split('/')[1] : '' }} />;

  if (!user) {
    return <AuthScreen settings={settings} />;
  }

  const storedPartner = localStorage.getItem('tc_channel_partner');
  
  const partnerQuery = (!storedPartner && user?.email) 
    ? { partnerApplications: { $: { where: { email: String(user.email).toLowerCase(), status: 'Approved' }, limit: 1 } } }
    : null;
    
  const { data: partnerData, isLoading: partnerLoading } = db.useQuery(partnerQuery);
  const isDiscoveringPartner = !!partnerQuery && partnerLoading;

  if (isDiscoveringPartner) {
    return (
      <div className="loading-screen">
        <div className="logo">{settings.brandShort || 'T2G'}</div>
        <div className="spinner" />
        <p>Discovering account type...</p>
      </div>
    );
  }

  let finalPartnerInfo = null;
  if (storedPartner) {
    try { finalPartnerInfo = JSON.parse(storedPartner); } catch(e) {}
  } else if (partnerData?.partnerApplications?.[0]) {
    const p = partnerData.partnerApplications[0];
    finalPartnerInfo = {
      isPartner: true,
      ownerUserId: p.userId,
      partnerId: p.id,
      role: p.role
    };
    localStorage.setItem('tc_channel_partner', JSON.stringify(finalPartnerInfo));
  }

  if (finalPartnerInfo?.isPartner) {
    return (
      <ErrorBoundary>
        <AppProvider user={user}>
          <PartnerApp user={user} settings={settings} partnerInfo={finalPartnerInfo} />
        </AppProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppProvider user={user}>
        <MainApp user={user} settings={settings} />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
