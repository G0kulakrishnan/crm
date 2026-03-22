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
            {customerSession && <a href={`/${ecomName}/orders`} style={{ color: '#4f46e5', fontWeight: 600, fontSize: 13, textDecoration: 'none', background: '#f5f3ff', padding: '8px 14px', borderRadius: 10, transition: 'all 0.2s' }}>📦 Orders</a>}
            <div onClick={() => setShowCheckout(true)} className="btn-cart btn-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#6366f1', color: '#fff', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 12px rgba(99,102,241,0.2)' }}>
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
      <ProductGrid products={products} categories={categories} addToCart={addToCart} removeFromCart={removeFromCart} cart={cart} theme="minimal" />
    </div>
  );
}

/* ─────────── TEMPLATE 2: Bold Vibrant ─────────── */
function Template2({ settings, products, categories, cart, addToCart, removeFromCart, ecomName, customerSession, setShowCheckout }) {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#0f172a' }}>
      <style>{RESPONSIVE_CSS}</style>
      <header style={{ background: 'rgba(99, 102, 241, 0.85)', backdropFilter: 'blur(12px)', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div className="header-content" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#fff' }}>
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" style={{ height: 48, width: 48, objectFit: 'contain', borderRadius: 12, border: '2px solid rgba(255,255,255,0.2)' }} />
            ) : (
              <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #fff, #e2e8f0)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, fontSize: 24, fontWeight: 900 }}>{settings.brandShort || 'T'}</div>
            )}
            <div>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.5px' }}>{settings.title || 'Store'}</div>
              {settings.tagline && <div style={{ fontSize: 12, color: '#e2e8f0', opacity: 0.9, fontWeight: 500 }}>{settings.tagline}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {customerSession && <a href={`/${ecomName}/orders`} style={{ color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none', background: 'rgba(255,255,255,0.1)', padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>📦 My Orders</a>}
            <div onClick={() => setShowCheckout(true)} className="btn-cart btn-hover" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ff9800', color: '#fff', padding: '10px 24px', borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 14, boxShadow: '0 10px 20px -5px rgba(255,152,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
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
      <ProductGrid products={products} categories={categories} addToCart={addToCart} removeFromCart={removeFromCart} cart={cart} theme="vibrant" />
    </div>
  );
}

/* ─────────── TEMPLATE 3: Elegant Premium ─────────── */
function Template3({ settings, products, categories, cart, addToCart, removeFromCart, ecomName, setShowCheckout }) {
  return (
    <div style={{ fontFamily: '"Playfair Display", Georgia, serif', minHeight: '100vh', background: '#fafaf8' }}>
      <style>{RESPONSIVE_CSS}</style>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e4e0', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="header-content" style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 48, width: 48, objectFit: 'contain' }} />}
            <div>
              <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: '0.5px', color: '#1c1917' }}>{settings.title || 'Store'}</div>
              {settings.tagline && <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', letterSpacing: '0.5px' }}>{settings.tagline}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href={`/${ecomName}/orders`} style={{ color: '#1c1917', fontWeight: 600, fontSize: 13, textDecoration: 'none', border: '1px solid #e5e4e0', padding: '8px 16px', borderRadius: 4 }}>Orders</a>
            <div onClick={() => setShowCheckout(true)} className="btn-cart btn-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1c1917', color: '#fff', padding: '9px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13, letterSpacing: '1px' }}>
              🛒 {cart.reduce((s, i) => s + i.qty, 0)} ITEMS
            </div>
          </div>
        </div>
      </header>
      {settings.bannerUrl && (
        <div className="banner" style={{ background: `url(${settings.bannerUrl}) center/cover no-repeat`, height: 400, borderBottom: '12px solid #fff' }} />
      )}
      <div style={{ textAlign: 'center', padding: '48px 24px 16px' }}>
        <h1 style={{ fontWeight: 800, fontSize: 40, letterSpacing: '-1px', color: '#1c1917' }}>{settings.title}</h1>
        {settings.tagline && <p style={{ color: '#6b7280', fontStyle: 'italic', marginTop: 12, fontSize: 18 }}>{settings.tagline}</p>}
        <div style={{ width: 60, height: 1, background: '#1c1917', margin: '24px auto 0' }} />
      </div>
      <ProductGrid products={products} categories={categories} addToCart={addToCart} removeFromCart={removeFromCart} cart={cart} theme="elegant" />
    </div>
  );
}

/* ─────────── TEMPLATE 4: Efficient List View ─────────── */
function Template4({ settings, products, categories, cart, addToCart, removeFromCart, ecomName, setShowCheckout }) {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#fff' }}>
      <style>{RESPONSIVE_CSS}</style>
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="header-content" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 36, width: 36, objectFit: 'contain' }} />}
            <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>{settings.title}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <a href={`/${ecomName}/orders`} style={{ color: '#64748b', fontWeight: 600, fontSize: 13, textDecoration: 'none', padding: '8px 12px' }}>Orders</a>
             <div onClick={() => setShowCheckout(true)} className="btn-cart btn-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ff9800', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              🛒 CART ({cart.reduce((s, i) => s + i.qty, 0)})
            </div>
          </div>
        </div>
      </header>
      <div className="store-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 3fr 1.5fr 1.5fr 120px 180px', padding: '16px 24px', borderBottom: '2px solid #f3f4f6', background: '#fafafa', color: '#6b7280', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="hide-mobile">
            <div>Image</div>
            <div>Description</div>
            <div>Categories</div>
            <div>Price</div>
            <div>Quantity</div>
            <div>Action</div>
          </div>
          <ProductGrid products={products} categories={categories} addToCart={addToCart} removeFromCart={removeFromCart} cart={cart} theme="list" />
        </div>
      </div>
    </div>
  );
}

