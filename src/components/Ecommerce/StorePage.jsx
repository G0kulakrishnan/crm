import React, { useState, useEffect, useMemo } from 'react';
import { init } from '@instantdb/react';

const APP_ID = import.meta.env.VITE_INSTANT_APP_ID;
const db = init({ appId: APP_ID });

/* ─────────── RESPONSIVE CSS ─────────── */
const RESPONSIVE_CSS = `
  @media (max-width: 768px) {
    .banner { height: 180px !important; }
    .banner h1 { font-size: 24px !important; }
    .mobile-hide { display: none !important; }
    .mobile-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
    .store-container { padding: 12px 10px !important; }
  }
`;

/* ─────────── SHARED COMPONENTS ─────────── */
function ProductItem({ p, inCart, theme, isDark, addToCart, removeFromCart, primary, secondary }) {
  const isList = theme === 'list';
  const isCatalog = theme === 'catalog';
  
  const textColor = isDark ? (isList || isCatalog ? '#1e293b' : '#f1f5f9') : '#1e293b';
  const cardBg = isDark ? (isList || isCatalog ? '#fff' : '#1e293b') : '#fff';
  const borderColor = isDark ? '#334155' : '#e5e7eb';
  const rateStr = (p.rate || 0).toLocaleString();

  // --- TEMPLATE 5: COMPACT CATALOG (No Images, Text only row) ---
  if (isCatalog) {
    return (
      <div key={p.id} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f1f5f9', gap: 12, background: '#fff', color: '#1e293b' }}>
         <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
            {p.desc && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{p.desc}</div>}
         </div>
         <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#111827' }}>₹{rateStr}</div>
            {inCart ? (
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, background: '#f8fafc', padding: 3, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                 <button onClick={() => removeFromCart(p.id)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                 <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 900 }}>{inCart.qty}</span>
                 <button onClick={() => addToCart(p)} style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: primary, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            ) : (
              <button onClick={() => addToCart(p)} style={{ background: primary, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>ADD</button>
            )}
         </div>
      </div>
    );
  }

  // --- TEMPLATE 4: EFFICIENT LIST (Image Row) ---
  if (isList) {
    return (
      <div key={p.id} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 20, padding: 18, borderBottom: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`, background: '#fff', color: '#1e293b' }}>
         <div style={{ width: 85, height: 85, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1px solid #f1f5f9' }}>
            {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🛍️</div>}
         </div>
         <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: primary }}>{p.name}</div>
            {p.desc && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{p.desc}</div>}
            <div style={{ fontWeight: 900, fontSize: 18, marginTop: 8, color: '#111827' }}>₹{rateStr}</div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
               {inCart ? (
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                     <button onClick={() => removeFromCart(p.id)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #ddd', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                     <span style={{ fontWeight: 800, minWidth: 24, textAlign: 'center', color: '#111827' }}>{inCart.qty}</span>
                     <button onClick={() => addToCart(p)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
               ) : (
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                    <input type="number" defaultValue="1" style={{ width: 45, padding: '8px', border: '1px solid #ddd', borderRadius: 6, textAlign: 'center', fontWeight: 700, color: '#111827' }} readOnly className="mobile-hide" />
                    <button onClick={() => addToCart(p)} style={{ background: '#f97316', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>Add to cart</button>
                  </div>
               )}
            </div>
         </div>
      </div>
    );
  }

  // --- DEFAULT GRID (Minimal/Bold/Elegant) ---
  const isGallery = theme === 'gallery'; // Assume ID 3 is gallery
  return (
    <div key={p.id} style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${borderColor}`, background: cardBg, display: 'flex', flexDirection: 'column', transition: 'transform 0.2s shadow 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
       <div style={{ height: isGallery ? 300 : 220, background: isDark ? '#334155' : '#f8fafc', position: 'relative' }}>
          {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>🛍️</div>}
          {p.category && <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.9)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, color: '#1e293b', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{p.category}</div>}
       </div>
       <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: textColor, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.name}</div>
          {p.desc && <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 38 }}>{p.desc}</div>}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 19, color: textColor }}>₹{rateStr}</div>
            <button onClick={() => addToCart(p)} style={{ background: primary, color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'opacity 0.2s' }}>{inCart ? `Add (${inCart.qty})` : 'Add'}</button>
          </div>
       </div>
    </div>
  );
}

