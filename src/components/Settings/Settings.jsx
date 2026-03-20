import React, { useState, useRef, useEffect } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useToast } from '../../context/ToastContext';
import { renderTemplate, sendEmailMock, sendEmail, sendWhatsApp } from '../../utils/messaging';
import { fmtD, INDIAN_STATES, COUNTRIES, DEFAULT_STAGES, DEFAULT_SOURCES, DEFAULT_LABELS, SYSTEM_STAGES } from '../../utils/helpers';
import DocumentTemplate from '../Finance/DocumentTemplate';

const SETTINGS_GROUPS = [
  {
    title: 'General',
    items: ['Business', 'Billing']
  },
  {
    title: 'Lead Settings',
    items: ['Sources', 'Stages', 'Labels', 'Custom Fields']
  },
  {
    title: 'Finance & Products',
    items: ['Finance', 'Templates', 'Taxes', 'Product Categories', 'Expense Categories']
  },
  {
    title: 'Operations',
    items: ['Task Statuses']
  },
  {
    title: 'Comms & Alerts',
    items: ['SMTP', 'WhatsApp', 'Reminders']
  }
];

// Centralized defaults are imported from helpers.js
const DEFAULT_CFIELDS = []; // { name: 'Requirement', type: 'text'|'number'|'dropdown', options: 'A,B' }
const DEFAULT_PROD_CATS = ['Electronics', 'Home Appliances', 'Services', 'Furniture', 'General'];
const DEFAULT_EXP_CATS = ['Software', 'Hardware', 'Travel', 'Office', 'Marketing', 'Utilities', 'Salaries', 'Misc'];
const DEFAULT_TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];
const DEFAULT_TAX_OPTIONS = [
  { label: 'None (0%)', rate: 0 },
  { label: 'GST @ 5%', rate: 5 },
  { label: 'GST @ 12%', rate: 12 },
  { label: 'GST @ 18%', rate: 18 },
  { label: 'GST @ 28%', rate: 28 }
];

