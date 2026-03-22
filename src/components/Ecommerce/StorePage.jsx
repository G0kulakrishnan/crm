import React, { useState, useEffect, useMemo } from 'react';
import { init } from '@instantdb/react';

const APP_ID = import.meta.env.VITE_INSTANT_APP_ID;
const db = init({ appId: APP_ID });

const RESPONSIVE_CSS = `
  @media (max-width: 768px) {
    .store-container { padding: 16px 12px !important; }
    .product-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
    .header-content { height: auto !important; padding: 12px 0 !important; flex-direction: column !important; gap: 12px !important; }
    .btn-cart { width: 100% !important; justify-content: center !important; }
    .banner { height: 200px !important; }
    .banner h1 { fontSize: 28px !important; }
    .list-item { grid-template-columns: 1fr !important; gap: 8px !important; padding: 16px !important; }
    .list-item > div { width: 100% !important; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    .list-item > div:last-child { border: none; }
    .hide-mobile { display: none !important; }
    .list-price-action { flex-direction: row !important; align-items: center !important; }
  }
  .product-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid #e5e7eb; }
  .product-card:hover { transform: translateY(-4px); border-color: #6366f1; box-shadow: 0 12px 24px -10px rgba(99,102,241,0.15); }
  .btn-hover:hover { opacity: 0.9; transform: scale(1.02); }
  .btn-hover:active { transform: scale(0.98); }
`;