/* ─────────── CHECKOUT MODAL ─────────── */
function CheckoutModal({ cart, ownerId, ecomName, customerSession, onClose, onSuccess, primary }) {
  const [form, setForm] = useState({ name: customerSession?.name || '', email: customerSession?.email || '', phone: customerSession?.phone || '', address: customerSession?.address || '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const total = cart.reduce((s, i) => s + i.rate * i.qty, 0);

  const submit = async () => {
    if (!form.name || !form.phone) return alert('Name and Phone are required');
    setSubmitting(true);
    try {
      const res = await fetch('/api/ecom/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerId, ecomName, customer: form, items: cart, total }) });
      const data = await res.json();
      if (data.success) { setDone(true); localStorage.setItem(`session_${ecomName}`, JSON.stringify(form)); onSuccess?.(form); }
      else alert(data.error);
    } catch (err) { alert('Network error'); } finally { setSubmitting(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 80 }}>📦</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>Order Placed!</h2>
            <p style={{ color: '#4b5563', marginBottom: 24 }}>Thank you, {form.name}. We'll process your order soon.</p>
            <button onClick={onClose} style={{ width: '100%', padding: 16, background: primary, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>Finish</button>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 20 }}>Complete Checkout</h3>
            <div style={{ display: 'grid', gap: 16 }}>
               <div><label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>Full Name</label><input placeholder="Required" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={{ width: '100%', padding: 14, border: '1.5px solid #e2e8f0', borderRadius: 10 }} /></div>
               <div><label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>Phone Number</label><input placeholder="Required" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} style={{ width: '100%', padding: 14, border: '1.5px solid #e2e8f0', borderRadius: 10 }} /></div>
               <div><label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>Delivery Address</label><textarea placeholder="Optional" value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} style={{ width: '100%', padding: 14, border: '1.5px solid #e2e8f0', borderRadius: 10, height: 100 }} /></div>
            </div>
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>TOTAL AMOUNT</div>
               <div style={{ fontSize: 20, fontWeight: 900, color: '#1e293b' }}>₹{total.toLocaleString()}</div>
            </div>
            <button onClick={submit} disabled={submitting} style={{ width: '100%', padding: 18, background: primary, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 16, marginTop: 24, cursor: 'pointer', boxShadow: `0 10px 20px ${primary}33` }}>{submitting ? 'PROCESSING...' : `CONFIRM ORDER`}</button>
            <button onClick={onClose} style={{ width: '100%', padding: 12, color: '#94a3b8', border: 'none', background: 'none', marginTop: 8, cursor: 'pointer', fontSize: 14 }}>Go Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── MAIN STORE PAGE ─────────── */
export default function StorePage() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const ecomName = pathParts[0] || '';
  const [cart, setCart] = useState(() => { try { const s = localStorage.getItem(`cart_${ecomName}`); return s ? JSON.parse(s) : []; } catch { return []; } });
  useEffect(() => { localStorage.setItem(`cart_${ecomName}`, JSON.stringify(cart)); }, [cart, ecomName]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerSession, setCustomerSession] = useState(() => { try { const s = localStorage.getItem(`session_${ecomName}`); return s ? JSON.parse(s) : null; } catch { return null; } });
  
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');

  const cleanSlug = ecomName.toLowerCase().trim();
  const { data, isLoading } = db.useQuery({ 
    userProfiles: { $: { where: { slug: cleanSlug } } }, 
    ecomSettings: { $: { where: { ecomName: cleanSlug } } }, 
    products: {} 
  });

  const profile = data?.userProfiles?.[0];
  const settings = useMemo(() => {
    const s = { ...(data?.ecomSettings?.[0] || {}) };
    if (profile) {
      if (profile.bizName) s.title = profile.bizName;
      if (profile.logo) s.logo = profile.logo;
      if (profile.bannerUrl && !s.bannerUrl) s.bannerUrl = profile.bannerUrl;
    }
    return s;
  }, [data?.ecomSettings, profile]);

  const ownerId = profile?.userId || settings?.userId;
  const allProducts = useMemo(() => {
    return (data?.products || []).filter(p => p.userId === ownerId && p.listInEcom);
  }, [data?.products, ownerId]);

  const categories = useMemo(() => {
    return [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  }, [allProducts]);

  const filtered = useMemo(() => {
    let list = allProducts;
    if (cat !== 'All') list = list.filter(p => p.category === cat);
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [allProducts, cat, search]);

  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>Loading...</div>;
  if (!ownerId) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#6b7280' }}><h2>🏪 Store Not Found</h2></div>;

  const templateId = Number(settings?.template) || 1;
  const primaryC = settings.primaryColor || '#6366f1';
  const a = settings.accentColor || '#fdd835';
  const secondaryC = settings.secondaryColor || '#2e7d32';

  const isDark = templateId === 2;
  const theme = templateId === 5 ? 'catalog' : (templateId === 4 ? 'list' : 'grid');

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f1f5f9' : '#1e293b' }}>
      <style>{RESPONSIVE_CSS}</style>
      
      {/* Header */}
      <header style={{ background: isDark ? `${primaryC}99` : '#fff', borderBottom: `2px solid ${primaryC}`, padding: '0 20px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: isDark ? 'blur(10px)' : 'none' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
           <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
             {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 36, width: 36, objectFit: 'contain', borderRadius: 6 }} />}
             <div style={{ fontWeight: 900, fontSize: 18 }}>{settings.title || 'Store'}</div>
           </div>
           <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
             {customerSession && <a href={`/${ecomName}/orders`} style={{ fontSize: 13, color: isDark ? '#fff' : primaryC, fontWeight: 700, textDecoration: 'none' }}>ORDERS</a>}
             <div onClick={() => setShowCheckout(true)} style={{ background: isDark ? a : primaryC, color: isDark ? '#000' : '#fff', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 900, fontSize: 13, boxShadow: `0 4px 12px ${primaryC}33` }}>
                🛒 ({cart.length})
             </div>
           </div>
        </div>
      </header>

      {/* Banner */}
      {settings.bannerUrl && (
        <div className="banner" style={{ background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${settings.bannerUrl}) center/cover no-repeat`, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ textAlign: 'center', color: '#fff', padding: '0 20px', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
             <h1 style={{ fontSize: 42, fontWeight: 900, marginBottom: 4, letterSpacing: '-1px' }}>{settings.title}</h1>
             {settings.tagline && <p style={{ fontSize: 18, fontWeight: 500, opacity: 0.9 }}>{settings.tagline}</p>}
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="store-container" style={{ maxWidth: templateId === 5 ? 1000 : 1200, margin: '0 auto', padding: '24px 16px' }}>
         
         {/* Filter Section */}
         <div style={{ display: 'flex', flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <input 
                placeholder="Search products..." 
                value={search} onChange={e => setSearch(e.target.value)} 
                style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${isDark ? '#334155' : '#e2e8f0'}`, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', color: isDark ? '#fff' : '#1e293b', fontSize: 14, outline: 'none' }} 
              />
            </div>
            <div className="mobile-scroll" style={{ display: 'flex', flexDirection: 'row', gap: 8, flex: 2 }}>
               {['All', ...categories].map(c => (
                  <button key={c} onClick={() => setCat(c)} style={{ padding: '10px 18px', borderRadius: 25, border: `1.5px solid ${cat === c ? primaryC : (isDark ? '#334155' : '#e2e8f0')}`, background: cat === c ? primaryC : (isDark ? 'rgba(255,255,255,0.05)' : '#fff'), color: cat === c ? '#fff' : (isDark ? '#94a3b8' : '#64748b'), fontWeight: 800, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{c}</button>
               ))}
            </div>
         </div>

         {/* Product Grid/List */}
         <div style={{ 
            display: theme === 'grid' ? 'grid' : 'flex', 
            flexDirection: 'column',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
            gap: theme === 'grid' ? 24 : 0,
            borderRadius: 16, border: theme === 'grid' ? 'none' : `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            overflow: 'hidden', background: theme === 'grid' ? 'transparent' : (isDark ? '#1e293b' : '#fff')
         }}>
           {filtered.map(p => (
              <ProductItem key={p.id} p={p} inCart={cart.find(c => c.id === p.id)} theme={theme} isDark={isDark} addToCart={pi => setCart(prev => { const ex = prev.find(i => i.id === pi.id); if (ex) return prev.map(i => i.id === pi.id ? { ...i, qty: i.qty + 1 } : i); return [...prev, { ...pi, qty: 1 }]; })} removeFromCart={pid => setCart(prev => { const ex = prev.find(i => i.id === pid); if (ex?.qty <= 1) return prev.filter(i => i.id !== pid); return prev.map(i => i.id === pid ? { ...i, qty: i.qty - 1 } : i); })} primary={primaryC} secondary={secondaryC} />
           ))}
           {filtered.length === 0 && <div style={{ padding: 64, textAlign: 'center', color: '#94a3b8' }}><h3>No products found</h3></div>}
         </div>
      </main>

      {showCheckout && <CheckoutModal cart={cart} ownerId={ownerId} ecomName={ecomName} customerSession={customerSession} onClose={() => setShowCheckout(false)} onSuccess={setCustomerSession} primary={primaryC} />}
    </div>
  );
}
