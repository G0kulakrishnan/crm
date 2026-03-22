import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useToast } from '../../context/ToastContext';

const TEMPLATES = [
  { id: 1, name: 'Minimal Grid', desc: 'Clean white background, centered grid', color: '#6366f1', type: 'grid' },
  { id: 2, name: 'Bold Vibrant', desc: 'Dark theme, high contrast, large tiles', color: '#8b5cf6', type: 'bold' },
  { id: 3, name: 'Elegant Premium', desc: 'Serif fonts, ivory background, luxury feel', color: '#1c1917', type: 'serif' },
  { id: 4, name: 'Efficient List', desc: 'Compact rows, ideal for large catalogs', color: '#f59e0b', type: 'list' },
];

function TemplatePreview({ type, active }) {
  const isDark = type === 'bold';
  const isList = type === 'list';
  const isSerif = type === 'serif';
  const accent = type === 'bold' ? '#8b5cf6' : type === 'list' ? '#ff9800' : type === 'serif' ? '#1c1917' : '#6366f1';
  
  return (
    <div style={{ 
      width: 220, height: 140, borderRadius: 20, background: isDark ? '#0f172a' : isSerif ? '#fafaf8' : '#fff', 
      border: `4px solid ${active ? accent : '#f1f5f9'}`, position: 'relative', overflow: 'hidden', padding: 15,
      boxShadow: active ? `0 20px 40px -12px ${accent}66` : '0 4px 12px rgba(0,0,0,0.06)',
      transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', cursor: 'pointer'
    }}>
      {/* Mini Header */}
      <div style={{ height: 22, background: (type === 'bold' || type === 'grid') ? accent : '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: 15, borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: isDark ? '#fff' : '#e2e8f0' }} />
        <div style={{ width: 40, height: 5, borderRadius: 3, background: isDark ? '#fff' : '#e2e8f0', opacity: 0.7 }} />
      </div>
      
      {/* Mock Content */}
      <div style={{ display: 'grid', gridTemplateColumns: isList ? '1fr' : '1fr 1fr', gap: 10 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ 
            height: isList ? 14 : 40, 
            background: isDark ? '#1e293b' : '#fff', 
            border: `2px solid ${isDark ? '#334155' : '#f8fafc'}`, 
            borderRadius: 10, display: 'flex', gap: 8, padding: 6,
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
          }}>
            <div style={{ width: isList ? 18 : '100%', height: isList ? 12 : 20, background: isDark ? '#4b5563' : '#f1f5f9', borderRadius: 4 }} />
            {isList && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ width: '85%', height: 5, background: isDark ? '#4b5563' : '#f1f5f9', borderRadius: 2 }} />
                <div style={{ width: '55%', height: 4, background: isDark ? '#4b5563' : '#f1f5f9', borderRadius: 2 }} />
              </div>
            )}
            {isList && <div style={{ width: 30, height: 12, background: accent, borderRadius: 4, opacity: 0.9 }} />}
          </div>
        ))}
      </div>

      {active && (
        <div style={{ 
          position: 'absolute', top: 10, right: 10, width: 28, height: 28, 
          background: accent, borderRadius: '50%', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', color: '#fff', 
          fontSize: 16, fontWeight: 900, boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          zIndex: 2
        }}>✓</div>
      )}
    </div>
  );
}

