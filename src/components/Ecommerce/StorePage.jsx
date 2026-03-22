import React, { useState, useEffect, useMemo } from 'react';
import { init } from '@instantdb/react';

const APP_ID = import.meta.env.VITE_INSTANT_APP_ID;
const db = init({ appId: APP_ID });

/* ─────────── TEMPLATE 1: Clean Minimal ─────────── */
function Template1({ settings, products, categories, cart, addToCart, removeFromCart }) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#6366f1', color: '#fff', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            🛒 {cart.reduce((s, i) => s + i.qty, 0)} items
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
function Template2({ settings, products, categories, cart, addToCart, removeFromCart }) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f59e0b', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
            🛒 {cart.reduce((s, i) => s + i.qty, 0)} items
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
function Template3({ settings, products, categories, cart, addToCart, removeFromCart }) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1c1917', color: '#fff', padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13, letterSpacing: '0.5px' }}>
            🛒 {cart.reduce((s, i) => s + i.qty, 0)} items
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

/* ─────────── Checkout Modal ─────────── */
function CheckoutModal({ cart, ownerId, ecomName, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const total = cart.reduce((s, i) => s + i.rate * i.qty, 0);

  const submit = async () => {
    if (!form.name || !form.phone) { alert('Name and phone are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/ecom/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, ecomName, customer: form, items: cart, total }),
      });
      const data = await res.json();
      if (data.success) { setDone(true); onSuccess?.(); }
      else alert(data.error || 'Order failed');
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h3 style={{ marginBottom: 8 }}>Order Placed!</h3>
            <p style={{ color: '#6b7280', marginBottom: 20 }}>We'll contact you shortly to confirm your order.</p>
            <button onClick={onClose} style={{ padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Continue Shopping</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Checkout</h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <div style={{ background: '#f9fafb', padding: 14, borderRadius: 8, marginBottom: 20 }}>
              {cart.map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{i.name} × {i.qty}</span>
                  <strong>₹{(i.rate * i.qty).toLocaleString()}</strong>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>Total</span><span>₹{total.toLocaleString()}</span>
              </div>
            </div>
            {['name', 'email', 'phone', 'address', 'notes'].map(field => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'capitalize', color: '#374151' }}>{field === 'name' ? 'Full Name *' : field === 'phone' ? 'Phone *' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                {field === 'address' || field === 'notes' ? (
                  <textarea value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, resize: 'none', height: 72, boxSizing: 'border-box' }} />
                ) : (
                  <input type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
            <button onClick={submit} disabled={submitting} style={{ width: '100%', padding: '13px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 15, marginTop: 4 }}>
              {submitting ? 'Placing Order...' : `Place Order — ₹${total.toLocaleString()}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────── Main Store Page ─────────── */
export default function StorePage() {
  const ecomName = window.location.pathname.split('/')[1];
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);

  const { data } = db.useQuery({
    ecomSettings: { $: { where: { ecomName } } },
    products: {},
    userProfiles: {},
  });

  const settings = data?.ecomSettings?.[0] || {};
  const ownerId = settings?.userId;
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

  if (!settings.ecomName) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#6b7280' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 64, marginBottom: 16 }}>🏪</div><h2>Store not found</h2><p>The store "{ecomName}" does not exist.</p></div>
    </div>
  );

  const props = { settings, products: allProducts, categories, cart, addToCart, removeFromCart };
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
          onClose={() => setShowCheckout(false)}
          onSuccess={() => setCart([])}
        />
      )}
    </>
  );
}
