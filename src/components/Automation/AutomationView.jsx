import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useToast } from '../../context/ToastContext';
import { uid } from '../../utils/helpers';

const TRIGGER_TYPES = [
  { id: 'trig-lead', label: 'New Lead Created', desc: 'When a new lead is added', icon: '👤', color: '#3b82f6' },
  { id: 'trig-stage', label: 'Lead Stage Changed', desc: 'When stage is updated', icon: '🔄', color: '#8b5cf6' },
  { id: 'trig-followup', label: 'Follow-Up Due', desc: 'Reminder date reached', icon: '⏰', color: '#f59e0b' },
  { id: 'trig-amc', label: 'AMC Expiring', desc: 'Contract within 30 days', icon: '🛡', color: '#ef4444' },
  { id: 'trig-payment', label: 'Payment Due', desc: 'Subscription payment due', icon: '💰', color: '#14b8a6' },
];

const ACTION_TYPES = [
  { id: 'act-email', label: 'Send Email', desc: 'Send automated email', icon: '📧', color: '#3b82f6' },
  { id: 'act-wa', label: 'Send WhatsApp', desc: 'Send WhatsApp message', icon: '💬', color: '#25d366' },
  { id: 'act-sms', label: 'Send SMS', desc: 'Send text message', icon: '📱', color: '#8b5cf6' },
  { id: 'act-notif', label: 'Notify Team', desc: 'Send in-app notification', icon: '🔔', color: '#f59e0b' },
  { id: 'act-stage', label: 'Update Lead Stage', desc: 'Automatically move stage', icon: '⬆', color: '#14b8a6' },
];

const TEMPLATES = [
  { name: 'New Lead Welcome', trigger: 'trig-lead', action: 'act-email', desc: 'Auto-email when a lead is created' },
  { name: 'Follow-Up Reminder', trigger: 'trig-followup', action: 'act-wa', desc: 'WhatsApp reminder on follow-up date' },
  { name: 'AMC Expiry Alert', trigger: 'trig-amc', action: 'act-email', desc: 'Email client 30 days before AMC expires' },
  { name: 'Payment Reminder', trigger: 'trig-payment', action: 'act-wa', desc: 'WhatsApp payment reminder' },
];