/* ─────────── TEMPLATE 1: Clean Minimal ─────────── */
function Template1({ settings, products, categories, cart, addToCart, removeFromCart, ecomName, customerSession, setShowCheckout }) {
  const p = settings.primaryColor || '#6366f1';
  const a = settings.accentColor || '#fdd835';
  const s = settings.secondaryColor || '#2e7d32';

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#f9fafb' }}>
      <style>{RESPONSIVE_CSS}</style>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="header-content" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 40, width: 40, objectFit: 'contain', borderRadius: 8 }} />}
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>{settings.title || 'Store'}</div>
              {settings.tagline && <div style={{ fontSize: 11, color: '#6b7280' }}>{settings.tagline}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {customerSession && <a href={`/${ecomName}/orders`} style={{ color: p, fontWeight: 600, fontSize: 13, textDecoration: 'none', background: `${p}15`, padding: '8px 14px', borderRadius: 10 }}>📦 Orders</a>}
            <div onClick={() => setShowCheckout(true)} className="btn-cart btn-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, background: p, color: '#fff', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: `0 4px 12px ${p}33` }}>
              🛒 {cart.reduce((s, i) => s + i.qty, 0)} items
            </div>
          </div>
        </div>
      </header>
      {settings.bannerUrl && (
        <div className="banner" style={{ background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${settings.bannerUrl}) center/cover no-repeat`, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#fff', padding: '0 20px' }}>
            <h1 style={{ fontSize: 42, fontWeight: 900, marginBottom: 8 }}>{settings.title}</h1>
            {settings.tagline && <p style={{ fontSize: 18, fontWeight: 500, opacity: 0.9 }}>{settings.tagline}</p>}
          </div>
        </div>
      )}
      <ProductGrid 
        products={products} categories={categories} addToCart={addToCart} removeFromCart={removeFromCart} cart={cart} theme="minimal"
        primary={p} accent={a} secondary={s}
      />
    </div>
  );
}

/* ─────────── TEMPLATE 2: Bold Vibrant ─────────── */
function Template2({ settings, products, categories, cart, addToCart, removeFromCart, ecomName, customerSession, setShowCheckout }) {
  const p = settings.primaryColor || '#880e4f';
  const a = settings.accentColor || '#fdd835';
  const s = settings.secondaryColor || '#2e7d32';

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#0f172a' }}>
      <style>{RESPONSIVE_CSS}</style>
      <header style={{ background: `${p}99`, backdropFilter: 'blur(12px)', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div className="header-content" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#fff' }}>
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" style={{ height: 48, width: 48, objectFit: 'contain', borderRadius: 12, border: '2px solid rgba(255,255,255,0.2)' }} />
            ) : (
              <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #fff, #e2e8f0)', color: p, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, fontSize: 24, fontWeight: 900 }}>{settings.title?.[0] || 'S'}</div>
            )}
            <div>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.5px' }}>{settings.title || 'Store'}</div>
              {settings.tagline && <div style={{ fontSize: 12, color: '#e2e8f0', opacity: 0.9, fontWeight: 500 }}>{settings.tagline}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {customerSession && <a href={`/${ecomName}/orders`} style={{ color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none', background: 'rgba(255,255,255,0.1)', padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>📦 My Orders</a>}
            <div onClick={() => setShowCheckout(true)} className="btn-cart btn-hover" style={{ display: 'flex', alignItems: 'center', gap: 10, background: a, color: '#111827', padding: '10px 24px', borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 14, boxShadow: `0 10px 20px -5px ${a}99`, border: '1px solid rgba(255,255,255,0.1)' }}>
              🛒 {cart.reduce((s, i) => s + i.qty, 0)} ITEMS
            </div>
          </div>
        </div>
      </header>
      {settings.bannerUrl && (
        <div className="banner" style={{ background: `url(${settings.bannerUrl}) center/cover no-repeat`, height: 320, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)' }} />
          <div style={{ textAlign: 'center', color: '#fff', position: 'relative', zIndex: 1, padding: '0 20px' }}>
            <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 12 }}>{settings.title}</h1>
            {settings.tagline && <p style={{ fontSize: 20, color: '#cbd5e1', fontWeight: 500 }}>{settings.tagline}</p>}
          </div>
        </div>
      )}
      <ProductGrid products={products} categories={categories} addToCart={addToCart} removeFromCart={removeFromCart} cart={cart} theme="vibrant" primary={p} accent={a} secondary={s} />
    </div>
  );
}

/* ─────────── TEMPLATE 3: Elegant Premium ─────────── */
function Template3({ settings, products, categories, cart, addToCart, removeFromCart, ecomName, setShowCheckout }) {
  const p = settings.primaryColor || '#1c1917';
  const a = settings.accentColor || '#c5a059';
  const s = settings.secondaryColor || '#2e7d32';

  return (
    <div style={{ fontFamily: '"Playfair Display", Georgia, serif', minHeight: '100vh', background: '#fafaf8' }}>
      <style>{RESPONSIVE_CSS}</style>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e4e0', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="header-content" style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 48, width: 48, objectFit: 'contain' }} />}
            <div>
              <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: '0.5px', color: p }}>{settings.title || 'Store'}</div>
              {settings.tagline && <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', letterSpacing: '0.5px' }}>{settings.tagline}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href={`/${ecomName}/orders`} style={{ color: p, fontWeight: 600, fontSize: 13, textDecoration: 'none', border: '1px solid #e5e4e0', padding: '8px 16px', borderRadius: 4 }}>Orders</a>
            <div onClick={() => setShowCheckout(true)} className="btn-cart btn-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, background: p, color: '#fff', padding: '9px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13, letterSpacing: '1px' }}>
              🛒 {cart.reduce((s, i) => s + i.qty, 0)} ITEMS
            </div>
          </div>
        </div>
      </header>
      {settings.bannerUrl && (
        <div className="banner" style={{ background: `url(${settings.bannerUrl}) center/cover no-repeat`, height: 400, borderBottom: '12px solid #fff' }} />
      )}
      <div style={{ textAlign: 'center', padding: '48px 24px 16px' }}>
        <h1 style={{ fontWeight: 800, fontSize: 40, letterSpacing: '-1px', color: p }}>{settings.title}</h1>
        {settings.tagline && <p style={{ color: '#6b7280', fontStyle: 'italic', marginTop: 12, fontSize: 18 }}>{settings.tagline}</p>}
        <div style={{ width: 60, height: 1.5, background: a, margin: '24px auto 0' }} />
      </div>
      <ProductGrid 
        products={products} categories={categories} addToCart={addToCart} removeFromCart={removeFromCart} cart={cart} theme="elegant" 
        primary={p} accent={a} secondary={s}
      />
    </div>
  );
}

/* ─────────── TEMPLATE 4: Efficient List View ─────────── */
function Template4({ settings, products, categories, cart, addToCart, removeFromCart, ecomName, setShowCheckout }) {
  const p = settings.primaryColor || '#f59e0b';
  const a = settings.accentColor || '#fdd835';
  const s = settings.secondaryColor || '#10b981';

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#fff' }}>
      <style>{RESPONSIVE_CSS}</style>
      <header style={{ background: '#fff', borderBottom: `2px solid ${p}`, padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="header-content" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 36, width: 36, objectFit: 'contain' }} />}
            <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>{settings.title}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <a href={`/${ecomName}/orders`} style={{ color: '#64748b', fontWeight: 600, fontSize: 13, textDecoration: 'none', padding: '8px 12px' }}>Orders</a>
             <div onClick={() => setShowCheckout(true)} className="btn-cart btn-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, background: p, color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              🛒 CART ({cart.reduce((s, i) => s + i.qty, 0)})
            </div>
          </div>
        </div>
      </header>
      <div className="store-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 3fr 1.5fr 1.5fr 120px 180px', padding: '16px 24px', borderBottom: `2px solid ${p}15`, background: '#fafafa', color: '#6b7280', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="hide-mobile">
            <div>Image</div>
            <div>Description</div>
            <div>Categories</div>
            <div>Price</div>
            <div>Quantity</div>
            <div>Action</div>
          </div>
          <ProductGrid products={products} categories={categories} addToCart={addToCart} removeFromCart={removeFromCart} cart={cart} theme="list" primary={p} accent={a} secondary={s} />
        </div>
      </div>
    </div>
  );
}

/* ─────────── Shared Product Grid ─────────── */
function ProductGrid({ products, categories, addToCart, removeFromCart, cart, theme, primary, accent, secondary }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState('default');

  const filtered = useMemo(() => {
    let list = products;
    if (cat !== 'All') list = list.filter(p => p.category === cat);
    if (search) list = list.filter(p => (p.name + ' ' + (p.desc || '')).toLowerCase().includes(search.toLowerCase()));
    if (sort === 'low') list = [...list].sort((a, b) => a.rate - b.rate);
    if (sort === 'high') list = [...list].sort((a, b) => b.rate - a.rate);
    return list;
  }, [products, cat, search, sort]);

  const isList = theme === 'list';
  const isDark = theme === 'vibrant';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const bgCard = isDark ? '#1e293b' : '#fff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = primary;

  return (
    <div className="store-container" style={{ maxWidth: 1200, margin: '0 auto', padding: isList ? '0 0 24px' : '24px 16px' }}>
      {/* Filters Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', padding: isList ? '0 24px' : 0 }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search our catalog..."
            style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: 10, border: `1.5px solid ${borderColor}`, background: bgCard, color: textColor, fontSize: 14, outline: 'none' }}
            onFocus={e => e.target.style.borderColor = primary}
            onBlur={e => e.target.style.borderColor = borderColor}
          />
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${borderColor}`, background: bgCard, color: textColor, fontSize: 13, fontWeight: 600 }}>
          <option value="default">Sort: Recommended</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
        </select>
      </div>
      {/* Category Chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', padding: isList ? '0 24px 8px' : '0 0 8px', scrollbarWidth: 'none' }}>
        {['All', ...categories].map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ padding: '8px 18px', borderRadius: 25, border: `1.5px solid ${cat === c ? primary : borderColor}`, background: cat === c ? primary : bgCard, color: cat === c ? '#fff' : mutedColor, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {c}
          </button>
        ))}
      </div>
      {/* Product List/Grid */}
      <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: isList ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: isList ? 1 : 20, background: isList ? borderColor : 'transparent' }}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: mutedColor, background: bgCard }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 600 }}>No products match your search</div>
          </div>
        )}
        {filtered.map(p => {
          const inCart = cart.find(c => c.id === p.id);
          if (isList) {
            return (
              <div key={p.id} className="list-item" style={{ background: '#fff', padding: '16px 24px', display: 'grid', gridTemplateColumns: '100px 3fr 1.5fr 1.5fr 120px 180px', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ width: 60, height: 60, overflow: 'hidden', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                   {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🛍️</div>}
                </div>
                <div>
                   <div style={{ fontWeight: 700, color: primary, fontSize: 16 }}>{p.name}</div>
                   {p.desc && <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{p.desc}</div>}
                </div>
                <div style={{ fontWeight: 800, color: '#334155', fontSize: 13, textTransform: 'uppercase' }}>{p.category}</div>
                <div><span style={{ fontWeight: 900, color: '#0f172a', fontSize: 17 }}>₹{p.rate?.toLocaleString()}</span></div>
                <div>
                   <input type="number" value={inCart?.qty || 1} readOnly style={{ width: 60, padding: '8px', border: '1.5px solid #e2e8f0', textAlign: 'center', borderRadius: 8, fontWeight: 700, fontSize: 14, background: '#fdfdfd' }} />
                </div>
                <div>
                  {inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                       <button onClick={() => removeFromCart(p.id)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>-</button>
                       <span style={{ width: 30, textAlign: 'center', fontWeight: 900, fontSize: 16 }}>{inCart.qty}</span>
                       <button onClick={() => addToCart(p)} style={{ flex: 1, padding: '10px', background: secondary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(p)} className="btn-hover" style={{ width: '100%', padding: '12px', background: secondary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13, boxShadow: `0 4px 12px ${secondary}33` }}>ADD TO CART</button>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div key={p.id} className="product-card" style={{ background: bgCard, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative' }}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 240, objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: 240, background: isDark ? '#334155' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>🛍️</div>
                )}
                {p.category && <div style={{ position: 'absolute', top: 12, right: 12, background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, color: isDark ? '#fff' : '#111827', backdropFilter: 'blur(4px)' }}>{p.category}</div>}
              </div>
              <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: textColor, lineHeight: 1.3 }}>{p.name}</div>
                {p.desc && <div style={{ fontSize: 13, color: mutedColor, lineHeight: 1.4 }}>{p.desc}</div>}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14 }}>
                  <div style={{ fontWeight: 900, fontSize: 19, color: textColor }}>₹{p.rate?.toLocaleString()}</div>
                  {inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => removeFromCart(p.id)} style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${borderColor}`, background: bgCard, color: textColor, cursor: 'pointer', fontWeight: 800 }}>-</button>
                      <span style={{ fontWeight: 800, color: textColor, minWidth: 20, textAlign: 'center' }}>{inCart.qty}</span>
                      <button onClick={() => addToCart(p)} style={{ width: 32, height: 32, borderRadius: '50%', background: primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800 }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(p)} className="btn-hover" style={{ padding: '8px 16px', background: primary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 12 }}>Add to Cart</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckoutModal({ cart, ownerId, ecomName, customerSession, onClose, onSuccess, primary }) {
  const [form, setForm] = useState({ name: customerSession?.name || '', email: customerSession?.email || '', phone: customerSession?.phone || '', address: customerSession?.address || '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(1);
  const [orderDetails, setOrderDetails] = useState(null);
  const total = cart.reduce((s, i) => s + i.rate * i.qty, 0);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/ecom/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerId, ecomName, customer: form, items: cart, total }) });
      const data = await res.json();
      if (data.success) { setOrderDetails(data); setDone(true); const ns = { name: form.name, phone: form.phone, email: form.email, address: form.address }; localStorage.setItem(`session_${ecomName}`, JSON.stringify(ns)); onSuccess?.(ns); }
      else alert(data.error || 'Order failed');
    } catch (err) { alert('Network error'); } finally { setSubmitting(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: done ? 500 : (step === 1 ? 500 : 840), width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', transition: 'all 0.3s ease' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: 56 }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
            <h3 style={{ marginBottom: 12, fontSize: 28, fontWeight: 800 }}>Order Confirmed!</h3>
            <p style={{ color: '#4b5563', marginBottom: 24 }}>Thank you, {form.name}. Your order has been placed.</p>
            <button onClick={onClose} style={{ padding: '12px 28px', background: primary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Continue Shopping</button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Secure Checkout</h3>
              <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 32 }}>
              {step === 1 ? (
                <>
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div><label style={{ fontSize: 13, fontWeight: 600 }}>Full Name *</label><input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #e5e7eb' }} /></div>
                    <div><label style={{ fontSize: 13, fontWeight: 600 }}>Phone *</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #e5e7eb' }} /></div>
                    <div><label style={{ fontSize: 13, fontWeight: 600 }}>Address</label><textarea value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #e5e7eb', height: 80 }} /></div>
                  </div>
                  <button onClick={() => setStep(2)} style={{ width: '100%', padding: '16px', background: primary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, marginTop: 24 }}>Review & Pay</button>
                </>
              ) : (
                <>
                  <div style={{ background: '#f9fafb', padding: 20, borderRadius: 12, marginBottom: 24 }}>
                    <div style={{ fontWeight: 700 }}>{form.name}</div>
                    <div style={{ fontSize: 14, color: '#4b5563' }}>{form.phone}</div>
                    <div style={{ fontSize: 14, color: '#4b5563', marginTop: 8 }}>{form.address}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => setStep(1)} style={{ flex: 1, padding: '16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700 }}>Back</button>
                    <button onClick={submit} disabled={submitting} style={{ flex: 2, padding: '16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>{submitting ? '...' : `Place Order — ₹${total.toLocaleString()}`}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StorePage() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const ecomName = pathParts[0] || '';
  const [cart, setCart] = useState(() => { try { const s = localStorage.getItem(`cart_${ecomName}`); return s ? JSON.parse(s) : []; } catch { return []; } });
  useEffect(() => { localStorage.setItem(`cart_${ecomName}`, JSON.stringify(cart)); }, [cart, ecomName]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerSession, setCustomerSession] = useState(() => { try { const s = localStorage.getItem(`session_${ecomName}`); return s ? JSON.parse(s) : null; } catch { return null; } });
  const cleanSlug = ecomName.toLowerCase().trim();
  const { data, isLoading } = db.useQuery({ userProfiles: { $: { where: { slug: cleanSlug } } }, ecomSettings: { $: { where: { ecomName: cleanSlug } } }, products: {} });

  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>Loading...</div>;
  const profile = data?.userProfiles?.[0];
  const settings = { ...(data?.ecomSettings?.[0] || {}) };
  const ownerId = profile?.userId || settings?.userId;

  if (profile) {
    if (profile.bizName) settings.title = profile.bizName;
    if (profile.tagline) settings.tagline = profile.tagline;
    if (profile.logo) settings.logo = profile.logo;
    if (profile.bannerUrl && !settings.bannerUrl) settings.bannerUrl = profile.bannerUrl;
  }
  const allProducts = (data?.products || []).filter(p => p.userId === ownerId && p.listInEcom);
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

  const addToCart = (p) => setCart(prev => { const ex = prev.find(i => i.id === p.id); if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i); return [...prev, { ...p, qty: 1 }]; });
  const removeFromCart = (pid) => setCart(prev => { const ex = prev.find(i => i.id === pid); if (ex?.qty <= 1) return prev.filter(i => i.id !== pid); return prev.map(i => i.id === pid ? { ...i, qty: i.qty - 1 } : i); });

  if (!ownerId) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#6b7280' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 64, marginBottom: 16 }}>🏪</div><h2>Store not found</h2></div></div>;

  const props = { settings, products: allProducts, categories, cart, addToCart, removeFromCart, ecomName, customerSession, setShowCheckout };
  const templateId = Number(settings?.template) || 1;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const primaryColor = settings.primaryColor || '#6366f1';

  return (
    <>
      {templateId === 2 ? <Template2 {...props} /> : templateId === 3 ? <Template3 {...props} /> : templateId === 4 ? <Template4 {...props} /> : <Template1 {...props} />}
      {cartCount > 0 && (
        <button onClick={() => setShowCheckout(true)} style={{ position: 'fixed', bottom: 24, right: 24, background: primaryColor, color: '#fff', border: 'none', borderRadius: 50, width: 64, height: 64, fontSize: 24, cursor: 'pointer', boxShadow: `0 8px 32px ${primaryColor}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}>
          🛒<span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', borderRadius: '50%', width: 22, height: 22, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{cartCount}</span>
        </button>
      )}
      {showCheckout && <CheckoutModal cart={cart} ownerId={ownerId} ecomName={ecomName} customerSession={customerSession} onClose={() => setShowCheckout(false)} onSuccess={setCustomerSession} primary={primaryColor} />}
    </>
  );
}
