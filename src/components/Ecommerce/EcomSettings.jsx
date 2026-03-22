import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useToast } from '../../context/ToastContext';

const TEMPLATES = [
  { id: 1, name: 'Clean Minimal', desc: 'White background, card grid, clean typography', preview: '🗒️' },
  { id: 2, name: 'Bold Vibrant', desc: 'Dark header, colorful badges, large product tiles', preview: '🎨' },
  { id: 3, name: 'Elegant Premium', desc: 'Muted palette, serif-inspired, premium feel', preview: '✨' },
];

export default function EcomSettings({ ownerId, globalSettings }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const { data } = db.useQuery({
    ecomSettings: { $: { where: { userId: ownerId } } },
  });
  const existing = data?.ecomSettings?.[0];
  const settingsId = existing?.id || id();

  const [form, setForm] = useState(null);

  // Initialize form from DB when data loads
  React.useEffect(() => {
    if (existing && !form) {
      setForm({
        ecomName: existing.ecomName || '',
        logo: existing.logo || '',
        bannerUrl: existing.bannerUrl || '',
        title: existing.title || '',
        tagline: existing.tagline || '',
        template: existing.template || 1,
      });
    } else if (!existing && !form) {
      setForm({ ecomName: '', logo: '', bannerUrl: '', title: '', tagline: '', template: 1 });
    }
  }, [existing]);

  if (!form) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading...</div>;

  const crmDomain = globalSettings?.crmDomain || window.location.origin;
  const storeUrl = form.ecomName ? `${crmDomain}/${form.ecomName}/store` : null;
  const ordersUrl = form.ecomName ? `${crmDomain}/${form.ecomName}/orders` : null;
  const appointmentUrl = form.ecomName ? `${crmDomain}/${form.ecomName}/appointment` : null;

  const save = async () => {
    if (!form.ecomName.trim()) { toast('Store URL slug is required', 'error'); return; }
    if (!/^[a-z0-9-]+$/.test(form.ecomName)) { toast('Slug must be lowercase letters, numbers, and hyphens only', 'error'); return; }
    setSaving(true);
    try {
      await db.transact(db.tx.ecomSettings[settingsId].update({ ...form, userId: ownerId, updatedAt: Date.now() }));
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
            <div className="fg">
              <label>
                Store URL Slug *
                <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6, fontWeight: 400 }}>lowercase, no spaces</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                <span style={{ padding: '8px 10px', background: 'var(--bg-soft)', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)' }}>
                  {crmDomain.replace('https://', '').replace('http://', '')}/
                </span>
                <input
                  value={form.ecomName}
                  onChange={e => setForm(p => ({ ...p, ecomName: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="chris"
                  style={{ border: 'none', borderRadius: 0, flex: 1 }}
                />
                <span style={{ padding: '8px 10px', background: 'var(--bg-soft)', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', borderLeft: '1px solid var(--border)' }}>
                  /store
                </span>
              </div>
            </div>

            <div className="fg">
              <label>Store Title</label>
              <input value={form.title} onChange={f('title')} placeholder="e.g. Chris Electronics" />
            </div>

            <div className="fg">
              <label>Store Tagline</label>
              <input value={form.tagline} onChange={f('tagline')} placeholder="e.g. Quality products at best prices" />
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
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${form.template === t.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: form.template === t.id ? 'rgba(99,102,241,0.05)' : '#fff',
                  }}
                >
                  <input type="radio" name="template" checked={form.template === t.id} onChange={() => setForm(p => ({ ...p, template: t.id }))} style={{ display: 'none' }} />
                  <span style={{ fontSize: 28 }}>{t.preview}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.desc}</div>
                  </div>
                  {form.template === t.id && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 700 }}>✓</span>}
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
                { label: '📅 Appointments', url: appointmentUrl },
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