export default function AutomationView({ user, ownerId }) {
  const [tab, setTab] = useState('flows');
  const [modal, setModal] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [selectedTrig, setSelectedTrig] = useState(null);
  const [selectedAct, setSelectedAct] = useState(null);
  const [step, setStep] = useState(1); // 1=name, 2=trigger, 3=action
  const toast = useToast();

  const { data } = db.useQuery({ automations: { $: { where: { userId: ownerId } } } });
  const automations = data?.automations || [];

  const saveFlow = async () => {
    if (!flowName || !selectedTrig || !selectedAct) { toast('Please complete all steps', 'error'); return; }
    await db.transact(db.tx.automations[id()].update({
      name: flowName, trigger: selectedTrig, action: selectedAct,
      active: true, userId: ownerId, createdAt: Date.now(),
    }));
    toast(`Automation "${flowName}" created!`, 'success');
    setModal(false); setFlowName(''); setSelectedTrig(null); setSelectedAct(null); setStep(1);
  };

  const toggleFlow = async (a) => {
    await db.transact(db.tx.automations[a.id].update({ active: !a.active }));
    toast(`Flow ${a.active ? 'paused' : 'activated'}`, a.active ? 'warning' : 'success');
  };

  const del = async (aid) => { if (!confirm('Delete?')) return; await db.transact(db.tx.automations[aid].delete()); toast('Deleted', 'error'); };

  const trigLabel = (tid) => TRIGGER_TYPES.find(t => t.id === tid)?.label || tid;
  const actLabel = (aid) => ACTION_TYPES.find(a => a.id === aid)?.label || aid;

  const applyTemplate = (tpl) => {
    setFlowName(tpl.name); setSelectedTrig(tpl.trigger); setSelectedAct(tpl.action); setStep(1); setModal(true);
  };

  return (
    <div>
      <div className="sh"><div><h2>Automation</h2><div className="sub">Automate follow-ups, alerts, and actions</div></div>
        <button className="btn btn-primary btn-sm" onClick={() => { setFlowName(''); setSelectedTrig(null); setSelectedAct(null); setStep(1); setModal(true); }}>+ Create Flow</button>
      </div>
      <div className="tabs">
        {[['flows', 'My Flows'], ['templates', 'Templates']].map(([t, l]) => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{l}</div>
        ))}
      </div>

      {tab === 'flows' ? (
        <div>
          {automations.length === 0 ? (
            <div className="empty-state"><div className="icon">⚡</div><h3>No automations yet</h3><p>Create a flow or use a template to automate your CRM.</p></div>
          ) : (
            <div className="tw">
              <div className="tw-head"><h3>Active Flows ({automations.filter(a => a.active).length}/{automations.length})</h3></div>
              <div className="tw-scroll">
                <table>
                  <thead><tr><th>#</th><th>Flow Name</th><th>Trigger</th><th>Action</th><th>Active</th><th>Actions</th></tr></thead>
                  <tbody>
                    {automations.map((a, i) => (
                      <tr key={a.id}>
                        <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                        <td><strong>{a.name}</strong></td>
                        <td style={{ fontSize: 12 }}>{trigLabel(a.trigger)}</td>
                        <td style={{ fontSize: 12 }}>{actLabel(a.action)}</td>
                        <td>
                          <label className="toggle"><input type="checkbox" checked={a.active !== false} onChange={() => toggleFlow(a)} /><span className="toggle-slider" /></label>
                        </td>
                        <td><button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => del(a.id)}>Del</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Visual Flow Preview */}
          {automations.length > 0 && (
            <div className="tw" style={{ marginTop: 18 }}>
              <div className="tw-head"><h3>Flow Visualization — {automations[0]?.name}</h3></div>
              <div style={{ padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="flow-node trig">
                  <div className="nt">TRIGGER</div>
                  <div className="nn">{trigLabel(automations[0]?.trigger)}</div>
                </div>
                <div className="fc-wrap"><div className="fc-wrap::before" /><div style={{ width: 2, height: 28, background: 'var(--border)', margin: '0 auto' }} /></div>
                <div className="flow-node act">
                  <div className="nt">ACTION</div>
                  <div className="nn">{actLabel(automations[0]?.action)}</div>
                </div>
                <div style={{ width: 2, height: 28, background: 'var(--border)', margin: '0 auto' }} />
                <div className="flow-node endN">
                  <div className="nt">END</div>
                  <div className="nn">Flow Complete</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TEMPLATES */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
          {TEMPLATES.map((tpl, i) => (
            <div key={i} className="tw" style={{ cursor: 'pointer' }} onClick={() => applyTemplate(tpl)}>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{tpl.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{tpl.desc}</div>
                <div style={{ fontSize: 11, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge bg-blue">{trigLabel(tpl.trigger)}</span>
                  <span>→</span>
                  <span className="badge bg-green">{actLabel(tpl.action)}</span>
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12, width: '100%' }}>Use Template</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Flow Modal */}
      {modal && (
        <div className="mo open">
          <div className="mo-box">
            <div className="mo-head"><h3>Create Automation Flow</h3><button className="btn-icon" onClick={() => setModal(false)}>✕</button></div>
            <div className="mo-body">
              <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
                {['Name', 'Trigger', 'Action'].map((s, i) => (
                  <div key={s} style={{ flex: 1, textAlign: 'center', borderBottom: `2px solid ${step > i ? 'var(--accent)' : 'var(--border)'}`, paddingBottom: 8, cursor: 'pointer', fontSize: 12, fontWeight: step === i + 1 ? 700 : 500, color: step === i + 1 ? 'var(--accent)' : 'var(--muted)' }} onClick={() => step > i && setStep(i + 1)}>
                    {i + 1}. {s}
                  </div>
                ))}
              </div>
              {step === 1 && (
                <div className="fg"><label>Flow Name</label><input value={flowName} onChange={e => setFlowName(e.target.value)} placeholder="e.g. Follow-Up Reminder" autoFocus /></div>
              )}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Select a Trigger</label>
                  {TRIGGER_TYPES.map(t => (
                    <div key={t.id} onClick={() => setSelectedTrig(t.id)} style={{ padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${selectedTrig === t.id ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', background: selectedTrig === t.id ? '#f0fdf4' : '#fff', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 20 }}>{t.icon}</span>
                      <div><div style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.desc}</div></div>
                    </div>
                  ))}
                </div>
              )}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Select an Action</label>
                  {ACTION_TYPES.map(a => (
                    <div key={a.id} onClick={() => setSelectedAct(a.id)} style={{ padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${selectedAct === a.id ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', background: selectedAct === a.id ? '#f0fdf4' : '#fff', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 20 }}>{a.icon}</span>
                      <div><div style={{ fontSize: 13, fontWeight: 700 }}>{a.label}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.desc}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => step > 1 ? setStep(s => s - 1) : setModal(false)}>{step > 1 ? '← Back' : 'Cancel'}</button>
              {step < 3
                ? <button className="btn btn-primary btn-sm" onClick={() => { if (step === 1 && !flowName.trim()) { toast('Enter a name', 'error'); return; } if (step === 2 && !selectedTrig) { toast('Select a trigger', 'error'); return; } setStep(s => s + 1); }}>Next →</button>
                : <button className="btn btn-primary btn-sm" onClick={saveFlow}>Create Flow ⚡</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
