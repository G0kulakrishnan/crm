import React, { useState, useMemo } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useToast } from '../../context/ToastContext';
import { sendEmail, sendWhatsAppMock } from '../../utils/messaging';
import { fmtD } from '../../utils/helpers';

const STAGES = ['New Enquiry', 'Enquiry Contacted', 'Budget Negotiation', 'Advance Paid', 'Won', 'Lost'];
const SOURCES = ['FB Ads', 'Direct', 'Broker', 'Google Ads', 'Referral', 'WhatsApp', 'Website', 'Other'];
const LABELS = ['Hot', 'Warm', 'Cold', 'VIP', 'Pending'];

const TEMPLATES = [
  { id: 'blank', name: 'Blank Template', subject: '', body: '' },
  { id: 'festival', name: '🎉 Festival Offer', subject: 'Special Festival Greetings & Offer for {{name}}!', body: 'Hi {{name}},\n\nWishing you a wonderful festive season! As a special thanks for being in touch with us, we are offering an exclusive discount on our services this week.\n\nReply to this email to claim your offer!\n\nBest regards,\nThe Team' },
  { id: 'sale', name: '💰 Flash Sale', subject: 'Flash Sale: 20% Off Today Only!', body: 'Hello {{name}},\n\nWe are running a 24-hour flash sale! Get 20% off all our premium packages if you book today.\n\nDon\'t miss out on this limited-time offer.\n\nThanks,\nOur Team' },
  { id: 'reengage', name: '👋 Re-engagement', subject: 'Are you still looking for services, {{name}}?', body: 'Hi {{name}},\n\nIt\'s been a while since we last spoke! I wanted to check in and see if you are still looking for solutions in this space. Our team has added some great new features recently that might be perfect for you.\n\nLet me know if you have time for a quick 5-minute chat this week.\n\nBest,\nYour Dedicated Rep' }
];

