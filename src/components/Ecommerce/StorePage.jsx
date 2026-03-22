import React, { useState, useEffect, useMemo } from 'react';
import { init } from '@instantdb/react';

const APP_ID = import.meta.env.VITE_INSTANT_APP_ID;
const db = init({ appId: APP_ID });

/* ─────────── TEMPLATE 1: Clean Minimal ─────────── */
function Template1({ settings, products, categories, cart, addToCart, removeFromCart, ecomName, customerSession, setShowCheckout }) {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 40, objectFit: 'contain' }} />}
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{settings.title || 'Store'}</div>
              {settings.tagline && <div style={{ fontSize: 11, color: '#6b7280' }}>{settings.tagline}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {customerSession && <a href={`/${ecomName}/orders`} style={{ color: '#4f46e5', fontWeight: 600, fontSize: 13, textDecoration: 'none', background: '#e0e7ff', padding: '8px 14px', borderRadius: 8 }}>📦 My Orders</a>}
            <div onClick={() => setShowCheckout(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#6366f1', color: '#fff', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              🛒 {cart.reduce((s, i) => s + i.qty, 0)} items
            </div>
          </div>
        </div>
      </header>
      {/* Banner */}
      {settings.bannerUrl && (
        <div style={{ background: `url(${settings.bannerUrl}) center/cover no-repeat`, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            <h1 style={{ fontSize: 36, fontWeight: 800 }}>{settings.title}</h1>
            {settings.tagline && <p style={{ fontSize: 18 }}>{settings.tagline}</p>}
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
      <header style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
            {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 44, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />}
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{settings.title || 'Store'}</div>
              {settings.tagline && <div style={{ fontSize: 11, color: '#e0e7ff' }}>{settings.tagline}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {customerSession && <a href={`/${ecomName}/orders`} style={{ color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none', background: 'rgba(255,255,255,0.2)', padding: '8px 14px', borderRadius: 8 }}>📦 My Orders</a>}
            <div onClick={() => setShowCheckout(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f59e0b', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              🛒 {cart.reduce((s, i) => s + i.qty, 0)} items
            </div>
          </div>
        </div>
      </header>
      {settings.bannerUrl && (
        <div style={{ background: `url(${settings.bannerUrl}) center/cover no-repeat`, height: 320, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)' }} />
          <div style={{ textAlign: 'center', color: '#fff', position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-1px' }}>{settings.title}</h1>
            {settings.tagline && <p style={{ fontSize: 18, color: '#cbd5e1' }}>{settings.tagline}</p>}
          </div>
        </div>
      )}
      <ProductGrid products={products} categories={categories} addToCart={addToCart} removeFromCart={removeFromCart} cart={cart} theme="vibrant" />
    </div>
  );
}

/* ─────────── TEMPLATE 3: Elegant Premium ─────────── */
function Template3({ settings, products, categories, cart, addToCart, removeFromCart, ecomName }) {
  return (
    <div style={{ fontFamily: 'Georgia, serif', minHeight: '100vh', background: '#fafaf8' }}>
      <header style={{ background: '#fff', borderBottom: '2px solid #e5e4e0', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 44, objectFit: 'contain' }} />}
            <div>
              <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '0.5px' }}>{settings.title || 'Store'}</div>
              {settings.tagline && <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', letterSpacing: '0.5px' }}>{settings.tagline}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href={`/${ecomName}/orders`} style={{ color: '#1c1917', fontWeight: 600, fontSize: 13, textDecoration: 'none', border: '1px solid #e5e4e0', padding: '8px 14px', borderRadius: 4 }}>My Orders</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1c1917', color: '#fff', padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13, letterSpacing: '0.5px' }}>
              🛒 {cart.reduce((s, i) => s + i.qty, 0)} items
            </div>
          </div>
        </div>
      </header>
      {settings.bannerUrl && (
        <div style={{ background: `url(${settings.bannerUrl}) center/cover no-repeat`, height: 400 }} />
      )}
      <div style={{ textAlign: 'center', padding: '32px 24px 8px' }}>
        <h1 style={{ fontWeight: 700, fontSize: 34, letterSpacing: '-0.5px', color: '#1c1917' }}>{settings.title}</h1>
        {settings.tagline && <p style={{ color: '#6b7280', fontStyle: 'italic', marginTop: 8 }}>{settings.tagline}</p>}
        <div style={{ width: 48, height: 2, background: '#1c1917', margin: '16px auto 0' }} />
      </div>
      <ProductGrid products={products} categories={categories} addToCart={addToCart} removeFromCart={removeFromCart} cart={cart} theme="elegant" />
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
    if (search) list = list.filter(p => (p.name + ' ' + p.desc + ' ' + p.description).toLowerCase().includes(search.toLowerCase()));
    if (sort === 'low') list = [...list].sort((a, b) => a.rate - b.rate);
    if (sort === 'high') list = [...list].sort((a, b) => b.rate - a.rate);
    return list;
  }, [products, cat, search, sort]);

  const isDark = theme === 'vibrant';
  const textColor = isDark ? '#e2e8f0' : '#1f2937';
  const mutedColor = isDark ? '#94a3b8' : '#6b7280';
  const bgCard = isDark ? '#1e293b' : '#fff';
  const borderColor = isDark ? '#334155' : '#e5e7eb';
  const accentColor = theme === 'elegant' ? '#1c1917' : theme === 'vibrant' ? '#6366f1' : '#6366f1';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Filters Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search products..."
          style={{ flex: 1, minWidth: 180, padding: '10px 14px', borderRadius: 8, border: `1px solid ${borderColor}`, background: bgCard, color: textColor, fontSize: 14 }}
        />
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${borderColor}`, background: bgCard, color: textColor, fontSize: 13 }}>
          <option value="default">Sort: Default</option>
          <option value="low">Price: Low → High</option>
          <option value="high">Price: High → Low</option>
        </select>
      </div>
      {/* Category Chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {['All', ...categories].map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${cat === c ? accentColor : borderColor}`, background: cat === c ? accentColor : bgCard, color: cat === c ? '#fff' : mutedColor, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {c}
          </button>
        ))}
      </div>
      {/* Product Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: mutedColor }}>No products found</div>
        )}
        {filtered.map(p => {
          const inCart = cart.find(c => c.id === p.id);
          return (
            <div key={p.id} style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 200, objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
              ) : (
                <div style={{ height: 200, background: isDark ? '#334155' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🛍️</div>
              )}
              <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {p.category && <span style={{ fontSize: 10, color: accentColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{p.category}</span>}
                <div style={{ fontWeight: 700, fontSize: 15, color: textColor }}>{p.name}</div>
                {p.desc && <div style={{ fontSize: 12, color: mutedColor, lineHeight: 1.4 }}>{p.desc}</div>}
                {p.description && (
                  <div style={{ marginTop: 4 }}>
                    <button 
                      onClick={() => setExpandedDesc(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                      style={{ background: 'none', border: 'none', padding: 0, color: accentColor, fontSize: 11, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>
                      {expandedDesc[p.id] ? 'Hide details' : 'View details'}
                    </button>
                    {expandedDesc[p.id] && (
                      <div style={{ marginTop: 8, fontSize: 12, color: textColor, lineHeight: 1.5, background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', padding: 10, borderRadius: 6 }}>
                        {p.description}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${borderColor}` }}>
                  <div style={{ fontWeight: 800, fontSize: 17, color: accentColor }}>₹{p.rate?.toLocaleString()}</div>
                  {inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => removeFromCart(p.id)} style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${borderColor}`, background: bgCard, color: textColor, cursor: 'pointer', fontWeight: 700 }}>-</button>
                      <span style={{ fontWeight: 700, color: textColor }}>{inCart.qty}</span>
                      <button onClick={() => addToCart(p)} style={{ width: 28, height: 28, borderRadius: '50%', background: accentColor, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(p)}
                      style={{ padding: '7px 14px', background: accentColor, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
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
      {settings.template === 2 ? <Template2 {...props} /> : settings.template === 3 ? <Template3 {...props} /> : <Template1 {...props} />}

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
