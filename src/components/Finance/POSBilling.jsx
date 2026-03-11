import React, { useState, useMemo, useEffect, useRef } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmt, fmtD } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export default function POSBilling({ user, perms, ownerId, settings }) {
  const toast = useToast();
  
  // 1. Data Query
  const { data } = db.useQuery({
    products: { $: { where: { userId: ownerId } } },
    customers: { $: { where: { userId: ownerId } } },
    invoices: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } },
    leads: { $: { where: { userId: ownerId } } },
  });
  const profile = data?.userProfiles?.[0] || {};
  const wonStage = profile.wonStage || 'Won';

  // 2. State
  const [cart, setCart] = useState([]);
  const [selectedCat, setSelectedCat] = useState('All');
  const [search, setSearch] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [selectedCust, setSelectedCust] = useState(null);
  const [showCustList, setShowCustList] = useState(false);
  const [printing, setPrinting] = useState(null);
  const [payMode, setPayMode] = useState('Cash');
  const [custModal, setCustModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ name: '', email: '', phone: '', address: '', state: '', country: 'India', pincode: '', gstin: '', custom: {} });

  // 3. Derived Data
  const products = data?.products || [];
  const customers = data?.customers || [];
  const customFields = profile.customFields || [];

  // 4. Memos
  const categories = useMemo(() => {
    const cats = profile.productCats || ['Electronics', 'Home Appliances', 'Services', 'Furniture', 'General'];
    return ['All', ...cats];
  }, [profile.productCats]);

  const filteredInvoices = useMemo(() => {
    return data?.invoices || [];
  }, [data?.invoices]);

  const filteredProducts = useMemo(() => {
    let f = products;
    if (selectedCat !== 'All') f = f.filter(p => (p.category || 'General') === selectedCat);
    if (search) {
      const s = search.toLowerCase();
      f = f.filter(p => p.name.toLowerCase().includes(s) || p.code?.toLowerCase().includes(s));
    }
    return f;
  }, [products, search, selectedCat]);

  const filteredCustomers = useMemo(() => {
    if (!custSearch) return customers.slice(0, 5);
    const s = custSearch.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(s) || c.phone?.includes(s)).slice(0, 10);
  }, [customers, custSearch]);

  const totals = useMemo(() => {
    const sub = cart.reduce((s, it) => s + (it.qty * it.rate), 0);
    const tax = cart.reduce((s, it) => s + (it.qty * it.rate * (it.tax || 0) / 100), 0);
    return { sub, tax, total: Math.round(sub + tax) };
  }, [cart]);

  // 5. Handlers
  const ncf = (k) => (e) => setNewCustForm(p => ({ ...p, [k]: e.target.value }));
  const nccf = (k) => (e) => setNewCustForm(p => ({ ...p, custom: { ...(p.custom || {}), [k]: e.target.value } }));

  const createCustomer = async () => {
    if (!newCustForm.name.trim()) return toast('Name required', 'error');
    if (!newCustForm.email.trim()) return toast('Email is mandatory for clients', 'error');
    const newId = id();
    const custPayload = { ...newCustForm, name: newCustForm.name.trim(), userId: ownerId, actorId: user.id, createdAt: Date.now() };
    await db.transact(db.tx.customers[newId].update(custPayload));
    setSelectedCust({ id: newId, ...custPayload });
    setCustModal(false);
    setNewCustForm({ name: '', email: '', phone: '', address: '', state: '', country: 'India', pincode: '', gstin: '', custom: {} });
    toast('Customer created!', 'success');
  };

  const addToCart = (p) => {
    const existing = cart.find(item => item.id === p.id);
    if (existing) {
      setCart(cart.map(item => item.id === p.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...p, qty: 1 }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return toast('Cart is empty', 'error');
    const invNo = `POS-${Date.now().toString().slice(-6)}`;
    const payload = {
      no: invNo,
      client: selectedCust ? selectedCust.name : 'Walk-in Customer',
      customerId: selectedCust ? selectedCust.id : null,
      date: new Date().toISOString().split('T')[0],
      items: cart.map(it => ({ name: it.name, qty: it.qty, rate: it.rate, taxRate: it.tax || 0 })),
      total: totals.total,
      status: 'Paid',
      payMode,
      userId: ownerId,
      actorId: user.id,
      createdAt: Date.now(),
      type: 'POS',
      taxAmt: totals.tax
    };
    
    const txs = [db.tx.invoices[id()].update(payload)];

    // Lead matching and conversion
    if (selectedCust) {
       const lMatch = (data?.leads || []).find(l => (l.name || '').trim().toLowerCase() === (selectedCust.name || '').trim().toLowerCase() && l.stage !== wonStage);
       if (lMatch) {
          txs.push(db.tx.leads[lMatch.id].update({ 
             stage: wonStage,
             email: lMatch.email || selectedCust.email || '',
             phone: lMatch.phone || selectedCust.phone || ''
          }));
          txs.push(db.tx.activityLogs[id()].update({
             entityId: lMatch.id, entityType: 'lead', text: `Lead converted to Customer. Stage changed to ${wonStage} (via POS Checkout).`,
             userId: ownerId, actorId: user.id, userName: user.email, createdAt: Date.now()
          }));
       }
    }

    try {
      await db.transact(txs);
      setPrinting({ ...payload, profile });
      setCart([]);
      setSelectedCust(null);
      setCustSearch('');
      toast('Bill Generated!', 'success');
    } catch {
      toast('Checkout failed', 'error');
    }
  };


  if (printing) {
    return (
      <div className="pos-receipt-wrap">
        <div className="pos-receipt">
          <div style={{ textAlign: 'center', marginBottom: 15 }}>
            {printing.profile.logo && <img src={printing.profile.logo} style={{ height: 40, marginBottom: 5 }} alt="Logo" />}
            <div style={{ fontWeight: 800, fontSize: 16 }}>{printing.profile.bizName}</div>
            <div style={{ fontSize: 10 }}>{printing.profile.address}</div>
            <div style={{ fontSize: 10 }}>{printing.profile.phone}</div>
            {printing.profile.gstin && <div style={{ fontSize: 10 }}>GST: {printing.profile.gstin}</div>}
          </div>
          
          <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '5px 0', marginBottom: 10, fontSize: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bill: {printing.no}</span><span>{printing.date}</span></div>
            <div>Cust: {printing.client}</div>
            <div>Mode: {printing.payMode}</div>
          </div>

          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginBottom: 10 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <th style={{ textAlign: 'left' }}>Item</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {printing.items.map((it, i) => (
                <tr key={i}>
                  <td style={{ padding: '4px 0' }}>{it.name}</td>
                  <td style={{ textAlign: 'center' }}>{it.qty}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(it.qty * it.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: '1px solid #000', paddingTop: 5, fontSize: 12, fontWeight: 800 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>TOTAL</span>
              <span>{fmt(printing.total)}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10 }}>
            <div>Thank you! Visit Again.</div>
            {settings?.showBranding !== false && (
              <div style={{ marginTop: 5, fontSize: 8 }}>Powered by TechCRM</div>
            )}
          </div>
        </div>
        <div className="no-print" style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => window.print()}>Print Receipt</button>
          <button className="btn btn-secondary" onClick={() => setPrinting(null)}>New Bill</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-container">
      {/* Left: Product Selection */}
      <div className="pos-main">
        <div className="pos-top-actions">
          <div className="pos-search-bar" style={{ flex: 1 }}>
            <input 
              className="si" 
              placeholder="Search products..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 15px', borderRadius: '10px' }}
            />
          </div>
          <div className="pos-cats">
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`pos-cat-btn ${selectedCat === cat ? 'active' : ''}`}
                onClick={() => setSelectedCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        <div className="pos-grid">
          {filteredProducts.map(p => (
            <div key={p.id} className="pos-card" onClick={() => addToCart(p)}>
              <div className="pos-card-info">
                <div className="pos-card-name">{p.name}</div>
                <div className="pos-card-cat">{p.category || 'General'}</div>
                <div className="pos-card-price">{fmt(p.rate)}</div>
              </div>
            </div>
          ))}
          {products.length === 0 && <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No products found.</div>}
        </div>
      </div>

      {/* Right: Cart & Billing */}
      <div className="pos-side">
        <div className="pos-bill-box">
          <div className="pos-bill-head">
            <h3>Checkout</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setCart([])}>Clear</button>
          </div>

          <div className="pos-cust-sec">
             <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Link Customer</label>
             <div style={{ position: 'relative' }}>
                {selectedCust ? (
                  <div className="pos-selected-cust">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedCust.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{selectedCust.phone || 'No phone'}</div>
                    </div>
                    <button className="btn-icon" onClick={() => setSelectedCust(null)}>✕</button>
                  </div>
                ) : (
                   <div className="pos-cust-search">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input 
                        value={custSearch} 
                        onChange={e => { setCustSearch(e.target.value); setShowCustList(true); }} 
                        onFocus={() => setShowCustList(true)}
                        placeholder="Search name or phone..." 
                        style={{ flex: 1 }}
                      />
                      <button className="btn btn-secondary" style={{ padding: '0 10px', borderRadius: 8 }} onClick={() => setCustModal(true)} title="Add New Customer">+</button>
                    </div>
                    {showCustList && custSearch && (
                      <div className="pos-cust-dropdown">
                        {filteredCustomers.map(c => (
                          <div key={c.id} className="pos-cust-opt" onClick={() => { setSelectedCust(c); setShowCustList(false); }}>
                            <div style={{ fontWeight: 600 }}>{c.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{c.phone}</div>
                          </div>
                        ))}
                        {filteredCustomers.length === 0 && <div style={{ padding: 10, fontSize: 11, color: 'var(--muted)' }}>No customer found</div>}
                      </div>
                    )}
                  </div>
                )}
             </div>
          </div>

          <div className="pos-cart-list">
            {cart.map(it => (
              <div key={it.id} className="pos-cart-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{it.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{fmt(it.rate)}</div>
                </div>
                <div className="pos-qty-ctrl">
                  <button onClick={() => updateQty(it.id, -1)}>−</button>
                  <span>{it.qty}</span>
                  <button onClick={() => updateQty(it.id, 1)}>+</button>
                </div>
                <div style={{ width: 60, textAlign: 'right', fontWeight: 700, fontSize: 12 }}>
                  {fmt(it.qty * it.rate)}
                </div>
              </div>
            ))}
            {cart.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 12 }}>Cart is empty</div>}
          </div>

          <div className="pos-bill-foot">
            <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
              {['Cash', 'UPI', 'Card'].map(m => (
                <button 
                  key={m} 
                  className={`btn-m ${payMode === m ? 'active' : ''}`}
                  onClick={() => setPayMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="pos-totals">
              <div className="pos-total-row"><span>Total Items</span><span>{cart.length}</span></div>
              <div className="pos-total-row grand"><span>Payable</span><span>{fmt(totals.total)}</span></div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: '15px', fontSize: 16, fontWeight: 700, marginTop: 15, borderRadius: 12 }} onClick={handleCheckout}>
              Checkout ₹{totals.total.toLocaleString()}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .pos-container { display: grid; grid-template-columns: 1fr 340px; gap: 15px; height: calc(100vh - 100px); padding: 5px; }
        .pos-main { display: flex; flex-direction: column; gap: 15px; overflow: hidden; }
        .pos-top-actions { display: flex; flex-direction: column; gap: 12px; }
        .pos-cats { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; }
        .pos-cat-btn { padding: 6px 15px; background: #fff; border: 1px solid var(--border); borderRadius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: 0.2s; }
        .pos-cat-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
        
        .pos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; overflow-y: auto; padding: 2px; }
        .pos-card { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 12px; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; justify-content: space-between; height: 100px; }
        .pos-card:hover { border-color: var(--accent); box-shadow: 0 3px 10px rgba(0,0,0,0.05); }
        .pos-card-name { font-size: 12px; font-weight: 700; color: #333; height: 32px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.3; }
        .pos-card-cat { font-size: 10px; color: var(--muted); margin-top: 4px; }
        .pos-card-price { font-size: 13px; font-weight: 800; color: var(--accent); margin-top: auto; }
        
        .pos-side { background: #fff; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
        .pos-bill-box { flex: 1; display: flex; flex-direction: column; }
        .pos-bill-head { padding: 12px 15px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        
        .pos-cust-sec { padding: 12px 15px; border-bottom: 1px solid var(--bg-soft); }
        .pos-cust-search input { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; outline: none; }
        .pos-cust-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); z-index: 100; max-height: 200px; overflow-y: auto; }
        .pos-cust-opt { padding: 10px 12px; border-bottom: 1px solid var(--bg-soft); cursor: pointer; transition: 0.2s; }
        .pos-cust-opt:hover { background: var(--bg-soft); }
        .pos-selected-cust { background: var(--bg-soft); padding: 8px 12px; border-radius: 8px; display: flex; align-items: center; border: 1px solid var(--border); }

        .pos-cart-list { flex: 1; overflow-y: auto; padding: 10px; }
        .pos-cart-item { display: flex; align-items: center; gap: 8px; padding: 10px 5px; border-bottom: 1px solid var(--bg-soft); }
        .pos-qty-ctrl { display: flex; align-items: center; gap: 8px; background: var(--bg-soft); border-radius: 6px; padding: 3px 6px; }
        .pos-qty-ctrl button { border: none; background: transparent; cursor: pointer; font-weight: 700; width: 16px; font-size: 14px; color: var(--muted); }
        .pos-qty-ctrl span { font-size: 12px; font-weight: 700; min-width: 15px; text-align: center; }
        
        .pos-bill-foot { padding: 15px; background: var(--bg-soft); border-top: 1px solid var(--border); }
        .btn-m { flex: 1; padding: 8px; background: #fff; border: 1px solid var(--border); border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .btn-m.active { background: #000; color: #fff; border-color: #000; }
        
        .pos-totals { display: flex; flex-direction: column; gap: 5px; }
        .pos-total-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); }
        .pos-total-row.grand { font-size: 22px; font-weight: 900; color: #000; margin-top: 5px; padding-top: 8px; border-top: 1px solid var(--border); }
        
        .pos-receipt-wrap { background: #f4f4f4; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; }
        .pos-receipt { background: #fff; width: 280px; padding: 15px; box-shadow: 0 0 20px rgba(0,0,0,0.1); color: #000; font-family: monospace; }
        
        @media print {
          .app, .no-print { display: none !important; }
          .pos-receipt-wrap { background: transparent !important; padding: 0 !important; }
          .pos-receipt { box-shadow: none !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }
        }
      `}</style>
      {/* Quick Add Customer Modal */}
      {custModal && (
        <div className="mo open">
          <div className="mo-box">
            <div className="mo-head"><h3>Quick Add Customer</h3><button className="btn-icon" onClick={() => setCustModal(false)}>✕</button></div>
            <div className="mo-body" style={{ textAlign: 'left' }}>
              <div className="fgrid">
                <div className="fg span2"><label>Full Name *</label><input value={newCustForm.name} onChange={ncf('name')} placeholder="e.g. John Doe" /></div>
                <div className="fg"><label>Email *</label><input value={newCustForm.email} onChange={ncf('email')} placeholder="john@example.com" /></div>
                <div className="fg"><label>Phone</label><input value={newCustForm.phone} onChange={ncf('phone')} placeholder="+91..." /></div>
                <div className="fg span2"><label>Address</label><textarea value={newCustForm.address} onChange={ncf('address')} placeholder="Full address..." /></div>
                <div className="fg"><label>Country</label>
                  <select value={newCustForm.country} onChange={ncf('country')}>
                    {['India', 'USA', 'UK', 'UAE', 'Australia', 'Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="fg"><label>State</label><input value={newCustForm.state} onChange={ncf('state')} placeholder="e.g. Tamil Nadu" /></div>
                <div className="fg"><label>Pincode</label><input value={newCustForm.pincode} onChange={ncf('pincode')} placeholder="600XXX" /></div>
                <div className="fg"><label>GSTIN</label><input value={newCustForm.gstin} onChange={ncf('gstin')} placeholder="22AAAAA0000A1Z5" /></div>
                
                {customFields.map(cf => (
                  <div key={cf.name} className="fg">
                    <label>{cf.name} {cf.required ? '*' : ''}</label>
                    <input 
                      type={cf.type === 'Number' ? 'number' : 'text'} 
                      value={newCustForm.custom?.[cf.name] || ''} 
                      onChange={nccf(cf.name)} 
                      placeholder={cf.name} 
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setCustModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={createCustomer}>Create Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
