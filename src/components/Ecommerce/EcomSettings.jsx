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
  const accent = type === 'bold' ? '#8b5cf6' : type === 'list' ? '#f59e0b' : type === 'serif' ? '#1c1917' : '#6366f1';
  
  return (
    <div style={{ 
      width: 80, height: 60, borderRadius: 6, background: isDark ? '#1e293b' : '#f8fafc', 
      border: `1px solid ${active ? accent : '#e2e8f0'}`, position: 'relative', overflow: 'hidden', padding: 4,
      boxShadow: active ? `0 0 0 2px ${accent}22` : 'none'
    }}>
      {/* Header mock */}
      <div style={{ height: 10, background: type === 'bold' ? accent : '#fff', borderBottom: '1px solid #eee', marginBottom: 4, borderRadius: 2 }} />
      {/* Content mocks */}
      <div style={{ display: 'grid', gridTemplateColumns: isList ? '1fr' : '1fr 1fr', gap: 3 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: isList ? 6 : 14, background: isDark ? '#334155' : '#fff', border: '1px solid #eee', borderRadius: 2, display: 'flex', gap: 2, padding: 1 }}>
            <div style={{ width: isList ? 6 : '100%', height: isList ? 4 : 8, background: '#f1f5f9', borderRadius: 1 }} />
            {isList && <div style={{ flex: 1, height: 2, background: '#f1f5f9', marginTop: 1 }} />}
          </div>
        ))}
      </div>
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
        ecomName: profile?.slug || existing.ecomName || '',
        logo: existing.logo || '',
        bannerUrl: existing.bannerUrl || '',
        title: existing.title || '',
        tagline: existing.tagline || '',
        template: existing.template || 1,
      });
    } else if (!existing && !form) {
      setForm({ ecomName: profile?.slug || '', logo: '', bannerUrl: '', title: '', tagline: '', template: 1 });
    }
  }, [existing, profile?.slug]);

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
    <div>
      <div className="sh">
        <div>
          <h2>🌐 E-Commerce Website Settings</h2>
          <div className="sub">Configure your public store, appearance &amp; URL</div>
        </div>
        {storeUrl && (
          <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            👁 View Live Store ↗
          </a>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900 }}>
        {/* Left: Store Identity */}
        <div className="tw" style={{ padding: 24 }}>
          <h4 style={{ marginBottom: 16, fontSize: 14 }}>🏪 Store Identity</h4>
          <div className="fgrid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="fg" style={{ marginBottom: 16 }}>
              {form.ecomName && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
                    To change your URL, visit <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setActiveView('settings')}>Business Profile Settings</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Public Store URL</div>
                      <a href={`${crmDomain}/${form.ecomName}/store`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', display: 'block', wordBreak: 'break-all' }}>
                        {crmDomain}/{form.ecomName}/store
                      </a>
                    </div>
                    <button className="btn-icon" style={{ padding: '8px', background: 'var(--bg-soft)', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', flexShrink: 0 }} title="Copy URL" onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(`${crmDomain}/${form.ecomName}/store`); toast('Store link copied!', 'success'); }}>
                      📋
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="fg">
              <label>
                Store Logo URL
                <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6, fontWeight: 400 }}>Recommended: 200×200px</span>
              </label>
              <input value={form.logo} onChange={f('logo')} placeholder="https://example.com/logo.png" />
              {form.logo && <img src={form.logo} alt="Logo preview" style={{ marginTop: 8, height: 48, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)' }} onError={e => e.target.style.display='none'} />}
            </div>

            <div className="fg">
              <label>
                Banner Image URL
                <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6, fontWeight: 400 }}>Recommended: 1920×600px, JPG/PNG, max 200KB</span>
              </label>
              <input value={form.bannerUrl} onChange={f('bannerUrl')} placeholder="https://example.com/banner.jpg" />
              {form.bannerUrl && (
                <img src={form.bannerUrl} alt="Banner preview" style={{ marginTop: 8, width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} onError={e => e.target.style.display='none'} />
              )}
            </div>
          </div>
        </div>

        {/* Right: Template & Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="tw" style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 14, fontSize: 14 }}>🎨 Store Template</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TEMPLATES.map(t => (
                <label
                  key={t.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '12px',
                    borderRadius: 12, cursor: 'pointer',
                    border: `2.5px solid ${form.template === t.id ? t.color : 'transparent'}`,
                    background: form.template === t.id ? '#f8fafc' : '#fff',
                    boxShadow: form.template === t.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <input type="radio" name="template" checked={form.template === t.id} onChange={() => setForm(p => ({ ...p, template: t.id }))} style={{ display: 'none' }} />
                  <TemplatePreview type={t.type} active={form.template === t.id} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.desc}</div>
                  </div>
                  {form.template === t.id && (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: t.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>
                      ✓
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {storeUrl && (
            <div className="tw" style={{ padding: 20 }}>
              <h4 style={{ marginBottom: 12, fontSize: 13 }}>🔗 Your Public URLs</h4>
              {[
                { label: '🛒 Store', url: storeUrl },
                { label: '📦 Orders', url: ordersUrl },
                { label: '📅 Booking', url: bookingUrl },
              ].map(({ label, url }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <code style={{ fontSize: 11, flex: 1, padding: '5px 8px', background: 'var(--bg-soft)', borderRadius: 5, border: '1px solid var(--border)' }}>{url}</code>
                    <button className="btn-icon" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { navigator.clipboard.writeText(url); toast('Copied!', 'success'); }}>📋</button>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ fontSize: 11, padding: '4px 8px', textDecoration: 'none' }}>↗</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, maxWidth: 900 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Store Settings'}
        </button>
      </div>
    </div>
  );
}