export default function EcomSettings({ ownerId, globalSettings }) {
  const toast = useToast();
  const { setActiveView } = useApp();
  const [saving, setSaving] = useState(false);

  const { data } = db.useQuery({
    ecomSettings: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } },
  });
  const profile = data?.userProfiles?.[0];
  const profileId = profile?.id;
  const existing = data?.ecomSettings?.[0];
  const settingsId = existing?.id || id();

  const [form, setForm] = useState(null);

  // Initialize form from DB when data loads
  React.useEffect(() => {
    if (existing && !form) {
      setForm({
        ecomName: existing.ecomName || profile?.slug || '',
        logo: existing.logo || '',
        bannerUrl: existing.bannerUrl || '',
        template: existing.template || 1,
        primaryColor: existing.primaryColor || '#880e4f',
        accentColor: existing.accentColor || '#fdd835',
        secondaryColor: existing.secondaryColor || '#2e7d32',
      });
    } else if (!existing && profile?.slug && !form) {
      setForm({ 
        ecomName: profile.slug, 
        template: 1, 
        primaryColor: '#880e4f', 
        accentColor: '#fdd835', 
        secondaryColor: '#2e7d32' 
      });
    } else if (!existing && !profile?.slug && !form && data) {
       // Fallback for new empty state
       setForm({ 
        ecomName: '', 
        template: 1, 
        primaryColor: '#880e4f', 
        accentColor: '#fdd835', 
        secondaryColor: '#2e7d32' 
      });
    }
  }, [existing, profile?.slug, data]);

  if (!form) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading...</div>;

  const crmDomain = (globalSettings?.crmDomain || window.location.origin).replace(/\/$/, '');
  const storeUrl = form.ecomName ? `${crmDomain}/${form.ecomName}/store` : null;
  const ordersUrl = form.ecomName ? `${crmDomain}/${form.ecomName}/orders` : null;
  const bookingUrl = form.ecomName ? `${crmDomain}/${form.ecomName}/book` : null;

  const save = async () => {
    if (!form.ecomName.trim()) { toast('Store URL slug is required', 'error'); return; }
    if (!/^[a-z0-9-]+$/.test(form.ecomName)) { toast('Slug must be lowercase letters, numbers, and hyphens only', 'error'); return; }
    setSaving(true);
    try {
      const txs = [db.tx.ecomSettings[settingsId].update({ ...form, userId: ownerId, updatedAt: Date.now() })];
      if (profileId) {
        txs.push(db.tx.userProfiles[profileId].update({ slug: form.ecomName }));
      }
      await db.transact(txs);
      toast('Store settings saved!', 'success');
    } catch (err) {
      toast('Save failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ maxWidth: 1000, paddingBottom: 60, fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="sh" style={{ marginBottom: 28 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 24 }}>
            <span style={{ fontSize: 28 }}>🎨</span> Website Theme & Colors
          </h2>
          <div className="sub" style={{ fontSize: 14, marginTop: 4 }}>Customize your store's brand identity and layout</div>
        </div>
        {storeUrl && (
          <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10 }}>
            👁 View Live Store ↗
          </a>
        )}
      </div>

      {/* 1. Preset Themes */}
      <div className="tw" style={{ padding: 28, marginBottom: 28, borderRadius: 20 }}>
        <h4 style={{ marginBottom: 20, fontSize: 13, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.8px', fontWeight: 700 }}>Preset Themes</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {[
            { name: 'Burgundy', p: '#880e4f', a: '#fdd835', s: '#2e7d32' },
            { name: 'Forest Green', p: '#2e7d32', a: '#fdd835', s: '#1b5e20' },
            { name: 'Deep Blue', p: '#1565c0', a: '#ff9800', s: '#0d47a1' },
            { name: 'Teal Modern', p: '#00695c', a: '#ff8f00', s: '#004d40' },
            { name: 'Charcoal', p: '#37474f', a: '#ff9800', s: '#263238' },
          ].map(t => {
            const active = form.primaryColor === t.p;
            return (
              <div key={t.name} onClick={() => setForm(f => ({ ...f, primaryColor: t.p, accentColor: t.a, secondaryColor: t.s }))}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', background: active ? '#fdf2f8' : '#fff',
                  border: `2px solid ${active ? '#880e4f' : '#e2e8f0'}`, borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s', minWidth: 170,
                  boxShadow: active ? '0 8px 16px -4px rgba(136,14,79,0.1)' : 'none'
                }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.p }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.a }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.s }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? '#880e4f' : '#475569' }}>{t.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Custom Colors & Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 28, marginBottom: 28 }}>
        <div className="tw" style={{ padding: 28, borderRadius: 20 }}>
          <h4 style={{ marginBottom: 24, fontSize: 13, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.8px', fontWeight: 700 }}>Custom Colors</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 8 }}>Primary Color</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="color" value={form.primaryColor} onChange={f('primaryColor')} style={{ width: 48, height: 48, border: 'none', borderRadius: 10, padding: 0, cursor: 'pointer' }} />
                <input type="text" value={form.primaryColor} onChange={f('primaryColor')} style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'monospace', fontSize: 13, padding: '10px' }} />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Used for headers and main buttons</div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 8 }}>Accent / Gold Color</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="color" value={form.accentColor} onChange={f('accentColor')} style={{ width: 48, height: 48, border: 'none', borderRadius: 10, padding: 0, cursor: 'pointer' }} />
                <input type="text" value={form.accentColor} onChange={f('accentColor')} style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'monospace', fontSize: 13, padding: '10px' }} />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Highlights, badges, and icons</div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 8 }}>Secondary Color</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="color" value={form.secondaryColor} onChange={f('secondaryColor')} style={{ width: 48, height: 48, border: 'none', borderRadius: 10, padding: 0, cursor: 'pointer' }} />
                <input type="text" value={form.secondaryColor} onChange={f('secondaryColor')} style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'monospace', fontSize: 13, padding: '10px' }} />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Success states and minor accents</div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 8 }}>Banner Image URL</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                 <input type="text" value={form.bannerUrl} onChange={f('bannerUrl')} placeholder="https://example.com/banner.jpg" style={{ flex: 1, fontSize: 13, padding: '10px' }} />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Background image for your store banner</div>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 8 }}>Current Shop URL</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                 <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Current Shop URL</div>
                   <a href={storeUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 800, color: '#0369a1', textDecoration: 'none', display: 'block', marginTop: 2, wordBreak: 'break-all' }}>
                     {storeUrl || 'NOT CONFIGURED'}
                   </a>
                 </div>
                 {storeUrl && <button onClick={() => { navigator.clipboard.writeText(storeUrl); toast('URL copied!', 'success'); }} style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', display: 'flex' }}>📋</button>}
              </div>
            </div>
          </div>

          {/* Live Preview Pills */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #f1f5f9' }}>
            <h4 style={{ marginBottom: 16, fontSize: 12, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '1px', fontWeight: 700 }}>Live Color Preview</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ padding: '10px 22px', background: form.primaryColor, color: '#fff', borderRadius: 12, fontSize: 13, fontWeight: 800, boxShadow: `0 4px 12px ${form.primaryColor}33` }}>Primary</div>
              <div style={{ padding: '10px 22px', background: form.accentColor, color: '#111827', borderRadius: 12, fontSize: 13, fontWeight: 800, boxShadow: `0 4px 12px ${form.accentColor}33` }}>Accent</div>
              <div style={{ padding: '10px 22px', background: form.secondaryColor, color: '#fff', borderRadius: 12, fontSize: 13, fontWeight: 800, boxShadow: `0 4px 12px ${form.secondaryColor}33` }}>Secondary</div>
            </div>
          </div>
        </div>

        {/* 3. Selected Layout (Templates) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="tw" style={{ padding: 28, borderRadius: 20 }}>
            <h4 style={{ marginBottom: 20, fontSize: 13, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.8px', fontWeight: 700 }}>Store Layout</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {TEMPLATES.map(t => (
                <label key={t.id} style={{ 
                  display: 'flex', alignItems: 'center', gap: 16, padding: '14px', 
                  background: form.template === t.id ? '#f8fafc' : '#fff', 
                  border: `2.5px solid ${form.template === t.id ? form.primaryColor : '#e2e8f0'}`, 
                  borderRadius: 18, cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: form.template === t.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                }}>
                  <input type="radio" name="template" checked={form.template === t.id} onChange={() => setForm(p => ({ ...p, template: t.id }))} style={{ display: 'none' }} />
                  <TemplatePreview type={t.type} active={form.template === t.id} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>{t.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ padding: '20px 24px', background: '#f0f9ff', borderRadius: 20, border: '1px solid #bae6fd', fontSize: 14, color: '#0369a1', lineHeight: 1.6 }}>
            <span style={{ fontSize: 18 }}>💡</span> <b>Pro Tip:</b> Logo, Banner and branding text are automatically synced from your <b>Business Profile</b> to keep your identity unified across the CRM.
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: 8, borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: '14px 40px', fontSize: 16, borderRadius: 12, fontWeight: 800, boxShadow: `0 8px 16px ${form.primaryColor}44` }}>
          {saving ? '⏳ Saving Settings...' : '💾 Save Theme & Settings'}
        </button>
      </div>
    </div>
  );
}
