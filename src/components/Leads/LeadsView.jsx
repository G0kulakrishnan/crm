import React, { useState, useMemo, useRef, useEffect } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { fmtD, stageBadgeClass, uid } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const EMPTY_LEAD = { name: '', email: '', phone: '', source: '', stage: '', assign: '', followup: '', label: '', notes: '', remWA: false, remEmail: true, remSMS: false, custom: {} };

const DEFAULT_IMPORT_MAPPING = {
  name: { type: 'column', value: '' },
  email: { type: 'column', value: '' },
  phone: { type: 'column', value: '' },
  source: { type: 'fixed', value: '' },
  stage: { type: 'fixed', value: '' },
  label: { type: 'fixed', value: '' },
  assign: { type: 'fixed', value: '' },
  notes: { type: 'fixed', value: '' },
  followup: { type: 'fixed', value: '' }
};

export default function LeadsView({ user, perms, ownerId }) {
  const canCreate = perms?.can('Leads', 'create') !== false;
  const canEdit = perms?.can('Leads', 'edit') !== false;
  const canDelete = perms?.can('Leads', 'delete') !== false;

  const [view, setView] = useState('list'); // 'list' | 'kanban'
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [srcFilter, setSrcFilter] = useState('');
  const [stgFilter, setStgFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY_LEAD);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [colModal, setColModal] = useState(false);
  const [tempCols, setTempCols] = useState([]);
  const [tempStages, setTempStages] = useState([]);
  const [viewLead, setViewLead] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [dragOverStage, setDragOverStage] = useState(null);
  const [importMappingModal, setImportMappingModal] = useState(false);
  const [importMapping, setImportMapping] = useState(DEFAULT_IMPORT_MAPPING);
  const [importHeaders, setImportHeaders] = useState([]);
  const [importData, setImportData] = useState([]); // Raw rows from CSV
  const [importSample, setImportSample] = useState(null); // First data row for preview
  const dragLeadId = useRef(null);
  const toast = useToast();

  const { data, isLoading, error } = db.useQuery({
    leads: { $: { where: { userId: ownerId } } },
    teamMembers: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } },
    activityLogs: { $: { where: { userId: ownerId } } },
  });
  const team = data?.teamMembers || [];
  const activityLogs = data?.activityLogs || [];
  const customFields = data?.userProfiles?.[0]?.customFields || [];
  const disabledStages = data?.userProfiles?.[0]?.disabledStages || [];
  const wonStage = data?.userProfiles?.[0]?.wonStage || 'Won';
  const profileId = data?.userProfiles?.[0]?.id;
  const activeSources = data?.userProfiles?.[0]?.sources || ['FB Ads', 'Direct', 'Broker', 'Google Ads', 'Referral', 'WhatsApp', 'Website', 'Other'];
  const activeLabels = data?.userProfiles?.[0]?.labels || ['Hot', 'Warm', 'Cold', 'VIP', 'Pending'];
  const allStages = data?.userProfiles?.[0]?.stages || ['New Enquiry', 'Enquiry Contacted', 'Quotation Created', 'Quotation Sent', 'Invoice Created', 'Invoice Sent', 'Budget Negotiation', 'Advance Paid', 'Won', 'Lost'];
  
  console.log("🔍 [LeadsView] Props - ownerId:", ownerId, "perms:", perms?.isOwner ? "Owner" : "Team");
  console.log("📊 [LeadsView] Data - leadsRaw count:", data?.leads?.length || 0);

  const leads = useMemo(() => {
    const rawLeads = data?.leads || [];
    const isTeam = perms && !perms.isOwner;
    if (!isTeam) return rawLeads;
    
    return rawLeads.filter(l => {
      if (l.actorId === user.id || perms.isAdmin || perms.isManager) return true;
      const assignKey = (l.assign || '').toLowerCase().trim();
      const userName = (perms.name || '').toLowerCase().trim();
      const userEmail = (user.email || '').toLowerCase().trim();
      return (assignKey && userName && assignKey === userName) || (assignKey && userEmail && assignKey === userEmail);
    });
  }, [data?.leads, perms, user]);
  
  useEffect(() => {
    const openId = localStorage.getItem('tc_open_lead');
    if (openId && leads.length > 0) {
      const target = leads.find(l => l.id === openId);
      if (target) {
        setViewLead(target);
        localStorage.removeItem('tc_open_lead');
      }
    }
  }, [leads]);

  const savedCols = data?.userProfiles?.[0]?.leadCols;
  const allPossibleCols = ['Created', 'Phone', 'Source', 'Stage', 'Assigned', 'Follow Up', 'Label', 'Reminder', ...customFields.map(c => c.name)];
  const activeCols = savedCols || allPossibleCols;

  const savedLeadStages = data?.userProfiles?.[0]?.leadStages;   // visible subset saved from Leads colModal
  const activeStages = (savedLeadStages?.length > 0 ? savedLeadStages : allStages).filter(s => !disabledStages.includes(s));
  const isWon = (s) => s === wonStage;

  // Initialize EMPTY_LEAD values if empty
  useEffect(() => {
    if (form.source === '' && activeSources.length > 0) {
      setForm(prev => ({ ...prev, source: activeSources[0], stage: activeStages[0], label: activeLabels[0] }));
    }
  }, [activeSources, activeStages, activeLabels, form.source]);

  // Filtering
  const filtered = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toDateString();

    return leads.filter(l => {
      if (tab === 'today') {
        if (!l.followup) return false;
        return new Date(l.followup).toDateString() === todayStr;
      }
      if (tab === 'tomorrow') {
        if (!l.followup) return false;
        return new Date(l.followup).toDateString() === tomorrowStr;
      }
      if (tab === 'next7days') {
        if (!l.followup) return false;
        const d = new Date(l.followup); d.setHours(0,0,0,0);
        const n = new Date(now); n.setHours(0,0,0,0);
        const diffDays = Math.round((d - n) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      }
      if (tab === 'overdue') return l.followup && new Date(l.followup) < now;
      return true;
    })
      .filter(l => !savedLeadStages || savedLeadStages.length === 0 || savedLeadStages.includes(l.stage))
      .filter(l => !srcFilter || l.source === srcFilter)
      .filter(l => !stgFilter || l.stage === stgFilter)
      .filter(l => {
        if (!search) return true;
        const q = search.toLowerCase();
        return [l.name, l.email, l.phone, l.source, l.stage, l.assign, l.label, l.notes].some(v => (v || '').toLowerCase().includes(q));
      });
  }, [leads, tab, srcFilter, stgFilter, search]);

  const overdueCount = leads.filter(l => l.followup && new Date(l.followup) < new Date()).length;
  const todayCount = leads.filter(l => l.followup && new Date(l.followup).toDateString() === new Date().toDateString()).length;
  const tomorrowCount = leads.filter(l => {
    if (!l.followup) return false;
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return new Date(l.followup).toDateString() === t.toDateString();
  }).length;
  const next7Count = leads.filter(l => {
    if (!l.followup) return false;
    const d = new Date(l.followup); d.setHours(0,0,0,0);
    const n = new Date(); n.setHours(0,0,0,0);
    const diff = Math.round((d - n) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  }).length;

  const openCreate = () => { 
    setEditData(null); 
    setForm({ 
      ...EMPTY_LEAD, 
      source: activeSources[0] || '', 
      stage: activeStages[0] || '', 
      label: activeLabels[0] || '' 
    }); 
    setModal(true); 
  };
  const openEdit = (l) => { 
    setEditData(l); 
    setForm({ name: l.name, email: l.email || '', phone: l.phone || '', source: l.source || activeSources[0], stage: l.stage || activeStages[0], assign: l.assign || '', followup: l.followup || '', label: l.label || activeLabels[0], notes: l.notes || '', remWA: l.remWA || false, remEmail: l.remEmail !== false, remSMS: l.remSMS || false, custom: l.custom || {} }); 
    setModal(true); 
  };

  const logActivity = async (leadId, text) => {
    await db.transact(db.tx.activityLogs[id()].update({
      entityId: leadId,
      entityType: 'lead',
      text,
      userId: ownerId,
      actorId: user.id, // Track who actually did it
      userName: user.email,
      createdAt: Date.now()
    }));
  };

  const saveLead = async () => {
    if (!form.name.trim()) { toast('Name is required', 'error'); return; }
    try {
      if (editData) {
        const changes = [];
        const fields = { name: 'Name', phone: 'Phone', email: 'Email', source: 'Source', stage: 'Stage', assign: 'Assignee', followup: 'Follow Up', label: 'Label', notes: 'Notes' };
        Object.entries(fields).forEach(([k, label]) => {
          if (editData[k] !== form[k]) {
            const oldVal = editData[k] || 'None';
            const newVal = form[k] || 'None';
            changes.push(`${label} changed from "${oldVal}" to "${newVal}"`);
          }
        });

        // Custom fields check
        const oldCustom = editData.custom || {};
        const newCustom = form.custom || {};
        customFields.forEach(cf => {
          if (oldCustom[cf.name] !== newCustom[cf.name]) {
            changes.push(`${cf.name} (Custom) changed from "${oldCustom[cf.name] || 'None'}" to "${newCustom[cf.name] || 'None'}"`);
          }
        });
        
        await db.transact(db.tx.leads[editData.id].update({ ...form, userId: ownerId, actorId: user.id, updatedAt: Date.now() }));
        
        if (changes.length > 0) {
          await logActivity(editData.id, changes.join(' | '));
        }
        
        toast('Lead updated!', 'success');
      } else {
        const newId = id();
        await db.transact(db.tx.leads[newId].update({ ...form, userId: ownerId, actorId: user.id, createdAt: Date.now() }));
        await logActivity(newId, 'Lead created');
        toast(`Lead "${form.name}" created!`, 'success');
      }
      setModal(false);
    } catch (e) { toast('Error saving lead', 'error'); }
  };

  const deleteLead = async (leadId) => {
    if (!confirm('Delete this lead?')) return;
    await db.transact(db.tx.leads[leadId].delete());
    toast('Lead deleted', 'error');
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return toast('CSV is empty or missing data', 'error');
      
      const parseLine = (line) => {
        const row = [];
        let cur = '', inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') inQuotes = !inQuotes;
          else if (line[i] === ',' && !inQuotes) { row.push(cur); cur = ''; }
          else cur += line[i];
        }
        row.push(cur);
        return row.map(v => v.trim().replace(/^"|"$/g, ''));
      };

      const headers = parseLine(lines[0]);
      setImportHeaders(headers);
      setImportData(lines.slice(1).map(parseLine));
      setImportSample(parseLine(lines[1]));

      // Auto-mapping
      const newMapping = JSON.parse(JSON.stringify(DEFAULT_IMPORT_MAPPING));
      headers.forEach(h => {
        const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        Object.keys(newMapping).forEach(field => {
          const cleanF = field.toLowerCase();
          if (cleanH === cleanF || cleanH.includes(cleanF) || cleanF.includes(cleanH)) {
            if (newMapping[field].type === 'column' && !newMapping[field].value) {
              newMapping[field].value = h;
            }
          }
        });
      });
      setImportMapping(newMapping);
      setImportMappingModal(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const performImport = async () => {
    if (!importMapping.name.value && importMapping.name.type === 'column') return toast('Please map the Name field', 'error');
    
    const toAdd = [];
    let skipped = 0;

    importData.forEach(vals => {
      const lead = {
        userId: ownerId,
        actorId: user.id,
        createdAt: Date.now(),
        custom: {}
      };

      Object.entries(importMapping).forEach(([field, m]) => {
        let val = '';
        if (m.type === 'column') {
          const idx = importHeaders.indexOf(m.value);
          if (idx !== -1) val = vals[idx] || '';
        } else {
          val = m.value;
        }

        if (['name', 'email', 'phone', 'source', 'stage', 'label', 'notes', 'followup', 'assign'].includes(field)) {
          lead[field] = val;
        } else {
          lead.custom[field] = val;
        }
      });

      if (!lead.name) return;

      const exists = leads.find(l => 
        (lead.email && l.email === lead.email) || (lead.phone && l.phone === lead.phone)
      );
      if (exists) { skipped++; return; }

      toAdd.push(lead);
    });

    if (toAdd.length === 0) {
      setImportMappingModal(false);
      return toast(`No new leads imported. Skipped ${skipped} duplicates.`, 'warning');
    }

    try {
      const batchSize = 50;
      for (let i = 0; i < toAdd.length; i += batchSize) {
        const batch = toAdd.slice(i, i + batchSize);
        await db.transact(batch.map(ld => db.tx.leads[id()].update(ld)));
      }
      toast(`Imported ${toAdd.length} leads. ${skipped > 0 ? `Skipped ${skipped} duplicates.` : ''}`, 'success');
      setImportMappingModal(false);
    } catch (err) {
      toast('Error importing leads', 'error');
    }
  };

  const bulkDelete = async () => {
    if (!selectedIds.size || !confirm(`Delete ${selectedIds.size} leads?`)) return;
    await Promise.all([...selectedIds].map(lid => db.transact(db.tx.leads[lid].delete())));
    setSelectedIds(new Set());
    toast(`${selectedIds.size} leads deleted`, 'error');
  };

  const bulkAssign = async (memberName) => {
    if (!selectedIds.size || !memberName) return;
    await Promise.all([...selectedIds].map(async lid => {
      await db.transact(db.tx.leads[lid].update({ assign: memberName }));
      await logActivity(lid, `Bulk assigned to ${memberName}`);
    }));
    setSelectedIds(new Set());
    toast(`Assigned ${selectedIds.size} leads to ${memberName}`, 'success');
  };

  const bulkStage = async (newStage) => {
    if (!selectedIds.size || !newStage) return;
    await Promise.all([...selectedIds].map(async lid => {
      await db.transact(db.tx.leads[lid].update({ stage: newStage }));
      await logActivity(lid, `Bulk status changed to ${newStage}`);
    }));
    setSelectedIds(new Set());
    toast(`Moved ${selectedIds.size} leads to ${newStage}`, 'success');
  };

  const convertToCustomer = async (l) => {
    if (!confirm(`Convert ${l.name} to a Customer?`)) return;
    try {
      const payload = {
        name: l.name,
        email: l.email || '',
        phone: l.phone || '',
        userId: ownerId,
        createdAt: Date.now()
      };
      // Assuming 'lMatch' refers to 'l' from the function parameter, and 'data' is available in scope.
      // If 'data' is not available, this will cause a runtime error.
      await db.transact([
        db.tx.customers[id()].update(payload),
        db.tx.leads[l.id].update({ 
           stage: (data?.userProfiles?.[0]?.wonStage || 'Won'), // use wonStage from profile if possible, it's defined in the component
           email: l.email || '',
           phone: l.phone || ''
        }),
        db.tx.activityLogs[id()].update({
           entityId: l.id, entityType: 'lead', text: `Manually converted to Customer. Stage changed to ${(data?.userProfiles?.[0]?.wonStage || 'Won')}.`,
           userId: ownerId, actorId: user.id, userName: user.email, createdAt: Date.now()
        })
      ]);
      toast(`${l.name} is now a Customer!`, 'success');
    } catch {
      toast('Error converting to customer', 'error');
    }
  };

  const saveViewConfig = async (colsToSave, stagesVisible) => {
    if (profileId) {
      await db.transact(db.tx.userProfiles[profileId].update({ leadCols: colsToSave, leadStages: stagesVisible }));
    } else {
      await db.transact(db.tx.userProfiles[id()].update({ leadCols: colsToSave, leadStages: stagesVisible, userId: ownerId }));
    }
    setColModal(false);
    toast('View configuration saved', 'success');
  };

  const resetViewConfig = () => saveViewConfig(allPossibleCols, allStages);

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const cf = (k) => (e) => setForm(p => ({ ...p, custom: { ...(p.custom || {}), [k]: e.target.value } }));

  if (error) return <div className="p-xl text-red-500">Error loading leads: {error.message}</div>;
  if (isLoading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
      <div className="spinner" style={{ margin: '0 auto 10px', borderColor: 'var(--muted)', borderTopColor: 'transparent' }} />
      Loading leads...
    </div>
  );

  if (viewLead) {
    const l = viewLead;
    const lLogs = activityLogs.filter(log => log.entityId === l.id).sort((a,b) => b.createdAt - a.createdAt);

    const addNote = async () => {
      if (!noteText.trim()) return;
      await logActivity(l.id, noteText.trim());
      setNoteText('');
      toast('Note added', 'success');
    };

    return (
      <div>
        <div className="sh" style={{ marginBottom: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-icon" onClick={() => setViewLead(null)}>← Back</button>
            <div>
              <h2 style={{ fontSize: 24, margin: 0 }}>{l.name}</h2>
              <div className="sub" style={{ fontSize: 13, marginTop: 4 }}>
                {l.email && <span style={{ marginRight: 15 }}>✉ {l.email}</span>}
                {l.phone && <span>☏ {l.phone}</span>}
                <span className={`badge ${stageBadgeClass(l.stage, wonStage)}`} style={{ marginLeft: 15 }}>{l.stage}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {l.phone && (
                  <>
                    <a href={`tel:${l.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', textDecoration: 'none' }} title="Call">
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </a>
                    <a href={`https://wa.me/${l.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: '#e8fdf0', color: '#16a34a', textDecoration: 'none' }} title="WhatsApp">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                    </a>
                    <a href={`sms:${l.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: '#f5f3ff', color: '#7c3aed', textDecoration: 'none' }} title="SMS">
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </a>
                  </>
                )}
                {l.email && (
                  <a href={`mailto:${l.email}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: '#f3f4f6', color: '#4b5563', textDecoration: 'none' }} title="Email">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </a>
                )}
              </div>
            </div>
          </div>
          {canEdit && <button className="btn btn-secondary btn-sm" onClick={() => openEdit(l)}>Edit Lead</button>}
        </div>

        <div className="stat-grid" style={{ marginBottom: 25 }}>
          <div className="stat-card sc-blue"><div className="lbl">Source</div><div className="val" style={{ fontSize: 16 }}>{l.source}</div></div>
          <div className="stat-card sc-green"><div className="lbl">Assigned To</div><div className="val" style={{ fontSize: 16 }}>{l.assign || 'Unassigned'}</div></div>
          <div className="stat-card sc-yellow"><div className="lbl">Label</div><div className="val" style={{ fontSize: 16 }}>{l.label}</div></div>
          <div className="stat-card sc-purple"><div className="lbl">Follow Up</div><div className="val" style={{ fontSize: 14 }}>{l.followup ? fmtD(l.followup) : 'None'}</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="tw" style={{ padding: 20 }}>
            <h3>Lead Details</h3>
            <div style={{ marginTop: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {customFields.map(cf => (
                <div key={cf.name} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{cf.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{l.custom?.[cf.name] || '-'}</span>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Internal Notes</span>
                <div style={{ fontSize: 13, background: 'var(--bg)', padding: 12, borderRadius: 8, minHeight: 60 }}>{l.notes || 'No notes provided during creation.'}</div>
              </div>
            </div>
          </div>

          <div className="tw" style={{ padding: 20 }}>
            <h3>Activity Logs & Timeline</h3>
            <div style={{ marginTop: 15 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Type a note or record an activity..." style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
                <button className="btn btn-primary btn-sm" onClick={addNote}>Post</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
                {lLogs.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 20 }}>No activity recorded yet in timeline.</div> : 
                  lLogs.map(log => (
                    <div key={log.id} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{log.userName}</span>
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#444' }}>
                          {log.text?.split('\n').map((line, i) => (
                            <div key={i} style={{ marginBottom: line ? 2 : 0 }}>
                              {line.split('**').map((part, j) => 
                                j % 2 === 1 ? <mark key={j} style={{ background: '#fef08a', color: '#854d0e', padding: '0 4px', borderRadius: 4, fontWeight: 600 }}>{part}</mark> : part
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>

        {modal && (
          <div className="mo open">
            <div className="mo-box">
              <div className="mo-head">
                <h3>Edit Lead</h3>
                <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
              </div>
              <div className="mo-body">
                <div className="fgrid">
                  <div className="fg"><label>Name *</label><input value={form.name} onChange={f('name')} placeholder="Full name" /></div>
                  <div className="fg"><label>Phone</label><input value={form.phone} onChange={f('phone')} placeholder="+91..." /></div>
                  <div className="fg"><label>Email</label><input type="email" value={form.email} onChange={f('email')} /></div>
                  <div className="fg"><label>Source</label>
                    <select value={form.source} onChange={f('source')}>
                      {activeSources.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label>Stage</label>
                    <select value={form.stage} onChange={f('stage')}>
                      {activeStages.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label>Assign To</label>
                    <select value={form.assign} onChange={f('assign')}>
                      <option value="">Unassigned</option>
                      {team.map(t => <option key={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label>Follow Up</label><input type="datetime-local" value={form.followup} onChange={f('followup')} /></div>
                  <div className="fg"><label>Label</label>
                    <select value={form.label} onChange={f('label')}>
                      {activeLabels.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="fg span2"><label>Notes</label><textarea value={form.notes} onChange={f('notes')} /></div>
                </div>
              </div>
              <div className="mo-foot">
                <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveLead}>Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sh">
        <div><h2>Leads</h2><div className="sub">Manage and track all leads</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('list')}>☰ List</button>
          <button className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('kanban')}>⊞ Kanban</button>
          {canCreate && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('bulk-import').click()}>⇪ Bulk Import</button>
              <input type="file" id="bulk-import" accept=".csv" style={{ display: 'none' }} onChange={handleBulkImport} />
            </>
          )}
          {canCreate && <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Create Lead</button>}
        </div>
      </div>

      <div className="tabs">
        {[
          ['all', `All (${leads.length})`],
          ['today', `Today (${todayCount})`],
          ['tomorrow', `Tomorrow (${tomorrowCount})`],
          ['next7days', `Next 7 Days (${next7Count})`],
          ['overdue', `Overdue (${overdueCount})`]
        ].map(([t, label]) => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{label}</div>
        ))}
      </div>

      {view === 'list' ? (
        <div>
          {/* Bulk Bar */}
          {selectedIds.size > 0 && (
            <div className="bulk-bar" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{selectedIds.size} selected</span>
              <select style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} onChange={e => { bulkAssign(e.target.value); e.target.value = ''; }}>
                <option value="">Assign To...</option>
                {team.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              <select style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} onChange={e => { bulkStage(e.target.value); e.target.value = ''; }}>
                <option value="">Change Stage...</option>
                {activeStages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {canDelete && <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={bulkDelete}>🗑 Delete Selected</button>}
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(new Set())}>✕ Clear</button>
            </div>
          )}

          {/* Table */}
          <div className="tw">
            <div className="tw-head">
              <h3>All Leads ({filtered.length})</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div className="sw">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input className="si" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="si" style={{ width: 130 }} value={srcFilter} onChange={e => setSrcFilter(e.target.value)}>
                  <option value="">All Sources</option>
                  {activeSources.map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="si" style={{ width: 130 }} value={stgFilter} onChange={e => setStgFilter(e.target.value)}>
                  <option value="">All Stages</option>
                  {allStages.map(s => <option key={s}>{s}</option>)}
                </select>
                <button className="btn btn-secondary btn-sm" onClick={() => { setTempCols(activeCols); setTempStages(activeStages); setColModal(true); }}>⚙ Configure View</button>
              </div>
            </div>
            <div className="tw-scroll">
              <table style={{ minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}><input type="checkbox" onChange={e => { if (e.target.checked) setSelectedIds(new Set(filtered.map(l => l.id))); else setSelectedIds(new Set()); }} /></th>
                    <th>#</th>
                    <th>Name</th>
                    {activeCols.includes('Created') && <th>Created</th>}
                    {activeCols.includes('Phone') && <th>Phone</th>}
                    {activeCols.includes('Source') && <th>Source</th>}
                    {activeCols.includes('Stage') && <th>Stage</th>}
                    {activeCols.includes('Assigned') && <th>Assigned</th>}
                    {activeCols.includes('Follow Up') && <th>Follow Up</th>}
                    {activeCols.includes('Label') && <th>Label</th>}
                    {activeCols.includes('Reminder') && <th>Reminder</th>}
                    {customFields.filter(cf => activeCols.includes(cf.name)).map(cf => <th key={cf.name}>{cf.name}</th>)}
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No leads found</td></tr>
                ) : filtered.map((l, i) => (
                  <tr key={l.id}>
                    <td><input type="checkbox" checked={selectedIds.has(l.id)} onChange={e => { const s = new Set(selectedIds); e.target.checked ? s.add(l.id) : s.delete(l.id); setSelectedIds(s); }} style={{ width: 14, height: 14, accentColor: 'var(--accent)' }} /></td>
                    <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                    <td>
                      <strong>{l.name}</strong>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{l.email}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {l.phone && (
                          <>
                            <a href={`tel:${l.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', textDecoration: 'none' }} title="Call">
                              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </a>
                            <a href={`https://wa.me/${l.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#e8fdf0', color: '#16a34a', textDecoration: 'none' }} title="WhatsApp">
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                            </a>
                            <a href={`sms:${l.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#f5f3ff', color: '#7c3aed', textDecoration: 'none' }} title="SMS">
                              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            </a>
                          </>
                        )}
                        {l.email && (
                          <a href={`mailto:${l.email}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#f3f4f6', color: '#4b5563', textDecoration: 'none' }} title="Email">
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                          </a>
                        )}
                      </div>
                    </td>
                    {activeCols.includes('Created') && <td style={{ fontSize: 11 }}>{l.createdAt ? fmtD(l.createdAt) : '-'}</td>}
                    {activeCols.includes('Phone') && <td style={{ fontSize: 12 }}>{l.phone || '-'}</td>}
                    {activeCols.includes('Source') && <td><span style={{ fontSize: 11 }}>{l.source}</span></td>}
                    {activeCols.includes('Stage') && <td><span className={`badge ${stageBadgeClass(l.stage, wonStage)}`}>{l.stage}</span></td>}
                    {activeCols.includes('Assigned') && <td style={{ fontSize: 12 }}>{l.assign || <span style={{ color: 'var(--muted)' }}>-</span>}</td>}
                    {activeCols.includes('Follow Up') && <td style={{ fontSize: 11 }}>{l.followup ? fmtD(l.followup) : '-'}</td>}
                    {activeCols.includes('Label') && <td><span className="badge bg-gray" style={{ fontSize: 10 }}>{l.label || '-'}</span></td>}
                    {activeCols.includes('Reminder') && <td>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {l.remWA && <span style={{ fontSize: 10, background: '#e8fdf0', color: '#25d366', borderRadius: 20, padding: '2px 6px', fontWeight: 700 }}>WA</span>}
                        {l.remEmail !== false && <span style={{ fontSize: 10, background: '#eff6ff', color: '#2563eb', borderRadius: 20, padding: '2px 6px', fontWeight: 700 }}>Mail</span>}
                        {l.remSMS && <span style={{ fontSize: 10, background: '#f5f3ff', color: '#7c3aed', borderRadius: 20, padding: '2px 6px', fontWeight: 700 }}>SMS</span>}
                      </div>
                    </td>}
                    {customFields.filter(cf => activeCols.includes(cf.name)).map(cf => (
                      <td key={cf.name} style={{ fontSize: 11 }}>{l.custom?.[cf.name] || '-'}</td>
                    ))}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setViewLead(l)}>View</button>
                        <button className="btn-icon" onClick={(e) => {
                          const dm = e.currentTarget.nextElementSibling;
                          document.querySelectorAll('.dd-menu').forEach(el => el !== dm && (el.style.display = 'none'));
                          dm.style.display = dm.style.display === 'block' ? 'none' : 'block';
                        }}>⋮</button>
                        <div className="dd-menu" style={{ display: 'none', position: 'absolute', right: 0, top: 28, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, width: 160, overflow: 'hidden', textAlign: 'left' }}>
                          {canEdit && <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { openEdit(l); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>✎ Edit</div>}
                          {canEdit && <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { convertToCustomer(l); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>👤 Convert to Customer</div>}
                          {canDelete && <div style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#dc2626' }} onClick={() => { deleteLead(l.id); document.querySelectorAll('.dd-menu').forEach(el => el.style.display = 'none'); }}>🗑 Delete</div>}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      ) : (
        /* KANBAN */
        <div className="kanban">
          {activeStages.map(stage => {
            const cards = filtered.filter(l => l.stage === stage);
            const isOver = dragOverStage === stage;
            return (
              <div
                key={stage}
                className="kb-col"
                style={{ background: isOver ? 'rgba(99,102,241,0.06)' : undefined, outline: isOver ? '2px dashed var(--accent)' : undefined, borderRadius: 8, transition: 'background 0.15s' }}
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={async e => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const lid = dragLeadId.current;
                  if (!lid) return;
                  const lead = leads.find(l => l.id === lid);
                  if (!lead || lead.stage === stage) return;
                  await db.transact(db.tx.leads[lid].update({ stage }));
                  await logActivity(lid, `Stage changed from "${lead.stage}" to "${stage}" (drag & drop)`);
                  toast(`Moved to ${stage}`, 'success');
                }}
              >
                <div className="kb-col-head">{stage} <span>{cards.length}</span></div>
                {cards.map(l => (
                  <div
                    key={l.id}
                    className="kb-card"
                    draggable
                    onDragStart={e => { dragLeadId.current = l.id; e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { dragLeadId.current = null; setDragOverStage(null); }}
                    style={{ cursor: 'grab' }}
                  >
                    <div className="nm" onClick={() => openEdit(l)} style={{ cursor: 'pointer' }}>{l.name}</div>
                    <div className="mt" style={{ marginBottom: 4 }}>{l.source} · {l.phone || '-'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {l.phone && (
                        <>
                          <a href={`tel:${l.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', textDecoration: 'none' }} title="Call">
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          </a>
                          <a href={`https://wa.me/${l.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#e8fdf0', color: '#16a34a', textDecoration: 'none' }} title="WhatsApp">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                          </a>
                          <a href={`sms:${l.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#f5f3ff', color: '#7c3aed', textDecoration: 'none' }} title="SMS">
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                          </a>
                        </>
                      )}
                      {l.email && (
                        <a href={`mailto:${l.email}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#f3f4f6', color: '#4b5563', textDecoration: 'none' }} title="Email">
                          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        </a>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 7, flexWrap: 'wrap' }}>
                      {canEdit && <button className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => openEdit(l)}>Edit</button>}
                      {canEdit && <button className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => convertToCustomer(l)}>→ Customer</button>}
                      {canDelete && <button className="btn btn-sm" style={{ fontSize: 10, padding: '2px 6px', background: '#fee2e2', color: '#991b1b' }} onClick={() => deleteLead(l.id)}>Del</button>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div className="mo open">
          <div className="mo-box">
            <div className="mo-head">
              <h3>{editData ? 'Edit Lead' : 'Create Lead'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg"><label>Name *</label><input value={form.name} onChange={f('name')} placeholder="Full name" /></div>
                <div className="fg"><label>Phone</label><input value={form.phone} onChange={f('phone')} placeholder="+91..." /></div>
                <div className="fg"><label>Email</label><input type="email" value={form.email} onChange={f('email')} /></div>
                <div className="fg"><label>Source</label>
                  <select value={form.source} onChange={f('source')}>
                    {activeSources.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Stage</label>
                  <select value={form.stage} onChange={f('stage')}>
                    {activeStages.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Assign To</label>
                  <select value={form.assign} onChange={f('assign')}>
                    <option value="">Unassigned</option>
                    {team.map(t => <option key={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Follow Up</label><input type="datetime-local" value={form.followup} onChange={f('followup')} /></div>
                <div className="fg"><label>Label</label>
                  <select value={form.label} onChange={f('label')}>
                    {activeLabels.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="fg span2"><label>Notes</label><textarea value={form.notes} onChange={f('notes')} /></div>
                
                {/* Dynamic Custom Fields */}
                {customFields.length > 0 && <div className="fg span2" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}><h4 style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Custom Fields</h4><div className="fgrid">
                  {customFields.map(field => (
                    <div key={field.name} className="fg">
                      <label>{field.name}</label>
                      {field.type === 'dropdown' ? (
                        <select value={form.custom[field.name] || ''} onChange={cf(field.name)}>
                          <option value="">Select...</option>
                          {field.options.split(',').map(o => <option key={o.trim()}>{o.trim()}</option>)}
                        </select>
                      ) : (
                        <input type={field.type === 'number' ? 'number' : 'text'} value={form.custom[field.name] || ''} onChange={cf(field.name)} />
                      )}
                    </div>
                  ))}
                </div></div>}

                <div className="fg span2">
                  <label>Reminder Channels</label>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 6, padding: 12, background: 'var(--bg)', borderRadius: 8, flexWrap: 'wrap' }}>
                    {[['remWA', 'WhatsApp', '#25d366'], ['remEmail', 'Email', '#3b82f6'], ['remSMS', 'SMS', '#8b5cf6']].map(([k, label, color]) => (
                      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                        <input type="checkbox" checked={form[k]} onChange={f(k)} style={{ width: 15, height: 15, accentColor: color }} />
                        <span style={{ color }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveLead}>Save Lead</button>
            </div>
          </div>
        </div>
      )}

      {/* BULK IMPORT MAPPING MODAL */}
      {importMappingModal && (
        <div className="mo open">
          <div className="mo-box" style={{ width: 680 }}>
            <div className="mo-head">
              <h3>Bulk Import Column Mapping</h3>
              <button className="btn-icon" onClick={() => setImportMappingModal(false)}>✕</button>
            </div>
            <div className="mo-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '0 25px' }}>
              <div style={{ padding: '15px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 15, alignItems: 'center' }}>
                <div style={{ background: '#ecfdf5', color: '#065f46', padding: '8px 12px', borderRadius: 8, fontSize: 12, flex: 1 }}>
                  <strong>{importData.length} leads detected.</strong> Select which CSV column matches each CRM field below.
                </div>
              </div>

              {[
                { label: 'Name', icon: '👤', field: 'name' },
                { label: 'Email', icon: '📧', field: 'email' },
                { label: 'Phone', icon: '📱', field: 'phone' },
                { label: 'Source', icon: '🔗', field: 'source', options: activeSources },
                { label: 'Stage', icon: '📋', field: 'stage', options: allStages },
                { label: 'Label', icon: '🏷️', field: 'label', options: activeLabels },
                { label: 'Assigned To', icon: '👤', field: 'assign', options: team.map(t => t.name) },
                { label: 'Notes', icon: '📝', field: 'notes' },
                { label: 'Follow-up Date', icon: '📅', field: 'followup', type: 'datetime-local' }
              ].map(row => {
                const m = importMapping[row.field];
                const setM = (val) => setImportMapping({ ...importMapping, [row.field]: { ...m, ...val } });
                
                return (
                  <div key={row.field} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--bg-soft)', gap: 20 }}>
                    <div style={{ width: 140, display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 16 }}>{row.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{row.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{row.field === 'name' ? 'Required' : 'Optional'}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', background: 'var(--bg-soft)', borderRadius: 6, padding: 2 }}>
                       <button className={`btn-toggle ${m.type === 'column' ? 'active' : ''}`} onClick={() => setM({ type: 'column' })}>Column</button>
                       <button className={`btn-toggle ${m.type === 'fixed' ? 'active' : ''}`} onClick={() => setM({ type: 'fixed' })}>Fixed</button>
                    </div>

                    {m.type === 'column' ? (
                      <select style={{ flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }} value={m.value} onChange={e => setM({ value: e.target.value })}>
                        <option value="">(Select Column)</option>
                        {importHeaders.map((h, idx) => (
                           <option key={idx} value={h}>{h} {importSample?.[idx] ? `(e.g. ${importSample[idx]})` : ''}</option>
                        ))}
                      </select>
                    ) : (
                      row.options ? (
                        <select style={{ flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }} value={m.value} onChange={e => setM({ value: e.target.value })}>
                          <option value="">(None)</option>
                          {row.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={row.type || 'text'} style={{ flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }} value={m.value} onChange={e => setM({ value: e.target.value })} placeholder="Fixed value..." />
                      )
                    )}
                  </div>
                );
              })}

              {/* Custom Fields Mapping */}
              {customFields.length > 0 && (
                <div style={{ marginTop: 15, borderTop: '2px solid var(--bg-soft)', paddingTop: 15 }}>
                  <h4 style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase' }}>Custom Fields</h4>
                  {customFields.map(cf => {
                    const m = importMapping[cf.name] || { type: 'column', value: '' };
                    const setM = (val) => setImportMapping({ ...importMapping, [cf.name]: { ...m, ...val } });

                    return (
                      <div key={cf.name} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--bg-soft)', gap: 20 }}>
                        <div style={{ width: 140, fontWeight: 600, fontSize: 12 }}>{cf.name}</div>
                        
                        <div style={{ display: 'flex', background: 'var(--bg-soft)', borderRadius: 6, padding: 2 }}>
                           <button className={`btn-toggle ${m.type === 'column' ? 'active' : ''}`} onClick={() => setM({ type: 'column' })}>Column</button>
                           <button className={`btn-toggle ${m.type === 'fixed' ? 'active' : ''}`} onClick={() => setM({ type: 'fixed' })}>Fixed</button>
                        </div>

                        {m.type === 'column' ? (
                          <select style={{ flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }} value={m.value} onChange={e => setM({ value: e.target.value })}>
                            <option value="">(Select Column)</option>
                            {importHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                          </select>
                        ) : (
                          <input type="text" style={{ flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }} value={m.value} onChange={e => setM({ value: e.target.value })} placeholder="Fixed value..." />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setImportMappingModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={performImport}>Complete Import</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .btn-toggle { border: none; background: transparent; padding: 4px 10px; font-size: 10px; font-weight: 700; cursor: pointer; border-radius: 4px; color: var(--muted); }
        .btn-toggle.active { background: #fff; color: var(--accent); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      `}</style>
      {colModal && (
        <div className="mo open">
          <div className="mo-box" style={{ width: 480 }}>
            <div className="mo-head">
              <h3>Configure View</h3>
              <button className="btn-icon" onClick={() => setColModal(false)}>✕</button>
            </div>
            <div className="mo-body" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '60vh', overflowY: 'auto' }}>

              {/* Visible Stages */}
              <div>
                <strong style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12, display: 'block' }}>Visible Stages</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {allStages.map(s => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={tempStages.includes(s)} onChange={e => {
                        if (e.target.checked) setTempStages([...tempStages, s]);
                        else setTempStages(tempStages.filter(x => x !== s));
                      }} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              {/* Visible Columns */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <strong style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12, display: 'block' }}>Visible Columns</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {allPossibleCols.map(c => (
                    <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={tempCols.includes(c)} onChange={e => {
                        if (e.target.checked) setTempCols([...tempCols, c]);
                        else setTempCols(tempCols.filter(x => x !== c));
                      }} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>

            </div>
            <div className="mo-foot" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-secondary btn-sm" onClick={resetViewConfig}>Reset to Default</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setColModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={() => saveViewConfig(tempCols, tempStages)}>Save View</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