/* ─────────── Shared Product Grid ─────────── */
function ProductGrid({ products, categories, addToCart, removeFromCart, cart, theme }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState('default');
  const [expandedDesc, setExpandedDesc] = useState({});

  const filtered = useMemo(() => {
    let list = products;
    if (cat !== 'All') list = list.filter(p => p.category === cat);
    if (search) list = list.filter(p => (p.name + ' ' + (p.desc || '') + ' ' + (p.description || '')).toLowerCase().includes(search.toLowerCase()));
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
  const accentColor = theme === 'elegant' ? '#1c1917' : theme === 'vibrant' ? '#6366f1' : theme === 'list' ? '#f59e0b' : '#6366f1';

  return (
    <div className="store-container" style={{ maxWidth: 1200, margin: '0 auto', padding: isList ? '0 0 24px' : '24px 16px' }}>
      {/* Filters Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', padding: isList ? '0 24px' : 0 }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search our catalog..."
            style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: 10, border: `1.5px solid ${borderColor}`, background: bgCard, color: textColor, fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = accentColor}
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
            style={{ padding: '8px 18px', borderRadius: 25, border: `1.5px solid ${cat === c ? accentColor : borderColor}`, background: cat === c ? accentColor : bgCard, color: cat === c ? '#fff' : mutedColor, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
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
            <div style={{ fontSize: 14, marginTop: 4 }}>Try using different keywords or another category.</div>
          </div>
        )}
        {filtered.map(p => {
          const inCart = cart.find(c => c.id === p.id);
          if (isList) {
            return (
              <div key={p.id} className="list-item" style={{ background: '#fff', padding: '16px 24px', display: 'grid', gridTemplateColumns: '100px 3fr 1.5fr 1.5fr 120px 180px', alignItems: 'center', borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' }}>
                <div style={{ width: 60, height: 60, overflow: 'hidden', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ height: '100%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🛍️</div>
                  )}
                </div>
                <div>
                   <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 16 }}>{p.name}</div>
                   {p.desc && <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{p.desc}</div>}
                </div>
                <div style={{ fontWeight: 800, color: '#334155', fontSize: 13, textTransform: 'uppercase' }}>{p.category}</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 900, color: '#0f172a', fontSize: 17 }}>₹{p.rate?.toLocaleString()}</span>
                  {p.originalRate && <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>₹{p.originalRate?.toLocaleString()}</span>}
                </div>
                <div>
                   <input 
                     type="number" min="1" 
                     value={inCart?.qty || 1} 
                     readOnly
                     style={{ width: 60, padding: '8px', border: '1.5px solid #e2e8f0', textAlign: 'center', borderRadius: 8, fontWeight: 700, fontSize: 14, background: '#fdfdfd' }} 
                   />
                </div>
                <div>
                  {inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                       <button onClick={() => removeFromCart(p.id)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>-</button>
                       <span style={{ width: 30, textAlign: 'center', fontWeight: 900, fontSize: 16 }}>{inCart.qty}</span>
                       <button onClick={() => addToCart(p)} style={{ flex: 1, padding: '10px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(p)} className="btn-hover"
                      style={{ width: '100%', padding: '12px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 12px rgba(255,152,0,0.2)' }}>
                      ADD TO CART
                    </button>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div key={p.id} className="product-card" style={{ background: bgCard, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative' }}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 240, objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                ) : (
                  <div style={{ height: 240, background: isDark ? '#334155' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>🛍️</div>
                )}
                {p.category && <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, color: '#111827', backdropFilter: 'blur(4px)' }}>{p.category}</div>}
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
                      <button onClick={() => addToCart(p)} style={{ width: 32, height: 32, borderRadius: '50%', background: accentColor, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800 }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(p)} className="btn-hover"
                      style={{ padding: '8px 16px', background: accentColor, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 12 }}>
                      Add to Cart
                    </button>
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

function CheckoutModal({ cart, ownerId, ecomName, customerSession, onClose, onSuccess }) {
  const [form, setForm] = useState({ 
    name: customerSession?.name || '', 
    email: customerSession?.email || '', 
    phone: customerSession?.phone || '', 
    address: customerSession?.address || '', 
    notes: '' 
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(1);
  const [orderDetails, setOrderDetails] = useState(null);
  const total = cart.reduce((s, i) => s + i.rate * i.qty, 0);

  const handleNext = () => {
    if (!form.name.trim() || !form.phone.trim()) { alert('Name and phone number are required'); return; }
    if (form.phone.replace(/\D/g, '').length < 8) { alert('Please enter a valid phone number'); return; }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) { alert('Please enter a valid email address'); return; }
    setStep(2);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/ecom/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, ecomName, customer: form, items: cart, total }),
      });
      const data = await res.json();
      if (data.success) { 
        setOrderDetails(data);
        setDone(true);
        const newSession = { name: form.name, phone: form.phone, email: form.email, address: form.address };
        localStorage.setItem(`session_${ecomName}`, JSON.stringify(newSession));
        onSuccess?.(newSession); 
      }
      else alert(data.error || 'Order failed');
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: done ? 500 : (step === 1 ? 500 : 840), width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', transition: 'all 0.3s ease' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: 56 }}>
            <div style={{ fontSize: 72, marginBottom: 20, animation: 'bounce 1s ease' }}>🎉</div>
            <h3 style={{ marginBottom: 12, fontSize: 28, fontWeight: 800, color: '#111827' }}>Order Confirmed!</h3>
            <p style={{ color: '#4b5563', marginBottom: 8, fontSize: 16 }}>Thank you, {form.name}. Your order has been placed successfully.</p>
            {orderDetails?.orderId && (
              <div style={{ background: '#f3f4f6', padding: '12px 24px', borderRadius: 8, display: 'inline-block', marginBottom: 24, fontSize: 14, fontWeight: 700, color: '#374151', letterSpacing: '0.5px' }}>
                Order ID: {orderDetails.orderId.slice(0, 8).toUpperCase()}
              </div>
            )}
            <div>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 32 }}>We've sent a confirmation email to {form.email || 'your phone address'}.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <a href={`/${ecomName}/orders`} style={{ padding: '12px 24px', background: '#f3f4f6', color: '#374151', textDecoration: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15 }}>Track Order</a>
                <button onClick={onClose} style={{ padding: '12px 28px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 15, boxShadow: '0 4px 14px 0 rgba(99,102,241,0.39)' }}>Continue Shopping</button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Secure Checkout</h3>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, fontWeight: 500 }}>Step {step} of 2: {step === 1 ? 'Contact Details' : 'Review & Pay'}</div>
              </div>
              <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', color: '#4b5563', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {/* Left Column - Dynamic Step Content */}
              <div style={{ flex: '1 1 400px', padding: 32 }}>
                {step === 1 ? (
                  <>
                    <h4 style={{ marginBottom: 20, color: '#374151', fontSize: 16, fontWeight: 700 }}>Contact & Delivery</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#4b5563' }}>Full Name *</label>
                        <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="John Doe" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15, boxSizing: 'border-box', transition: 'border 0.2s', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                      </div>
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#4b5563' }}>Phone Number *</label>
                        <input type="tel" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="9876543210" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                      </div>
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#4b5563' }}>Email Address</label>
                        <input type="email" name="email" autoComplete="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="john@example.com" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15, boxSizing: 'border-box', outline: 'none', background: '#fff' }} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#4b5563' }}>Delivery Address</label>
                        <textarea value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} placeholder="Complete address with pincode..." style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15, boxSizing: 'border-box', height: 80, resize: 'none', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#4b5563' }}>Order Notes (Optional)</label>
                        <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Any special instructions..." style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15, boxSizing: 'border-box', height: 60, resize: 'none', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                      </div>
                    </div>
                    <button onClick={handleNext} style={{ width: '100%', padding: '16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 16, marginTop: 28, boxShadow: '0 4px 14px 0 rgba(99,102,241,0.39)', transition: 'transform 0.1s' }} onMouseDown={e => e.target.style.transform = 'scale(0.98)'} onMouseUp={e => e.target.style.transform = 'scale(1)'}>
                      Continue to Review
                    </button>
                  </>
                ) : (
                  <>
                    <h4 style={{ marginBottom: 20, color: '#374151', fontSize: 16, fontWeight: 700 }}>Review Details</h4>
                    <div style={{ background: '#f9fafb', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 24 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Name</div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{form.name}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Phone</div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{form.phone}</div>
                        </div>
                        {form.email && (
                          <div style={{ gridColumn: '1/-1' }}>
                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Email</div>
                            <div style={{ fontSize: 15, fontWeight: 500, color: '#374151' }}>{form.email}</div>
                          </div>
                        )}
                        {form.address && (
                          <div style={{ gridColumn: '1/-1' }}>
                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Address</div>
                            <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.5 }}>{form.address}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => setStep(1)} style={{ flex: 1, padding: '16px', background: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>Back</button>
                      <button onClick={submit} disabled={submitting} style={{ flex: 2, padding: '16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 16, boxShadow: '0 4px 14px 0 rgba(16,185,129,0.39)', transition: 'all 0.2s', opacity: submitting ? 0.7 : 1 }}>
                        {submitting ? 'Processing...' : `Place Order — ₹${total.toLocaleString()}`}
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      🔒 Secure Checkout. Payments are handled via invoice directly.
                    </div>
                  </>
                )}
              </div>

              {/* Right Column - Summary (Only visible in step 2 or on large screens) */}
              {(step === 2 || window.innerWidth > 768) && (
                <div style={{ flex: '1 1 300px', background: '#f8fafc', padding: 32, borderLeft: '1px solid #e2e8f0' }}>
                  <h4 style={{ marginBottom: 20, color: '#334155', fontSize: 16, fontWeight: 700 }}>Order Summary</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24, maxHeight: 300, overflowY: 'auto', paddingRight: 8 }}>
                    {cart.map(i => (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {i.imageUrl ? <img src={i.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'}/> : <span style={{ fontSize: 20 }}>🛍️</span>}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.name}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Qty: {i.qty} × ₹{i.rate.toLocaleString()}</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>₹{(i.rate * i.qty).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', marginBottom: 10 }}>
                      <span>Subtotal</span><span style={{ fontWeight: 600 }}>₹{total.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', marginBottom: 20 }}>
                      <span>Shipping</span><span style={{ fontWeight: 600 }}>Calculated later</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900, color: '#0f172a' }}>
                      <span>Total</span><span>₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── Main Store Page ─────────── */
export default function StorePage() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const ecomName = pathParts[0] || '';

  // Cart persistence
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(`cart_${ecomName}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(`cart_${ecomName}`, JSON.stringify(cart));
  }, [cart, ecomName]);

  const [showCheckout, setShowCheckout] = useState(false);

  // Customer session
  const [customerSession, setCustomerSession] = useState(() => {
    try {
      const s = localStorage.getItem(`session_${ecomName}`);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  
  const cleanSlug = ecomName.toLowerCase().trim();

  const { data, isLoading } = db.useQuery({
    userProfiles: { $: { where: { slug: cleanSlug } } },
    ecomSettings: { $: { where: { ecomName: cleanSlug } } },
    products: {},
  });

  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>Loading...</div>;

  const profile = data?.userProfiles?.[0];
  const settings = data?.ecomSettings?.[0] || {};

  const ownerId = profile?.userId || settings?.userId;
  
  // Global Branding Sync: Priority to Profile
  if (profile) {
    if (profile.bizName) settings.title = profile.bizName;
    if (profile.tagline) settings.tagline = profile.tagline;
    if (profile.logo) settings.logo = profile.logo;
  }

  const allProducts = (data?.products || []).filter(p => p.userId === ownerId && p.listInEcom);
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

  const addToCart = (p) => setCart(prev => {
    const existing = prev.find(i => i.id === p.id);
    if (existing) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
    return [...prev, { ...p, qty: 1 }];
  });

  const removeFromCart = (pid) => setCart(prev => {
    const existing = prev.find(i => i.id === pid);
    if (existing?.qty <= 1) return prev.filter(i => i.id !== pid);
    return prev.map(i => i.id === pid ? { ...i, qty: i.qty - 1 } : i);
  });

  if (!ownerId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#6b7280' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 64, marginBottom: 16 }}>🏪</div><h2>Store not found</h2><p>The store "{ecomName}" does not exist.</p></div>
    </div>
  );

  const props = { settings, products: allProducts, categories, cart, addToCart, removeFromCart, ecomName, customerSession, setShowCheckout };
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <>
      {settings.template === 2 ? <Template2 {...props} /> : settings.template === 3 ? <Template3 {...props} /> : settings.template === 4 ? <Template4 {...props} /> : <Template1 {...props} />}

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <button onClick={() => setShowCheckout(true)}
          style={{ position: 'fixed', bottom: 24, right: 24, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 50, width: 64, height: 64, fontSize: 24, cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}>
          🛒
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', borderRadius: '50%', width: 22, height: 22, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{cartCount}</span>
        </button>
      )}

      {showCheckout && (
        <CheckoutModal
          cart={cart}
          ownerId={ownerId}
          ecomName={ecomName}
          customerSession={customerSession}
          onClose={() => setShowCheckout(false)}
          onSuccess={(sessionData) => {
            setCart([]);
            setCustomerSession(sessionData);
          }}
        />
      )}
    </>
  );
}
