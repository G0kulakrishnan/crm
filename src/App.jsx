import React from 'react';
import db from './instant';
import { ToastProvider } from './context/ToastContext';
import { AppProvider } from './context/AppContext';
import AuthScreen from './components/Auth/AuthScreen';
import MainApp from './components/Layout/MainApp';

function AppInner() {
  const { isLoading, user, error } = db.useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="logo">TC</div>
        <div className="spinner" />
        <p>Loading TechCRM...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <AppProvider user={user}>
      <MainApp user={user} />
    </AppProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
