import React, { useState } from 'react';
import db from '../../instant';
import { useToast } from '../../context/ToastContext';
import SheetIntegration from './SheetIntegration';

export default function Integrations({ user }) {
  const toast = useToast();
  const [syncing, setSyncing] = useState(null);
  const [showConfig, setShowConfig] = useState(null); // { type: 'gsheets', index: number | null }
  const [activeTab, setActiveTab] = useState('all');

  const { data } = db.useQuery({ 
    userProfiles: { $: { where: { userId: user.id } } } 
  });
  const profile = data?.userProfiles?.[0];
  const gsheets = profile?.gsheets || [];

  const integrations = [
    {
      id: 'gsheets',
      name: 'Google Sheets',
      desc: 'Import leads directly from a shared Google Spreadsheet.',
      icon: '📊',
      connected: gsheets.length > 0,
      count: gsheets.length
    },
    // ... rest same
    {
      id: 'fbads',
      name: 'Facebook Ads',
      desc: 'Sync lead data from your Facebook Lead Forms in real-time.',
      icon: '🔵',
      connected: false
    },
    {
      id: 'gads',
      name: 'Google Ads',
      desc: 'Automatically capture leads from Google Search and Display ads.',
      icon: '🟡',
      connected: false
    }
  ];

  const handleSync = (id) => {
    setSyncing(id);
    setTimeout(() => {
      setSyncing(null);
      toast(`Successfully connected to ${id === 'gsheets' ? 'Google Sheets' : id === 'fbads' ? 'Facebook Ads' : 'Google Ads'}`, 'success');
    }, 2000);
  };

  if (showConfig?.type === 'gsheets') {
    return (
      <SheetIntegration 
        user={user} 
        onBack={() => setShowConfig(null)} 
        existingConfig={showConfig.index !== null ? gsheets[showConfig.index] : null} 
        editIndex={showConfig.index}
      />
    );
  }

  return (
    <div className="integrations">
      <div className="sh">
        <div>
          <h2>Integrations</h2>
          <div className="sub">Connect your lead sources and fetch data automatically</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginTop: 20 }}>
        {integrations.map(item => (
          <div key={item.id} className="tw" style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 32 }}>{item.icon}</span>
              <div>
                <h3 style={{ margin: 0 }}>{item.name}</h3>
                <span className={`badge ${item.connected ? 'bg-green' : 'bg-gray'}`} style={{ fontSize: 10, marginTop: 4 }}>
                  {item.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', flex: 1, lineHeight: 1.5, marginBottom: 20 }}>
              {item.desc}
            </p>
            {item.id === 'gsheets' && gsheets.length > 0 && (
              <div style={{ marginTop: -10, marginBottom: 15 }}>
                {gsheets.map((gs, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-soft)', borderRadius: 8, marginBottom: 6, fontSize: 12 }}>
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                      📄 {gs.configName || gs.mapping?.source?.value || gs.sheetId.substring(0, 8) + '...'}
                    </span>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 10 }} onClick={() => setShowConfig({ type: 'gsheets', index: idx })}>Edit</button>
                  </div>
                ))}
              </div>
            )}
            <button 
              className={`btn ${syncing === item.id ? 'btn-secondary' : 'btn-primary'} btn-sm`} 
              style={{ width: '100%' }}
              onClick={() => item.id === 'gsheets' ? setShowConfig({ type: 'gsheets', index: null }) : handleSync(item.id)}
              disabled={syncing !== null}
            >
              {syncing === item.id ? 'Connecting...' : item.id === 'gsheets' && gsheets.length > 0 ? '+ Add Another Sheet' : 'Connect Now'}
            </button>
          </div>
        ))}
      </div>

      <div className="tw" style={{ marginTop: 30, padding: 24, background: '#f8fafc', borderStyle: 'dashed' }}>
        <h4 style={{ margin: '0 0 12px 0' }}>💡 How it works</h4>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Once you connect an integration, TechCRM will periodically check for new leads. 
          New entries will automatically appear in your <strong>Leads</strong> dashboard with the source tag set (e.g., "FB Ads").
          You can also set up <strong>Automations</strong> to trigger follow-up emails as soon as a lead is fetched.
        </p>
      </div>
    </div>
  );
}