export default function Campaigns({ user }) {
  const [tab, setTab] = useState('compose'); // 'compose' | 'history'
  
  // Filters
  const [selStages, setSelStages] = useState(new Set());
  const [selSources, setSelSources] = useState(new Set());
  const [selLabels, setSelLabels] = useState(new Set());
  
  // Composer
  const [channel, setChannel] = useState('email'); // 'email' | 'whatsapp'
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  
  // Processing
  const [sendMode, setSendMode] = useState('now'); // 'now' | 'schedule'
  const [scheduleTime, setScheduleTime] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const toast = useToast();

  const { data } = db.useQuery({
    leads: { $: { where: { userId: user.id } } },
    campaigns: { $: { where: { userId: user.id } } },
    userProfiles: { $: { where: { userId: user.id } } },
    campaignTemplates: { $: { where: { userId: user.id } } }
  });

  const leads = data?.leads || [];
  const campaigns = (data?.campaigns || []).sort((a,b) => b.createdAt - a.createdAt);
  const userTemplates = data?.campaignTemplates || [];
  const profile = data?.userProfiles?.[0];

  // Audience Builder Filter
  const targetAudience = useMemo(() => {
    return leads.filter(l => {
      // Must have an email for email campaign, phone for whatsapp campaign
      if (channel === 'email' && !l.email) return false;
      if (channel === 'whatsapp' && !l.phone) return false;
      
      const stgMatch = selStages.size === 0 || selStages.has(l.stage);
      const srcMatch = selSources.size === 0 || selSources.has(l.source);
      const lblMatch = selLabels.size === 0 || selLabels.has(l.label);
      
      return stgMatch && srcMatch && lblMatch;
    });
  }, [leads, selStages, selSources, selLabels]);

  const loadTemplate = (tid) => {
    setSelectedTemplate(tid);
    // Search both system and user templates
    const sysT = TEMPLATES.find(x => x.id === tid);
    const usrT = userTemplates.find(x => x.id === tid);
    const t = sysT || usrT;
    
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  };

  const handleSaveTemplate = async () => {
    if (!subject.trim() || !body.trim()) return toast('Please enter a subject and body before saving a template', 'error');
    
    // Check if the currently selected template is a custom user template
    const isEditingCustom = userTemplates.some(t => t.id === selectedTemplate);

    if (isEditingCustom) {
      // Overwrite existing custom template
      await db.transact(db.tx.campaignTemplates[selectedTemplate].update({ subject, body, updatedAt: Date.now() }));
      toast('Template updated successfully', 'success');
    } else {
      // Save as a brand new template
      const templateName = prompt('Enter a name for this new template:');
      if (!templateName || !templateName.trim()) return;

      const newTid = id();
      await db.transact(db.tx.campaignTemplates[newTid].update({
        userId: user.id,
        name: templateName.trim(),
        subject,
        body,
        createdAt: Date.now()
      }));
      
      setSelectedTemplate(newTid);
      toast('New template saved!', 'success');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!confirm('Are you sure you want to delete this custom template?')) return;
    await db.transact(db.tx.campaignTemplates[selectedTemplate].delete());
    setSelectedTemplate('blank');
    setSubject('');
    setBody('');
    toast('Template deleted', 'error');
  };

  const handleSend = async () => {
    if (!campaignName.trim()) return toast('Please enter a Campaign Name', 'error');
    if (channel === 'email' && !profile?.smtpSender) return toast('Please configure your EmailJS settings in the CRM Settings page first', 'error');
    if (targetAudience.length === 0) return toast('No leads match your selected filters. Please adjust your audience.', 'error');
    if (channel === 'email' && (!subject.trim() || !body.trim())) return toast('Please enter a subject and email body.', 'error');
    if (channel === 'whatsapp' && !body.trim()) return toast('Please enter a message body.', 'error');
    
    if (sendMode === 'schedule') {
      if (!scheduleTime) return toast('Please select a date and time to schedule this campaign.', 'error');
      const skedDate = new Date(scheduleTime);
      if (skedDate < new Date()) return toast('Scheduled time must be in the future.', 'error');
      
      const campId = id();
      await db.transact(db.tx.campaigns[campId].update({
        userId: user.id,
        name: campaignName,
        channel: channel,
        subject: channel === 'email' ? subject : null,
        body: body,
        audienceSize: targetAudience.length,
        status: 'Scheduled',
        filters: { stages: Array.from(selStages), sources: Array.from(selSources), labels: Array.from(selLabels) },
        scheduledFor: skedDate.getTime(),
        createdAt: Date.now()
      }));

      toast('Campaign scheduled successfully!', 'success');
      setTab('history');
      setCampaignName('');
      setSubject('');
      setBody('');
      setScheduleTime('');
      return;
    }

    if (!confirm(`Are you sure you want to send this ${channel.toUpperCase()} campaign to ${targetAudience.length} leads now?`)) return;

    setSending(true);
    setProgress(0);
    
    const campId = id();
    let sentCount = 0;
    
    // Create the campaign record first
    await db.transact(db.tx.campaigns[campId].update({
      userId: user.id,
      name: campaignName,
      channel: channel,
      subject: channel === 'email' ? subject : null,
      body: body,
      audienceSize: targetAudience.length,
      status: 'Sending...',
      createdAt: Date.now()
    }));

    // Process loop avoiding strict rate limits (Wait 1s between emails)
    for (let i = 0; i < targetAudience.length; i++) {
      const lead = targetAudience[i];
      try {
        const pSubj = channel === 'email' ? subject.replace(/{{name}}/g, lead.name || 'Friend').replace(/{{email}}/g, lead.email || '') : '';
        const pBody = body.replace(/{{name}}/g, lead.name || 'Friend').replace(/{{email}}/g, lead.email || '');
        
        const logText = channel === 'email' 
          ? `Received email campaign: "${campaignName}"\nSubject: ${pSubj}`
          : `Received WhatsApp campaign: "${campaignName}"`;

        if (channel === 'email') {
          await sendEmail(lead.email, pSubj, pBody, profile);
        } else {
          await sendWhatsAppMock(user.id, lead.phone, pBody, { entityId: lead.id, entityType: 'lead' });
        }
        
        // Log to lead timeline
        await db.transact(db.tx.activityLogs[id()].update({
          entityId: lead.id,
          entityType: 'lead',
          text: logText,
          userId: user.id,
          userName: 'System (Campaign)',
          createdAt: Date.now()
        }));
        
        sentCount++;
      } catch (err) {
        console.error(`Failed to send campaign to ${lead.email || lead.phone}:`, err);
      }
      
      setProgress(Math.round(((i + 1) / targetAudience.length) * 100));
      // Artificial delay to prevent triggering spam/rate limits on free EmailJS
      await new Promise(r => setTimeout(r, 1500)); 
    }
    
    // Update campaign status
    await db.transact(db.tx.campaigns[campId].update({
      status: 'Completed',
      sentCount: sentCount
    }));

    toast(`Campaign complete! Sent to ${sentCount} leads.`, 'success');
    setSending(false);
    setTab('history');
    setCampaignName('');
    setSubject('');
    setBody('');
  };

  const toggleSet = (set, setFn, val) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setFn(next);
  };

  return (
    <div>
      <div className="sh" style={{ marginBottom: 20 }}>
        <div><h2>Marketing Campaigns</h2><div className="sub">Send bulk emails to targeted lead segments</div></div>
      </div>

      <div className="tabs">
        <div className={`tab${tab === 'compose' ? ' active' : ''}`} onClick={() => !sending && setTab('compose')}>Compose Campaign</div>
        <div className={`tab${tab === 'history' ? ' active' : ''}`} onClick={() => !sending && setTab('history')}>Campaign History</div>
        <div className={`tab${tab === 'templates' ? ' active' : ''}`} onClick={() => !sending && setTab('templates')}>My Templates</div>
      </div>

      {tab === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 25, marginTop: 20 }}>
          
          {/* LEFT SIDE: Audience Builder */}
          <div className="tw" style={{ padding: 25, height: 'max-content' }}>
            <h3>1. Target Audience</h3>
            <div style={{ marginTop: 15, fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Select filters below to build your recipient list. Leaving a category blank means "All".</div>
            
            <div style={{ background: 'var(--bg)', padding: 15, borderRadius: 8, textAlign: 'center', marginBottom: 25, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{targetAudience.length}</div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: 1 }}>Leads Selected</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Filter by Stage {selStages.size > 0 && <span style={{ color: 'var(--accent)' }}>({selStages.size})</span>}</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                {STAGES.map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selStages.has(s)} onChange={() => toggleSet(selStages, setSelStages, s)} style={{ accentColor: 'var(--accent)' }}/> {s}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Filter by Source {selSources.size > 0 && <span style={{ color: 'var(--accent)' }}>({selSources.size})</span>}</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                {SOURCES.map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selSources.has(s)} onChange={() => toggleSet(selSources, setSelSources, s)} style={{ accentColor: 'var(--accent)' }}/> {s}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Filter by Label {selLabels.size > 0 && <span style={{ color: 'var(--accent)' }}>({selLabels.size})</span>}</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                {LABELS.map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selLabels.has(s)} onChange={() => toggleSet(selLabels, setSelLabels, s)} style={{ accentColor: 'var(--accent)' }}/> {s}
                  </label>
                ))}
              </div>
            </div>

            <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 20 }} onClick={() => { setSelStages(new Set()); setSelSources(new Set()); setSelLabels(new Set()); }}>Reset Filters</button>
          </div>

          {/* RIGHT SIDE: Composer */}
          <div className="tw" style={{ padding: 25 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>2. Compose Message</h3>
              <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <button 
                  className={`btn btn-sm ${channel === 'email' ? 'btn-primary' : 'btn-ghost'}`} 
                  style={{ borderRadius: 0, border: 'none' }} 
                  onClick={() => setChannel('email')} disabled={sending}
                >📧 Email</button>
                <button 
                  className={`btn btn-sm ${channel === 'whatsapp' ? 'btn-primary' : 'btn-ghost'}`} 
                  style={{ borderRadius: 0, border: 'none' }} 
                  onClick={() => setChannel('whatsapp')} disabled={sending}
                >💬 WhatsApp</button>
              </div>
            </div>
            
            <div className="fg" style={{ marginTop: 20 }}>
              <label>Campaign Name (Internal)</label>
              <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g., Diwali Offer 2026" disabled={sending} />
            </div>

            <div className="fg" style={{ marginTop: 20 }}>
              <label>Choose a Template</label>
              <select value={selectedTemplate} onChange={e => loadTemplate(e.target.value)} disabled={sending}>
                <optgroup label="System Presets">
                  {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
                {userTemplates.length > 0 && (
                  <optgroup label="My Custom Templates">
                    {userTemplates.map(t => <option key={t.id} value={t.id}>⭐ {t.name}</option>)}
                  </optgroup>
                )}
              </select>
            </div>

            {channel === 'email' && (
              <div className="fg" style={{ marginTop: 20 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Email Subject</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>Supports {'{{name}}'}, {'{{email}}'}</span>
                </label>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter subject line..." disabled={sending} />
              </div>
            )}

            <div className="fg" style={{ marginTop: 20 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{channel === 'email' ? 'Email Body' : 'WhatsApp Message'}</span>
                {channel === 'whatsapp' && <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>Supports {'{{name}}'}, {'{{email}}'}</span>}
              </label>
              <textarea 
                value={body} 
                onChange={e => setBody(e.target.value)} 
                placeholder={channel === 'email' ? "Write your email content here..." : "Write your WhatsApp message here..."}
                style={{ height: 250, resize: 'vertical' }}
                disabled={sending}
              />
            </div>

            {/* Template Actions */}
            <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                {userTemplates.some(t => t.id === selectedTemplate) ? (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={handleSaveTemplate} disabled={sending}>💾 Update Current Template</button>
                    <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={handleDeleteTemplate} disabled={sending}>🗑 Delete Template</button>
                  </>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={handleSaveTemplate} disabled={sending}>💾 Save as New Template</button>
                )}
              </div>
            </div>

            {sending ? (
              <div style={{ marginTop: 30, background: 'var(--bg-soft)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                <h4 style={{ margin: 0, marginBottom: 15 }}>Sending Campaign...</h4>
                <div style={{ width: '100%', height: 10, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 12, textAlign: 'center', marginTop: 10, color: 'var(--muted)', fontWeight: 600 }}>{progress}% Complete - Please do not close this window</div>
              </div>
            ) : (
              <div style={{ marginTop: 30, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <input type="radio" checked={sendMode === 'now'} onChange={() => setSendMode('now')} style={{ accentColor: 'var(--accent)' }} />
                    Send Now
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <input type="radio" checked={sendMode === 'schedule'} onChange={() => setSendMode('schedule')} style={{ accentColor: 'var(--accent)' }} />
                    Schedule for Later
                  </label>
                </div>

                {sendMode === 'schedule' && (
                  <div className="fg" style={{ marginBottom: 20 }}>
                    <label>Select Date & Time</label>
                    <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 15, justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleSend}>
                    {sendMode === 'now' ? `🚀 Send Now to ${targetAudience.length} Leads` : '📅 Schedule Campaign'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="tw" style={{ marginTop: 20 }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Campaign Name</th>
                <th>Subject</th>
                <th>Audience Size</th>
                <th>Sent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No campaigns sent yet.</td></tr>
              ) : campaigns.map(c => (
                <tr key={c.id}>
                  <td style={{ fontSize: 12 }}>
                    <div>{new Date(c.createdAt).toLocaleString()}</div>
                    {c.scheduledFor && <div style={{ color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>Scheduled: {new Date(c.scheduledFor).toLocaleString()}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.channel === 'whatsapp' ? <span title="WhatsApp">💬</span> : <span title="Email">📧</span>}
                      <strong>{c.name}</strong>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.channel === 'whatsapp' ? c.body : c.subject}
                  </td>
                  <td style={{ textAlign: 'center' }}><span className="badge bg-gray">{c.audienceSize}</span></td>
                  <td style={{ textAlign: 'center' }}><span className="badge bg-green">{c.sentCount || 0}</span></td>
                  <td>
                    <span className={`badge ${c.status === 'Completed' ? 'bg-green' : c.status === 'Scheduled' ? 'bg-purple' : 'bg-yellow'}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'templates' && (
        <div className="tw" style={{ padding: 25, marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3>My Custom Templates</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { setTab('compose'); setSelectedTemplate('blank'); setSubject(''); setBody(''); }}>+ Create New</button>
          </div>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Created On</th>
                <th>Template Name</th>
                <th>Subject</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userTemplates.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No custom templates saved yet.</td></tr>
              ) : userTemplates.map(t => (
                <tr key={t.id}>
                  <td style={{ fontSize: 12 }}>{new Date(t.createdAt).toLocaleString()}</td>
                  <td><strong>⭐ {t.name}</strong></td>
                  <td style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { loadTemplate(t.id); setTab('compose'); }}>Edit / Use</button>
                      <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={async () => {
                        if (confirm('Delete this template?')) await db.transact(db.tx.campaignTemplates[t.id].delete());
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