export default function Settings({ user, profile, isExpired, initialTab, ownerId, perms, teamInfo, memberProfile }) {
  const groups = SETTINGS_GROUPS;

  const [active, setActive] = useState(initialTab || 'Business');
  
  React.useEffect(() => {
     if (initialTab) setActive(initialTab);
  }, [initialTab]);

  // Removed userProfile state (now in UserProfile.jsx)
  const [biz, setBiz] = useState({
    bizName: profile?.bizName || '', 
    bizEmail: profile?.bizEmail || '',
    bizPhone: profile?.bizPhone || '',
    address: profile?.address || '',
    bizState: profile?.bizState || '',
    country: profile?.country || 'India',
    pincode: profile?.pincode || '',
    gstin: profile?.gstin || '', pan: profile?.pan || '',
    website: profile?.website || '',
    logo: profile?.logo || null,
    bizExtraEmails: profile?.bizExtraEmails || '',
  });
  const [fin, setFin] = useState({
    qPrefix: profile?.qPrefix || 'QUO-',
    qNextNum: profile?.qNextNum || 1,
    qTerms: profile?.qTerms || '1. Valid for 30 days.\n2. 50% advance to start work.',
    qNotes: profile?.qNotes || 'Thank you for your business!',
    iPrefix: profile?.iPrefix || 'INV-',
    iNextNum: profile?.iNextNum || 1,
    iTerms: profile?.iTerms || '1. Please pay within 7 days.\n2. Interest @ 18% for late payment.',
    iNotes: profile?.iNotes || 'Thank you for choosing us!',
    reqShipping: profile?.reqShipping || 'Optional',
    defaultTaxRate: profile?.defaultTaxRate || 0,
    bankName: profile?.bankName || '',
    accountNo: profile?.accountNo || '',
    ifsc: profile?.ifsc || '',
    accHolder: profile?.accHolder || '',
    bankExtra: profile?.bankExtra || '',
    qrCode: profile?.qrCode || null,
    invoiceTemplate: profile?.invoiceTemplate || 'Spreadsheet',
    quotationTemplate: profile?.quotationTemplate || 'Spreadsheet',
  });
  const [smtpHost, setSmtpHost] = useState(profile?.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(profile?.smtpPort || '587');
  const [smtpUser, setSmtpUser] = useState(profile?.smtpUser || '');
  const [smtpPass, setSmtpPass] = useState(profile?.smtpPass || '');
  const [waToken, setWaToken] = useState(profile?.waToken || '');
  const [waPhoneNumberId, setWaPhoneNumberId] = useState(profile?.waPhoneNumberId || '');
  const [waTestNumber, setWaTestNumber] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newStage, setNewStage] = useState('');
  const [editingStageIdx, setEditingStageIdx] = useState(null);
  const [editingStageVal, setEditingStageVal] = useState('');
  const stageDragIdx = useRef(null);
  const [newLabel, setNewLabel] = useState('');
  const [newExpCat, setNewExpCat] = useState('');
  const [newProdCat, setNewProdCat] = useState('');

  // Sync state with profile prop when it loads
  useEffect(() => {
    if (profile) {
      setBiz({
        bizName: profile.bizName || '',
        bizEmail: profile.bizEmail || '',
        bizPhone: profile.bizPhone || '',
        address: profile.address || '',
        bizState: profile.bizState || '',
        country: profile.country || 'India',
        pincode: profile.pincode || '',
        gstin: profile.gstin || '',
        pan: profile.pan || '',
        website: profile.website || '',
        logo: profile.logo || null,
        bizExtraEmails: profile.bizExtraEmails || '',
      });
      setFin({
        qPrefix: profile.qPrefix || 'QUO-',
        qNextNum: profile.qNextNum || 1,
        qTerms: profile.qTerms || '1. Valid for 30 days.\n2. 50% advance to start work.',
        qNotes: profile.qNotes || 'Thank you for your business!',
        iPrefix: profile.iPrefix || 'INV-',
        iNextNum: profile.iNextNum || 1,
        iTerms: profile.iTerms || '1. Please pay within 7 days.\n2. Interest @ 18% for late payment.',
        iNotes: profile.iNotes || 'Thank you for choosing us!',
        reqShipping: profile.reqShipping || 'Optional',
        defaultTaxRate: profile.defaultTaxRate || 0,
        bankName: profile.bankName || '',
        accountNo: profile.accountNo || '',
        ifsc: profile.ifsc || '',
        accHolder: profile.accHolder || '',
        bankExtra: profile.bankExtra || '',
        qrCode: profile.qrCode || null,
        invoiceTemplate: profile.invoiceTemplate || 'Classic',
        quotationTemplate: profile.quotationTemplate || 'Classic',
      });
      setSmtpHost(profile.smtpHost || '');
      setSmtpPort(profile.smtpPort || '587');
      setSmtpUser(profile.smtpUser || '');
      setSmtpPass(profile.smtpPass || '');
      setWaToken(profile.waToken || '');
      setWaPhoneNumberId(profile.waPhoneNumberId || '');
      setReminders(profile.reminders || {
        amc: { days: 30, msg: 'Hello {client}, your AMC contract is expiring on {date}. Please contact us for renewal.' },
        followup: { days: 1, msg: 'Reminder: Follow-up with {client} is scheduled for {date}.' }
      });
    }
  }, [profile]);
  const [newTaskStatus, setNewTaskStatus] = useState('');
  const [newTax, setNewTax] = useState({ label: '', rate: '' });
  const [newCF, setNewCF] = useState({ name: '', type: 'text', options: '' });
  const [reminders, setReminders] = useState(profile?.reminders || {
    amc: { days: 30, msg: 'Hello {client}, your AMC contract is expiring on {date}. Please contact us for renewal.' },
    followup: { days: 1, msg: 'Reminder: Follow-up with {client} is scheduled for {date}.' }
  });
  const [editingCFIndex, setEditingCFIndex] = useState(null);
  const toast = useToast();

  const { data } = db.useQuery({ 
     userProfiles: { $: { where: { userId: ownerId } } },
     leads: { $: { where: { userId: ownerId } } },
     customers: { $: { where: { userId: ownerId } } },
     quotes: { $: { where: { userId: ownerId } } },
     invoices: { $: { where: { userId: ownerId } } }
  });
  const profileId = data?.userProfiles?.[0]?.id;
  const sources = data?.userProfiles?.[0]?.sources || DEFAULT_SOURCES;
  const stages = data?.userProfiles?.[0]?.stages || DEFAULT_STAGES;
  const wonStage = data?.userProfiles?.[0]?.wonStage || 'Won';
  const lostStage = data?.userProfiles?.[0]?.lostStage || 'Lost';
  const disabledStages = data?.userProfiles?.[0]?.disabledStages || [];
  const labels = data?.userProfiles?.[0]?.labels || DEFAULT_LABELS;
  const customFields = data?.userProfiles?.[0]?.customFields || DEFAULT_CFIELDS;
  const productCats = data?.userProfiles?.[0]?.productCats || DEFAULT_PROD_CATS;
  const expCats = data?.userProfiles?.[0]?.expCats || DEFAULT_EXP_CATS;
  const taskStatuses = data?.userProfiles?.[0]?.taskStatuses || DEFAULT_TASK_STATUSES;
  const taxRates = data?.userProfiles?.[0]?.taxRates || DEFAULT_TAX_OPTIONS;

  // Auto-migration for revamped stage names: Drafted -> Created
  useEffect(() => {
    if (!profileId || !stages) return;
    let updated = false;
    const nl = [...stages];
    const txs = [];
    
    const migrations = [
      { old: 'Quotation Drafted', new: 'Quotation Created' },
      { old: 'Invoice Drafted', new: 'Invoice Created' }
    ];

    migrations.forEach(m => {
      const idx = nl.indexOf(m.old);
      if (idx !== -1) {
        nl[idx] = m.new;
        updated = true;
        // Also update leads currently in this stage
        (data?.leads || []).filter(l => l.stage === m.old).forEach(l => {
          txs.push(db.tx.leads[l.id].update({ stage: m.new }));
        });
      }
    });

    if (updated) {
      txs.push(db.tx.userProfiles[profileId].update({ stages: nl }));
      db.transact(txs).then(() => {
         console.log("✅ Stages migrated successfully (Drafted -> Created)");
      }).catch(e => console.error("❌ Stage migration failed:", e));
    }
  }, [profileId, stages, data?.leads]);

  const handleFile = (e, callback, fieldName = null) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) return toast('File too large (max 500KB)', 'error');
    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result;
      callback(result);
      
      // Auto-save if fieldName is provided
      if (fieldName && profileId) {
        try {
          await db.transact(db.tx.userProfiles[profileId].update({ [fieldName]: result }));
          toast(`${fieldName === 'logo' ? 'Logo' : 'QR Code'} auto-saved!`, 'success');
        } catch (err) {
          console.error(`Auto-save failed for ${fieldName}:`, err);
        }
      }
    };
    reader.readAsDataURL(file);
  };


  const saveBiz = async () => {
    const payload = { 
      ...biz, 
      accHolder: fin.accHolder,
      bankName: fin.bankName,
      accountNo: fin.accountNo,
      ifsc: fin.ifsc,
      bankExtra: fin.bankExtra,
      qrCode: fin.qrCode,
      userId: ownerId 
    };
    if (profileId) await db.transact(db.tx.userProfiles[profileId].update(payload));
    toast('Business details saved!', 'success');
  };

  const saveFin = async () => {
    const payload = { ...fin, userId: ownerId };
    if (profileId) await db.transact(db.tx.userProfiles[profileId].update(payload));
    toast('Finance settings saved!', 'success');
  };

  const saveList = async (key, list, extra = {}) => {
    const payload = { [key]: list, userId: ownerId, ...extra };
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update(payload)); }
    else { await db.transact(db.tx.userProfiles[id()].update({ ...payload, userId: ownerId })); }
    toast('Saved!', 'success');
  };

  const syncExistingData = async () => {
    const leads = data?.leads || [];
    const customers = data?.customers || [];
    const quotes = data?.quotes || [];
    const invoices = data?.invoices || [];
    const txs = [];
    let count = 0;
    let stageCount = 0;

    const activeStages = profile?.stages || DEFAULT_STAGES;
    const activeSources = profile?.sources || DEFAULT_SOURCES;
    const activeLabels = profile?.labels || DEFAULT_LABELS;

    const STAGE_ORDER = ['New Enquiry', 'Enquiry Contacted', 'Quotation Created', 'Quotation Sent', 'Invoice Created', 'Invoice Sent', 'Won'];

    leads.forEach(l => {
      let updated = false;
      const updates = {};

      // 1. Sync Contact Details from Customers (case-insensitive & trimmed)
      const cMatch = customers.find(c => (c.name || '').trim().toLowerCase() === (l.name || '').trim().toLowerCase());
      if (cMatch) {
        if ((cMatch.email && l.email !== cMatch.email) || (cMatch.phone && l.phone !== cMatch.phone)) {
          updates.email = cMatch.email || l.email || '';
          updates.phone = cMatch.phone || l.phone || '';
          updated = true;
          count++;
        }
      }

      // 2. Sync Stage from Quotes & Invoices (case-insensitive & trimmed)
      const lQuotes = quotes.filter(q => (q.client || '').trim().toLowerCase() === (l.name || '').trim().toLowerCase());
      const lInvoices = invoices.filter(i => (i.client || '').trim().toLowerCase() === (l.name || '').trim().toLowerCase());
      
      let targetStage = l.stage;
      const getRank = (s) => {
         if (s === wonStage) return STAGE_ORDER.indexOf('Won');
         if (s === lostStage) return STAGE_ORDER.indexOf('Lost');
         const r = STAGE_ORDER.indexOf(s);
         return r === -1 ? -1 : r;
      };

      const currentRank = getRank(l.stage);

      // Check Invoices first (higher priority)
      if (lInvoices.some(i => i.status === 'Paid' || i.status === 'Partially Paid')) {
         targetStage = wonStage;
      } else if (lInvoices.some(i => i.status === 'Sent')) {
         targetStage = 'Invoice Sent';
      } else if (lInvoices.some(i => i.status === 'Draft')) {
         targetStage = 'Invoice Created';
      } else if (lQuotes.some(q => q.status === 'Sent')) {
         targetStage = 'Quotation Sent';
      } else if (lQuotes.some(q => q.status === 'Draft' || q.status === 'Created')) {
         targetStage = 'Quotation Created';
      }

      if (targetStage !== l.stage && getRank(targetStage) > currentRank) {
         updates.stage = targetStage;
         updated = true;
         stageCount++;
      }

      if (updated) {
        txs.push(db.tx.leads[l.id].update(updates));
      }
    });

    if (txs.length > 0) {
      await db.transact(txs);
      toast(`Synced details for ${count} leads and updated stages for ${stageCount} leads!`, 'success');
    } else {
      toast('All lead data is already in sync', 'info');
    }
  };

  const addItem = (key, list, val, reset) => {
    if (!val.trim()) return;
    saveList(key, [...list, val.trim()]);
    reset('');
  };

  const addCF = () => {
    if (!newCF.name.trim()) return;
    if (editingCFIndex !== null) {
      const updatedList = [...customFields];
      updatedList[editingCFIndex] = { ...newCF, name: newCF.name.trim() };
      saveList('customFields', updatedList);
      setEditingCFIndex(null);
    } else {
      saveList('customFields', [...customFields, { ...newCF, name: newCF.name.trim() }]);
    }
    setNewCF({ name: '', type: 'text', options: '' });
  };
  
  const editCF = (idx) => {
    setEditingCFIndex(idx);
    setNewCF(customFields[idx]);
  };

  const cancelEditCF = () => {
    setEditingCFIndex(null);
    setNewCF({ name: '', type: 'text', options: '' });
  };

  const removeItem = (key, list, idx) => saveList(key, list.filter((_, i) => i !== idx));

  const editItem = (key, list, idx, currentVal) => {
    const newVal = prompt('Edit value:', currentVal);
    if (newVal !== null && newVal.trim() !== '' && newVal !== currentVal) {
      const newList = [...list];
      newList[idx] = newVal.trim();
      saveList(key, newList);
    }
  };

  const addTaxRate = () => {
    if (!newTax.label.trim() || newTax.rate === '') return;
    saveList('taxRates', [...taxRates, { label: newTax.label.trim(), rate: parseFloat(newTax.rate) || 0 }]);
    setNewTax({ label: '', rate: '' });
  };

  const saveSMTP = async () => {
    const payload = { smtpHost, smtpPort, smtpUser, smtpPass, smtpSender: smtpUser, userId: ownerId };
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update(payload)); }
    toast('SMTP settings saved!', 'success');
  };

  const testSMTP = async () => {
    if (!smtpHost || !smtpUser || !smtpPass) return toast('Fill in SMTP Host, Username and Password first', 'error');
    const testEmail = prompt('Recipient Email:', user?.email || smtpUser);
    if (!testEmail) return;
    const testSubject = prompt('Email Subject:', 'CRM SMTP Test');
    if (!testSubject) return;
    const testBody = prompt('Email Content:', 'This is a test email from your CRM. If you see this, SMTP is working!');
    if (!testBody) return;

    try {
      toast('Sending test email...', 'info');
      const smtpConfig = { smtpHost, smtpPort, smtpUser, smtpPass, bizName: biz.bizName };
      const result = await sendEmail(testEmail, testSubject, testBody, ownerId, biz.bizName, user.id, smtpConfig);
      if (result === 'OK') {
        toast('✅ Test email sent successfully!', 'success');
      } else {
        toast(`⚠️ Unexpected result: ${result}`, 'warning');
      }
    } catch (e) {
      console.error('SMTP Test Error:', e);
      toast(`❌ Failed: ${e.message}`, 'error');
    }
  };

  const saveWA = async () => {
    if (!waToken.trim()) return toast('Access Token is required', 'error');
    if (!waPhoneNumberId.trim()) return toast('Phone Number ID is required', 'error');
    const payload = { waToken, waPhoneNumberId, userId: ownerId };
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update(payload)); }
    toast('WhatsApp settings saved!', 'success');
  };

  const testWA = async () => {
    if (!waToken || !waPhoneNumberId) return toast('Please save WhatsApp settings first', 'error');
    const testTo = waTestNumber || prompt('Send test message to (with country code e.g. +919876543210):');
    if (!testTo) return;
    const testMsg = `Hello! This is a test message from your TechCRM account. WhatsApp integration is working correctly! 🚀\n\nBusiness: ${biz.bizName || 'Your Business'}`;
    try {
      toast('Sending test WhatsApp message...', 'info');
      const result = await sendWhatsApp(testTo, testMsg, ownerId, user.id);
      if (result === 'OK') {
        toast('✅ Test WhatsApp message sent successfully!', 'success');
      } else {
        let errHint = result;
        if (result.includes('access token') || result.includes('parse')) {
          errHint = `Invalid Token! Please check your Meta Access Token and ensure it hasn't expired.`;
        } else if (result.includes('15 characters') || result.includes('ID')) {
          errHint = `Check your Phone Number ID. It should be a 15-digit number from Meta's API Setup page.`;
        }
        toast(`Error: ${errHint}`, 'warning');
      }
    } catch (e) {
      let msg = e.message;
      if (msg.includes('parse access token')) {
        msg = "Meta Error: Cannot parse Access Token. Please re-copy the token from Meta Dashboard and ensure no extra characters.";
      }
      toast(`Failed: ${msg}`, 'error');
    }
  };


  const saveReminders = async () => {
    const payload = { reminders, userId: ownerId };
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update(payload)); }
    toast('Reminder rules updated!', 'success');
  };

  const testTemplate = (key) => {
    const msg = renderTemplate(reminders[key].msg, {
      client: 'Sample Client',
      date: new Date().toLocaleDateString(),
      bizName: biz.bizName || 'My Business'
    });
    alert(`📢 Template Preview:\n\n${msg}\n\n(This is how your automated message will look)`);
  };
  const sampleInv = {
    no: 'INV/2026/001', date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 86400000*7).toISOString().split('T')[0],
    client: 'John Doe Corp', items: [{ name: 'Premium Service', qty: 1, rate: 2500, taxRate: 18 }, { name: 'Consulting', qty: 2, rate: 500, taxRate: 0 }],
    disc: 10, discType: '%', notes: 'Sample invoice preview', terms: 'Due in 7 days'
  };

  return (
    <div>
      <div className="sh"><div><h2>Settings</h2></div></div>
      <div className="sg">
        {/* Sidebar */}
        <div className="sn">
          {groups.map(group => (
            <div key={group.title} className="sng">
              <div className="snh">{group.title}</div>
              {group.items.map(s => (
                <div key={s} className={`sni${active === s ? ' active' : ''}`} onClick={() => setActive(s)}>{s}</div>
              ))}
            </div>
          ))}
        </div>

        {/* Content */}
        <div>
          {active === 'Billing' && (
            <div>
              <div className="sh" style={{ marginBottom: 20 }}>
                <div>
                  <h3>Current Plan</h3>
                  <div className="sub">Manage your current plan and upgrades</div>
                </div>
                {isExpired && <span className="badge bg-red" style={{ padding: '4px 12px', fontSize: 11 }}>EXPIRED</span>}
              </div>

              <div className="stat-grid" style={{ marginBottom: 30 }}>
                <div className="stat-card sc-blue">
                  <div className="lbl">Current Plan</div>
                  <div className="val">{profile?.plan || 'Free Trial'}</div>
                </div>
                <div className="stat-card sc-purple">
                  <div className="lbl">Valid Until</div>
                  <div className="val" style={{ fontSize: 16 }}>{profile?.planExpiry ? new Date(profile.planExpiry).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>

              <h4 style={{ marginBottom: 15 }}>Upgrade Options</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 15 }}>
                {[
                  { name: 'Trial', duration: 7, price: 0, desc: 'Perfect for exploring the CRM' },
                  { name: 'Premium', duration: 30, price: 2999, desc: 'For growing businesses' },
                  { name: 'START-UP', duration: 365, price: 24999, desc: 'Cost-effective annual plan' },
                  { name: 'Premium Pro', duration: 365, price: 29999, desc: 'Unlimited power for teams' },
                ].map(p => (
                  <div key={p.name} className={`plan-card ${profile?.plan === p.name ? 'featured' : ''}`} style={{ border: profile?.plan === p.name ? '2px solid var(--accent)' : '1px solid var(--border)', padding: 20, borderRadius: 12, position: 'relative' }}>
                    {profile?.plan === p.name && <div style={{ position: 'absolute', top: -10, right: 10, background: 'var(--accent)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>ACTIVE</div>}
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>{p.desc}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, margin: '10px 0', color: 'var(--accent)' }}>
                      {p.price === 0 ? 'Free' : `₹${p.price.toLocaleString()}`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 15 }}>per {p.duration} days</div>
                    
                    {profile?.plan === p.name ? (
                      <button className="btn btn-primary" style={{ width: '100%', opacity: 0.7 }} disabled>Current Plan</button>
                    ) : (
                      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => toast(`Contact Admin to upgrade to ${p.name}`, 'info')}>Upgrade Now</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}


          {active === 'Business' && (
            <div className="tw">
              <div className="tw-head"><h3>Business Profile</h3><button className="btn btn-primary btn-sm" onClick={saveBiz}>Save Business</button></div>
              <div style={{ padding: '20px' }}>
                <div className="sub" style={{ marginBottom: 20 }}>Public business information used for invoices and professional documents.</div>
                <div className="fgrid">
                  <div className="fg span2"><label>Business Name</label><input value={biz.bizName} onChange={e => setBiz(b => ({ ...b, bizName: e.target.value }))} /></div>
                  <div className="fg span2"><label>Business Address</label><textarea value={biz.address} onChange={e => setBiz(b => ({ ...b, address: e.target.value }))} style={{ minHeight: 60 }} /></div>
                  <div className="fg"><label>Official Email</label><input type="email" value={biz.bizEmail} onChange={e => setBiz(b => ({ ...b, bizEmail: e.target.value }))} /></div>
                  <div className="fg"><label>Official Phone</label><input value={biz.bizPhone} onChange={e => setBiz(b => ({ ...b, bizPhone: e.target.value }))} /></div>
                  <div className="fg">
                    <label>Country</label>
                    <select value={biz.country} onChange={e => setBiz(b => ({ ...b, country: e.target.value }))}>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="fg">
                    <label>State</label>
                    <select value={biz.bizState} onChange={e => setBiz(b => ({ ...b, bizState: e.target.value }))}>
                      <option value="">Select State...</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label>Pincode</label><input value={biz.pincode} onChange={e => setBiz(b => ({ ...b, pincode: e.target.value }))} placeholder="Postal Code" /></div>
                  <div className="fg"><label>GSTIN</label><input value={biz.gstin} onChange={e => setBiz(b => ({ ...b, gstin: e.target.value }))} placeholder="22AAAAA0000A1Z5" /></div>
                  <div className="fg"><label>PAN</label><input value={biz.pan} onChange={e => setBiz(b => ({ ...b, pan: e.target.value }))} placeholder="AAAPZ1234C" /></div>
                  <div className="fg span2"><label>Website</label><input value={biz.website} onChange={e => setBiz(b => ({ ...b, website: e.target.value }))} /></div>
                  <div className="fg span2">
                    <label>Additional Notification Emails (comma-separated)</label>
                    <input 
                      value={biz.bizExtraEmails} 
                      onChange={e => setBiz(b => ({ ...b, bizExtraEmails: e.target.value }))} 
                      placeholder="manager@example.com, support@example.com" 
                    />
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>These emails will also receive automated business alerts (Follow-ups, etc.)</div>
                  </div>
                  <div className="fg span2">
                    <label>Business Logo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 5 }}>
                      {biz.logo && <img src={biz.logo} alt="Logo" style={{ height: 60, width: 60, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 8 }} />}
                      <div style={{ flex: 1 }}>
                        <input type="file" accept="image/*" onChange={e => handleFile(e, (res) => setBiz(b => ({ ...b, logo: res })), 'logo')} style={{ fontSize: 12 }} />
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Recommended: Square PNG/JPG, Max 500KB.</div>
                      </div>
                      {biz.logo && <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={async () => {
                        setBiz(b => ({ ...b, logo: null }));
                        if (profileId) await db.transact(db.tx.userProfiles[profileId].update({ logo: null }));
                      }}>Remove</button>}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 30, paddingTop: 20, borderTop: '2px dashed var(--border)' }}>
                  <h4 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Payment & Bank Details
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 30 }}>
                    <div className="fgrid">
                      <div className="fg span2"><label>Account Holder Name</label><input value={fin.accHolder} onChange={e => setFin(f => ({ ...f, accHolder: e.target.value }))} /></div>
                      <div className="fg"><label>Bank Name</label><input value={fin.bankName} onChange={e => setFin(f => ({ ...f, bankName: e.target.value }))} /></div>
                      <div className="fg"><label>Account Number</label><input value={fin.accountNo} onChange={e => setFin(f => ({ ...f, accountNo: e.target.value }))} /></div>
                      <div className="fg"><label>IFSC Code</label><input value={fin.ifsc} onChange={e => setFin(f => ({ ...f, ifsc: e.target.value }))} /></div>
                      <div className="fg span2"><label>Additional Payment Details (Optional)</label><textarea value={fin.bankExtra} onChange={e => setFin(f => ({ ...f, bankExtra: e.target.value }))} placeholder="e.g. UPI ID: name@upi or Swift Code: ..." style={{ minHeight: 60 }} /></div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block' }}>Payment QR Code</label>
                      <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 15, textAlign: 'center', background: 'var(--bg-soft)' }}>
                        {fin.qrCode ? (
                          <div style={{ position: 'relative' }}>
                            <img src={fin.qrCode} alt="QR" style={{ width: '100%', maxWidth: 150, borderRadius: 8 }} />
                            <button className="btn btn-sm" style={{ position: 'absolute', top: -10, right: -10, background: '#fee2e2', color: '#991b1b', padding: '2px 6px' }} onClick={() => setFin(f => ({ ...f, qrCode: null }))}>✕</button>
                          </div>
                        ) : (
                          <div style={{ padding: '10px 0' }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>📱</div>
                            <input type="file" accept="image/*" onChange={e => handleFile(e, (res) => setFin(f => ({ ...f, qrCode: res })), 'qrCode')} style={{ fontSize: 11, width: '100%' }} />
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>Upload UPI/Payment QR</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 30, paddingTop: 20, borderTop: '2px dashed var(--border)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6m12-4a9 9 0 01-15 6.7L3 16" /></svg>
                          Data Maintenance
                        </h4>
                        <div className="sub" style={{ marginBottom: 15 }}>Sync existing lead contact details (Phone/Email) with their matching customer records.</div>
                      </div>
                      <button className="btn btn-secondary" onClick={syncExistingData}>
                        🔄 Sync Data
                      </button>
                   </div>
                </div>
              </div>
            </div>
          )}

          {active === 'Finance' && (
            <div className="tw">
              <div className="tw-head"><h3>Quotation & Invoice Settings</h3><button className="btn btn-primary btn-sm" onClick={saveFin}>Save Settings</button></div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                  {/* Quotations */}
                  <div>
                    <h4 style={{ marginBottom: 15, color: 'var(--accent)' }}>Quotations</h4>
                    <div className="fgrid">
                      <div className="fg"><label>Prefix</label><input value={fin.qPrefix} onChange={e => setFin(f => ({ ...f, qPrefix: e.target.value }))} /></div>
                      <div className="fg"><label>Starting Number</label><input type="number" value={fin.qNextNum} onChange={e => setFin(f => ({ ...f, qNextNum: parseInt(e.target.value) || 1 }))} /></div>
                      <div className="fg span2"><label>Default Terms & Conditions</label><textarea value={fin.qTerms} onChange={e => setFin(f => ({ ...f, qTerms: e.target.value }))} style={{ minHeight: 80 }} /></div>
                      <div className="fg span2"><label>Default Notes</label><textarea value={fin.qNotes} onChange={e => setFin(f => ({ ...f, qNotes: e.target.value }))} style={{ minHeight: 60 }} /></div>
                    </div>
                  </div>

                  {/* Invoices */}
                  <div>
                    <h4 style={{ marginBottom: 15, color: 'var(--green)' }}>Invoices</h4>
                    <div className="fgrid">
                      <div className="fg"><label>Prefix</label><input value={fin.iPrefix} onChange={e => setFin(f => ({ ...f, iPrefix: e.target.value }))} /></div>
                      <div className="fg"><label>Starting Number</label><input type="number" value={fin.iNextNum} onChange={e => setFin(f => ({ ...f, iNextNum: parseInt(e.target.value) || 1 }))} /></div>
                      <div className="fg span2"><label>Default Terms & Conditions</label><textarea value={fin.iTerms} onChange={e => setFin(f => ({ ...f, iTerms: e.target.value }))} style={{ minHeight: 80 }} /></div>
                      <div className="fg span2"><label>Default Notes</label><textarea value={fin.iNotes} onChange={e => setFin(f => ({ ...f, iNotes: e.target.value }))} style={{ minHeight: 60 }} /></div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 30, paddingTop: 20, borderTop: '2px dashed var(--border)' }}>
                  <div className="fgrid">
                    <div className="fg">
                      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Ship to option</label>
                      <select value={fin.reqShipping} onChange={e => setFin(f => ({ ...f, reqShipping: e.target.value }))}>
                        <option value="Optional">Toggle (Optional addition per-document)</option>
                        <option value="Hidden">Hidden (Do not feature Ship To address)</option>
                        <option value="Mandatory">Mandatory (Always require Ship To address)</option>
                      </select>
                    </div>
                    <div className="fg">
                      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Default Tax Rate (%)</label>
                      <select value={fin.defaultTaxRate} onChange={e => setFin(f => ({ ...f, defaultTaxRate: parseFloat(e.target.value) || 0 }))}>
                        {taxRates.map(t => <option key={t.label} value={t.rate}>{t.label} ({t.rate}%)</option>)}
                      </select>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {active === 'Taxes' && (
            <div className="tw">
              <div className="tw-head"><h3>Tax Configuration</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                  <input value={newTax.label} onChange={e => setNewTax({ ...newTax, label: e.target.value })} placeholder="Label (e.g. IGST 18%)" style={{ flex: 2, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <input type="number" value={newTax.rate} onChange={e => setNewTax({ ...newTax, rate: e.target.value })} placeholder="Rate (%)" style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <button className="btn btn-primary btn-sm" onClick={addTaxRate}>Add Tax</button>
                </div>
                <div className="tw-scroll">
                  <table style={{ background: 'var(--bg)', borderRadius: 8, overflow: 'hidden' }}>
                    <thead><tr><th>Tax Label</th><th>Percentage Rate</th><th>Action</th></tr></thead>
                    <tbody>
                      {taxRates.length === 0 ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: 14, color: 'var(--muted)' }}>No taxes defined</td></tr> : taxRates.map((t, i) => (
                        <tr key={i}>
                          <td><strong>{t.label}</strong></td>
                          <td><span className="badge bg-purple">{t.rate}%</span></td>
                          <td>
                             <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px' }} onClick={() => removeItem('taxRates', taxRates, i)}>Del</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {active === 'Custom Fields' && (
            <div className="tw">
              <div className="tw-head"><h3>Lead Custom Fields</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                  <input value={newCF.name} onChange={e => setNewCF({ ...newCF, name: e.target.value })} placeholder="Field Name (e.g. Budget)" style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <select value={newCF.type} onChange={e => setNewCF({ ...newCF, type: e.target.value })} style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                  {newCF.type === 'dropdown' && (
                     <input value={newCF.options} onChange={e => setNewCF({ ...newCF, options: e.target.value })} placeholder="Options (comma separated)" style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  )}
                  <button className="btn btn-primary btn-sm" onClick={addCF}>{editingCFIndex !== null ? 'Update Field' : 'Add Field'}</button>
                  {editingCFIndex !== null && <button className="btn btn-secondary btn-sm" onClick={cancelEditCF}>Cancel</button>}
                </div>
                <div className="tw-scroll">
                  <table style={{ background: 'var(--bg)', borderRadius: 8, overflow: 'hidden' }}>
                    <thead><tr><th>Field Name</th><th>Type</th><th>Options</th><th>Action</th></tr></thead>
                    <tbody>
                      {customFields.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 14, color: 'var(--muted)' }}>No custom fields defined</td></tr> : customFields.map((cf, i) => (
                        <tr key={i}>
                          <td><strong>{cf.name}</strong></td>
                          <td><span className="badge bg-gray">{cf.type}</span></td>
                          <td>{cf.type === 'dropdown' ? cf.options : '-'}</td>
                          <td style={{ display: 'flex', gap: 6 }}>
                             <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px' }} onClick={() => editCF(i)}>✎ Edit</button>
                             <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px' }} onClick={() => removeItem('customFields', customFields, i)}>Del</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {active === 'Sources' && (
            <div className="tw">
              <div className="tw-head"><h3>Lead Sources</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="New source..." style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addItem('sources', sources, newSource, setNewSource)}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {sources.map((s, i) => (
                    <span key={i} className="badge bg-blue" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px' }}>
                      {s} 
                      <span style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => editItem('sources', sources, i, s)}>✎</span>
                      <span style={{ cursor: 'pointer', color: '#1e40af' }} onClick={() => removeItem('sources', sources, i)}>✕</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'Stages' && (
            <div className="tw">
              <div className="tw-head"><h3>Lead Stages</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Drag ⠿ to reorder. Changes apply to the Kanban board and all stage dropdowns.</div>

                {/* Add New Stage */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    value={newStage}
                    onChange={e => setNewStage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && newStage.trim() && (saveList('stages', [...stages, newStage.trim()]), setNewStage(''))}
                    placeholder="New stage name..."
                    style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => { if (!newStage.trim()) return; saveList('stages', [...stages, newStage.trim()]); setNewStage(''); }}>+ Add Stage</button>
                </div>

                {/* Stage List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {stages.map((s, i) => (
                    <div
                      key={i}
                      draggable
                      onDragStart={e => { stageDragIdx.current = i; e.dataTransfer.effectAllowed = 'move'; }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        const from = stageDragIdx.current;
                        if (from === null || from === i) return;
                        const reordered = [...stages];
                        const [moved] = reordered.splice(from, 1);
                        reordered.splice(i, 0, moved);
                        saveList('stages', reordered);
                        stageDragIdx.current = null;
                      }}
                      onDragEnd={() => { stageDragIdx.current = null; }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'grab', userSelect: 'none' }}
                    >
                      <span style={{ fontSize: 18, color: 'var(--muted)', lineHeight: 1, cursor: 'grab' }}>⠿</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', width: 20, textAlign: 'center' }}>#{i + 1}</span>
                      {editingStageIdx === i ? (
                        <input
                          autoFocus
                          value={editingStageVal}
                          onChange={e => setEditingStageVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { 
                               const newVal = editingStageVal.trim();
                               if (newVal && newVal !== s) {
                                  const nl = [...stages]; 
                                  nl[i] = newVal;
                                  const extra = {};
                                  if (s === wonStage) extra.wonStage = newVal;
                                  if (s === lostStage) extra.lostStage = newVal;
                                  
                                  const txs = [db.tx.userProfiles[profileId].update({ stages: nl, ...extra })];
                                  // Update leads
                                  (data?.leads || []).filter(l => l.stage === s).forEach(l => {
                                     txs.push(db.tx.leads[l.id].update({ stage: newVal }));
                                  });
                                  db.transact(txs).then(() => toast('Stage updated!', 'success'));
                               }
                               setEditingStageIdx(null); 
                            }
                            if (e.key === 'Escape') setEditingStageIdx(null);
                          }}
                          onBlur={() => { 
                             const newVal = editingStageVal.trim();
                             if (newVal && newVal !== s) {
                                const nl = [...stages]; 
                                nl[i] = newVal;
                                const extra = {};
                                if (s === wonStage) extra.wonStage = newVal;
                                
                                const txs = [db.tx.userProfiles[profileId].update({ stages: nl, ...extra })];
                                (data?.leads || []).filter(l => l.stage === s).forEach(l => {
                                   txs.push(db.tx.leads[l.id].update({ stage: newVal }));
                                });
                                db.transact(txs).then(() => toast('Stage updated!', 'success'));
                             }
                             setEditingStageIdx(null); 
                          }}
                          style={{ flex: 1, padding: '4px 8px', border: '1.5px solid var(--accent)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
                        />
                      ) : (
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s} {(SYSTEM_STAGES.includes(s) || s === wonStage) && <span style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 400, marginLeft: 8 }}>(System Stage)</span>}</span>
                      )}
                      
                      {(!SYSTEM_STAGES.includes(s) || s === wonStage) && (
                         <button
                           className="btn btn-secondary btn-sm"
                           style={{ fontSize: 11, padding: '2px 8px' }}
                           onClick={() => { setEditingStageIdx(i); setEditingStageVal(s); }}
                         >✎ Rename</button>
                      )}

                      {(!SYSTEM_STAGES.includes(s) && s !== wonStage) && (
                         <button
                           className="btn btn-sm"
                           style={{ fontSize: 11, padding: '2px 8px', background: '#fee2e2', color: '#991b1b' }}
                           onClick={() => removeItem('stages', stages, i)}
                         >✕</button>
                      )}
                      
                      {(SYSTEM_STAGES.includes(s) || s === wonStage) && (
                        <button
                          className="btn btn-sm"
                          style={{ 
                            fontSize: 11, 
                            padding: '2px 8px', 
                            background: disabledStages.includes(s) ? '#f3f4f6' : '#ecfdf5', 
                            color: disabledStages.includes(s) ? '#4b5563' : '#047857',
                            border: `1px solid ${disabledStages.includes(s) ? '#d1d5db' : '#a7f3d0'}`
                          }}
                          onClick={() => {
                            const nw = disabledStages.includes(s) ? disabledStages.filter(x => x !== s) : [...disabledStages, s];
                            saveList('disabledStages', nw);
                          }}
                        >
                          {disabledStages.includes(s) ? 'Enable' : 'Disable'}
                        </button>
                      )}
                    </div>
                  ))}
                  {stages.length === 0 && <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 20 }}>No stages yet. Add one above.</div>}
                </div>
              </div>
            </div>
          )}

          {active === 'Labels' && (
            <div className="tw">
              <div className="tw-head"><h3>Lead Labels</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="New label..." style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addItem('labels', labels, newLabel, setNewLabel)}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {labels.map((l, i) => (
                    <span key={i} className="badge bg-orange" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px' }}>
                      {l} 
                      <span style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => editItem('labels', labels, i, l)}>✎</span>
                      <span style={{ cursor: 'pointer' }} onClick={() => removeItem('labels', labels, i)}>✕</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'Product Categories' && (
            <div className="tw">
              <div className="tw-head"><h3>Product Categories</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={newProdCat} onChange={e => setNewProdCat(e.target.value)} placeholder="New product category..." style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addItem('productCats', productCats, newProdCat, setNewProdCat)}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {productCats.map((c, i) => (
                    <span key={i} className="badge bg-blue" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px' }}>
                      {c} 
                      <span style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => editItem('productCats', productCats, i, c)}>✎</span>
                      <span style={{ cursor: 'pointer' }} onClick={() => removeItem('productCats', productCats, i)}>✕</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'Expense Categories' && (
            <div className="tw">
              <div className="tw-head"><h3>Expense Categories</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={newExpCat} onChange={e => setNewExpCat(e.target.value)} placeholder="New category..." style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addItem('expCats', expCats, newExpCat, setNewExpCat)}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {expCats.map((c, i) => (
                    <span key={i} className="badge bg-gray" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px' }}>
                      {c} 
                      <span style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => editItem('expCats', expCats, i, c)}>✎</span>
                      <span style={{ cursor: 'pointer' }} onClick={() => removeItem('expCats', expCats, i)}>✕</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'Task Statuses' && (
            <div className="tw">
              <div className="tw-head"><h3>Task Statuses</h3></div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={newTaskStatus} onChange={e => setNewTaskStatus(e.target.value)} placeholder="New status..." style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addItem('taskStatuses', taskStatuses, newTaskStatus, setNewTaskStatus)}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {taskStatuses.map((s, i) => (
                    <span key={i} className="badge bg-purple" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px' }}>
                      {s} 
                      <span style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => editItem('taskStatuses', taskStatuses, i, s)}>✎</span>
                      <span style={{ cursor: 'pointer' }} onClick={() => removeItem('taskStatuses', taskStatuses, i)}>✕</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'SMTP' && (
            <div className="tw">
              <div className="tw-head">
                <h3>Email Settings (Direct SMTP)</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                   <button className="btn btn-secondary btn-sm" onClick={testSMTP}>Test Connection</button>
                   <button className="btn btn-primary btn-sm" onClick={saveSMTP}>Save</button>
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <div className="sub" style={{ marginBottom: 15 }}>
                  Enter your SMTP server details below. Works with Gmail, Outlook, Hostinger, or any SMTP provider.
                </div>
                <div className="fgrid">
                  <div className="fg"><label>SMTP Host</label><input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="e.g., smtp.gmail.com" /></div>
                  <div className="fg"><label>SMTP Port</label><input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587 or 465" /></div>
                  <div className="fg"><label>Email / Username</label><input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="your@email.com" /></div>
                  <div className="fg"><label>Password / App Password</label><input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="••••••••" /></div>
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12, fontSize: 12, marginTop: 12, color: '#166534' }}>
                  💡 <strong>Gmail Users:</strong> Use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 600 }}>App Password</a> (not your main password). Set Host to <code>smtp.gmail.com</code>, Port to <code>587</code>.
                </div>
              </div>
            </div>
          )}

          {active === 'WhatsApp' && (
            <div className="tw">
              <div className="tw-head">
                <h3>📱 WhatsApp Business API</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={testWA}>Test Send</button>
                  <button className="btn btn-primary btn-sm" onClick={saveWA}>Save</button>
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <div className="sub" style={{ marginBottom: 18 }}>
                  Connect your official Meta WhatsApp Business API to send messages directly from the CRM.
                </div>

                {/* Status indicator */}
                {waToken && waPhoneNumberId ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Configured</span>
                    <span style={{ color: '#166534' }}>— WhatsApp API credentials are on file. Use "Test Send" to verify.</span>
                  </div>
                ) : (
                  <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#854d0e' }}>
                    ⚠ Not configured. Fill in your Meta API credentials below and click Save.
                  </div>
                )}

                <div className="fgrid">
                  <div className="fg span2">
                    <label>Access Token *</label>
                    <input
                      type="password"
                      value={waToken}
                      onChange={e => setWaToken(e.target.value)}
                      placeholder="EAAxxxxxxxxxx... (Permanent or Temporary Token)"
                    />
                  </div>
                  <div className="fg">
                    <label>Phone Number ID *</label>
                    <input
                      value={waPhoneNumberId}
                      onChange={e => setWaPhoneNumberId(e.target.value)}
                      placeholder="e.g. 123456789012345"
                    />
                  </div>
                  <div className="fg">
                    <label>Test Phone Number (for Test Send)</label>
                    <input
                      value={waTestNumber}
                      onChange={e => setWaTestNumber(e.target.value)}
                      placeholder="+919876543210"
                    />
                  </div>
                </div>

                {/* Setup Guide */}
                <div style={{ marginTop: 20, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', background: 'var(--bg)', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>📋 Setup Guide</div>
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      ['1', 'Go to', 'Meta Developer Portal', 'https://developers.facebook.com/apps', 'and create/select your App.'],
                      ['2', 'Under', 'WhatsApp > API Setup', null, '— find your Phone Number ID and Temporary Access Token.'],
                      ['3', 'For production, create a', 'System User Token', 'https://business.facebook.com/settings/system-users', 'with whatsapp_business_messaging permission.'],
                      ['4', 'Paste your Token and Phone Number ID above, then click Save.'],
                      ['5', 'Use "Test Send" to verify delivery to your registered test number.'],
                    ].map(([num, ...parts]) => (
                      <div key={num} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#22c55e', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{num}</span>
                        <span style={{ color: 'var(--text)', lineHeight: 1.5 }}>
                          {parts.length === 4 ? (
                            <>{parts[0]} <a href={parts[2]} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>{parts[1]}</a> {parts[3]}</>
                          ) : parts.join(' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, fontSize: 12, marginTop: 12, color: '#1e40af' }}>
                  💡 <strong>Note:</strong> Free tier allows sending to <strong>verified test numbers only</strong>. To message anyone, your WhatsApp Business account must be approved by Meta.
                </div>
              </div>
            </div>
          )}

          {active === 'Templates' && (
            <div className="tw">
              <div className="tw-head"><h3>Document Templates</h3><button className="btn btn-primary btn-sm" onClick={saveFin}>Save Defaults</button></div>
              <div style={{ padding: '20px' }}>
                <div className="sub" style={{ marginBottom: 25 }}>Select the default look and feel for your Invoices and Quotations.</div>
                
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                    {/* Invoice Template Selection */}
                    <div>
                       <h4 style={{ marginBottom: 15 }}>Default Invoice Template</h4>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                          {[
                            { id: 'Classic', name: 'Classic' },
                            { id: 'Modern', name: 'Modern' },
                            { id: 'Minimal', name: 'Minimal' },
                            { id: 'Spreadsheet', name: 'Tax Invoice (GST)' },
                          ].map(t => (
                            <div key={t.id} onClick={() => setFin(f => ({ ...f, invoiceTemplate: t.id }))} style={{ border: fin.invoiceTemplate === t.id ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 10, padding: 10, cursor: 'pointer', textAlign: 'center', backgroundColor: fin.invoiceTemplate === t.id ? 'rgba(var(--accent-rgb), 0.05)' : 'transparent', transition: '0.2s', minWidth: 0 }}>
                               <div style={{ height: 160, background: '#f8fafc', borderRadius: 6, marginBottom: 8, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                  <div style={{ transform: 'scale(0.18)', transformOrigin: 'top center', pointerEvents: 'none', width: '210mm', height: '297mm', flexShrink: 0 }}>
                                     <DocumentTemplate data={{ ...sampleInv, template: t.id }} profile={biz} preview={true} type="Invoice" />
                                  </div>
                               </div>
                               <div style={{ fontSize: 12, fontWeight: 700 }}>{t.name}</div>
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Quotation Template Selection */}
                    <div>
                       <h4 style={{ marginBottom: 15 }}>Default Quotation Template</h4>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                          {[
                            { id: 'Classic', name: 'Classic' },
                            { id: 'Modern', name: 'Modern' },
                            { id: 'Minimal', name: 'Minimal' },
                            { id: 'Spreadsheet', name: 'Spreadsheet' },
                          ].map(t => (
                            <div key={t.id} onClick={() => setFin(f => ({ ...f, quotationTemplate: t.id }))} style={{ border: fin.quotationTemplate === t.id ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 10, padding: 10, cursor: 'pointer', textAlign: 'center', backgroundColor: fin.quotationTemplate === t.id ? 'rgba(var(--accent-rgb), 0.05)' : 'transparent', transition: '0.2s', minWidth: 0 }}>
                               <div style={{ height: 160, background: '#f8fafc', borderRadius: 6, marginBottom: 8, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                  <div style={{ transform: 'scale(0.18)', transformOrigin: 'top center', pointerEvents: 'none', width: '210mm', height: '297mm', flexShrink: 0 }}>
                                     <DocumentTemplate data={{ ...sampleInv, template: t.id }} profile={biz} preview={true} type="Quotation" />
                                  </div>
                               </div>
                               <div style={{ fontSize: 12, fontWeight: 700 }}>{t.name}</div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>

                <div style={{ marginTop: 40, padding: 20, bgcolor: '#f8fafc', borderRadius: 12, border: '1px solid var(--border)' }}>
                   <div style={{ fontWeight: 700, marginBottom: 10 }}>💡 Pro Tip</div>
                   <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                      The <strong>Tax Invoice (GST)</strong> template is optimized for Indian GST compliance and A4 printing. It automatically splits IGST into CGST/SGST based on your business and client states.
                   </div>
                </div>
              </div>
            </div>
          )}

          {active === 'Reminders' && (
            <div className="tw">
              <div className="tw-head"><h3>Reminder Rules & Templates</h3><button className="btn btn-primary btn-sm" onClick={saveReminders}>Save Rules</button></div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {[
                    { key: 'amc', name: 'AMC Expiry Alert', desc: 'Alert sent before AMC contracts expire.' },
                    { key: 'followup', name: 'Follow-Up Due', desc: 'Alert sent before a lead follow-up is scheduled.' }
                  ].map(rule => (
                    <div key={rule.key} style={{ paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{rule.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{rule.desc}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="number" value={reminders[rule.key].days} onChange={e => setReminders(r => ({ ...r, [rule.key]: { ...r[rule.key], days: parseInt(e.target.value) || 0 } }))} style={{ width: 60, padding: '6px 8px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, textAlign: 'center' }} />
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>days before</span>
                          </div>
                          <button className="btn btn-secondary btn-sm" onClick={() => testTemplate(rule.key)} style={{ padding: '4px 10px' }}>👁 Test</button>
                        </div>
                      </div>
                      <div className="fg">
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>Message Template</label>
                        <textarea 
                          value={reminders[rule.key].msg} 
                          onChange={e => setReminders(r => ({ ...r, [rule.key]: { ...r[rule.key], msg: e.target.value } }))} 
                          style={{ minHeight: 60, fontSize: 13, lineHeight: 1.5 }}
                          placeholder="Type your message template here..."
                        />
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                          Placeholders: <code>{`{client}`}</code>, <code>{`{date}`}</code> {rule.key === 'sub' && <>, <code>{`{amount}`}</code></>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
