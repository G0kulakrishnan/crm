import React, { useState } from 'react';
import { init } from '@instantdb/react';

const APP_ID = import.meta.env.VITE_INSTANT_APP_ID;
const db = init({ appId: APP_ID });

const STATUS_MAP = {
  Pending: { icon: '📦', color: '#f59e0b', step: 1 },
  Confirmed: { icon: '✅', color: '#3b82f6', step: 2 },
  Processing: { icon: '⚙️', color: '#8b5cf6', step: 3 },
  Shipped: { icon: '🚚', color: '#10b981', step: 4 },
  Delivered: { icon: '🎉', color: '#16a34a', step: 5 },
  Cancelled: { icon: '❌', color: '#ef4444', step: 0 },
};

export default function TrackingPage({ ecomSettings }) {
  const ecomName = window.location.pathname.split('/')[1];
  
  const [customerSession] = useState(() => {
    try {
      const s = localStorage.getItem(`session_${ecomName}`);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const [phone, setPhone] = useState(customerSession?.phone || '');
  const [searched, setSearched] = useState(!!customerSession?.phone);

  const { data, isLoading } = db.useQuery({
    orders: { $: { where: { ecomName } } },
    ecomSettings: { $: { where: { ecomName } } }
  });

  const settings = data?.ecomSettings?.[0] || ecomSettings || {};
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (phone.trim().length >= 8) setSearched(true);
  };

  if (!settings.ecomName) {
    if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
    return <div style={{ padding: 40, textAlign: 'center' }}>Store not found.</div>;
  }

  const myOrders = searched ? (data?.orders || []).filter(o => o.customerPhone && o.customerPhone.includes(phone)).sort((a,b) => b.createdAt - a.createdAt) : [];

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 36, objectFit: 'contain' }} />}
        <div style={{ fontWeight: 800, fontSize: 18 }}>{settings.title || 'Store'}</div>
      </div>

      <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>Track Your Orders</h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Enter the phone number you used during checkout</p>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
            <input 
              type="tel" 
              placeholder="e.g. 9876543210" 
              value={phone} 
              onChange={e => { setPhone(e.target.value); setSearched(false); }}
              style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 16 }}
              required 
            />
            <button type="submit" style={{ padding: '0 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Track
            </button>
          </form>

          {searched && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {myOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#6b7280', background: '#f9fafb', borderRadius: 8 }}>
                  No orders found for this phone number.
                </div>
              ) : (
                myOrders.map(order => {
                  const s = STATUS_MAP[order.status] || STATUS_MAP.Pending;
                  const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
                  return (
                    <div key={order.id} style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ background: '#f9fafb', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Order ID: {order.id.slice(0,8).toUpperCase()}</div>
                          <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
                        </div>
                        <div style={{ background: s.color + '15', color: s.color, padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{s.icon}</span> {order.status}
                        </div>
                      </div>
                      <div style={{ padding: 16 }}>
                        {items.map((it, j) => (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: Number(j) === items.length - 1 ? 0 : 8 }}>
                            <span>{it.name} <span style={{ color: '#6b7280', fontSize: 12 }}>× {it.qty}</span></span>
                            <span style={{ fontWeight: 600 }}>₹{(it.rate * it.qty).toLocaleString()}</span>
                          </div>
                        ))}
                        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, color: '#6366f1' }}>
                          <span>Total</span>
                          <span>₹{(order.total || 0).toLocaleString()}</span>
                        </div>

                        {order.notes && (
                           <div style={{ marginTop: 16, padding: '12px 16px', background: '#fdf2f8', borderRadius: 12, border: '1px solid #fce7f3', fontSize: 13, color: '#9d174d' }}>
                              <div style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', marginBottom: 4, opacity: 0.8 }}>Message from Store</div>
                              {order.notes}
                           </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
