import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useToast } from '../../context/ToastContext';

const MODULES = [
  { key: 'Dashboard', actions: ['view'] },
  { key: 'Leads', actions: ['list', 'create', 'edit', 'delete'] },
  { key: 'Customers', actions: ['list', 'create', 'edit', 'delete'] },
  { key: 'Quotations', actions: ['list', 'create', 'edit', 'delete'] },
  { key: 'Invoices', actions: ['list', 'create', 'edit', 'delete'] },
  { key: 'AMC', actions: ['list', 'create', 'edit', 'delete'] },
  { key: 'Expenses', actions: ['list', 'create', 'edit', 'delete'] },
  { key: 'Products', actions: ['list', 'create', 'edit', 'delete'] },
  { key: 'Campaigns', actions: ['list', 'create', 'edit'] },
  { key: 'Projects', actions: ['list', 'create', 'edit', 'delete'] },
  { key: 'Tasks', actions: ['list', 'create', 'edit', 'delete'] },
  { key: 'Teams', actions: ['list', 'create', 'edit', 'delete'] },
  { key: 'Reports', actions: ['view'] },
  { key: 'Settings', actions: ['view'] },
];

const ALL_ACTIONS = ['list', 'view', 'create', 'edit', 'delete'];

const DEFAULT_ROLES = [
  { name: 'Admin', perms: Object.fromEntries(MODULES.map(m => [m.key, [...m.actions]])) },
  { name: 'Sales', perms: { Dashboard: ['view'], Leads: ['list', 'create', 'edit'], Customers: ['list'], Quotations: ['list', 'create'], Products: ['list'] } },
];

// Normalise old string[] perms to new object format
function normalisePerms(perms) {
  if (!perms) return {};
  if (Array.isArray(perms)) {
    // old format: ['Leads', 'Dashboard'] → give full access to those modules
    return Object.fromEntries(
      perms.map(key => {
        const mod = MODULES.find(m => m.key === key);
        return [key, mod ? [...mod.actions] : ['view']];
      })
    );
  }
  return perms; // already new format
}

const EMPTY = { name: '', email: '', phone: '', role: 'Sales', active: true };
const EMPTY_ROLE = { name: '', perms: {} };

export default function Teams({ user, ownerId, perms }) {
  const canCreate = perms?.can('Teams', 'create') === true;
  const canEdit = perms?.can('Teams', 'edit') === true;
  const canDelete = perms?.can('Teams', 'delete') === true;
  const [tab, setTab] = useState('members');
  const [modal, setModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [pwdModal, setPwdModal] = useState(null); // holds teamMember being set password
  const [editData, setEditData] = useState(null);
  const [editRole, setEditRole] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [roleForm, setRoleForm] = useState(EMPTY_ROLE);
  const [pwdForm, setPwdForm] = useState({ password: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const toast = useToast();

  const { data } = db.useQuery({
    teamMembers: { $: { where: { userId: ownerId } } },
    userProfiles: { $: { where: { userId: ownerId } } }
  });
  const team = data?.teamMembers || [];
  const profileId = data?.userProfiles?.[0]?.id;
  const rawRoles = data?.userProfiles?.[0]?.roles || DEFAULT_ROLES;
  // Normalise all roles to new format
  const roles = rawRoles.map(r => ({ ...r, perms: normalisePerms(r.perms) }));

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async () => {
    if (editData && !canEdit) { toast('Permission denied: cannot edit members', 'error'); return; }
    if (!editData && !canCreate) { toast('Permission denied: cannot add members', 'error'); return; }
    if (!form.name.trim() || !form.email.trim()) { toast('Name and email required', 'error'); return; }
    const normalizedEmail = form.email.trim().toLowerCase();
    const payload = { ...form, email: normalizedEmail, userId: ownerId };
    if (editData) { await db.transact(db.tx.teamMembers[editData.id].update(payload)); toast('Member updated', 'success'); }
    else { await db.transact(db.tx.teamMembers[id()].update(payload)); toast('Member added', 'success'); }
    setModal(false);
  };

  const del = async (tid) => { 
    if (!canDelete) { toast('Permission denied: cannot remove members', 'error'); return; }
    if (!confirm('Remove this team member?')) return; 
    await db.transact(db.tx.teamMembers[tid].delete()); 
    toast('Removed', 'error'); 
  };
  const toggleActive = async (m) => { 
    if (!canEdit) { toast('Permission denied', 'error'); return; }
    await db.transact(db.tx.teamMembers[m.id].update({ active: !m.active })); 
  };

  const saveRole = async () => {
    if (!canEdit) { toast('Permission denied: cannot modify roles', 'error'); return; }
    if (!roleForm.name.trim()) { toast('Role name required', 'error'); return; }
    let newRoles = [...roles];
    if (editRole) {
      const idx = newRoles.findIndex(r => r.name === editRole.name);
      if (idx !== -1) newRoles[idx] = roleForm;
    } else {
      const forbidden = ['superadmin', 'admin'];
      if (forbidden.includes(roleForm.name.toLowerCase())) {
        toast(`"${roleForm.name}" is a protected system role`, 'error');
        return;
      }
      if (newRoles.find(r => r.name.toLowerCase() === roleForm.name.toLowerCase())) {
        toast('Role already exists', 'error');
        return;
      }
      newRoles.push({ name: roleForm.name.trim(), perms: roleForm.perms });
    }
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update({ roles: newRoles })); }
    else { await db.transact(db.tx.userProfiles[id()].update({ roles: newRoles, userId: ownerId })); }
    toast('Role saved', 'success');
    setRoleModal(false);
  };

  const delRole = async (rName) => {
    if (!canDelete) { toast('Permission denied: cannot delete roles', 'error'); return; }
    if (!confirm('Delete this role?')) return;
    const newRoles = roles.filter(r => r.name !== rName);
    if (profileId) await db.transact(db.tx.userProfiles[profileId].update({ roles: newRoles }));
    toast('Role deleted', 'error');
  };

  // Toggle a single action in a role's perms
  const togglePerm = (moduleKey, action, checked) => {
    setRoleForm(prev => {
      const existing = prev.perms[moduleKey] || [];
      const updated = checked
        ? [...new Set([...existing, action])]
        : existing.filter(a => a !== action);
      const newPerms = { ...prev.perms };
      if (updated.length === 0) delete newPerms[moduleKey];
      else newPerms[moduleKey] = updated;
      return { ...prev, perms: newPerms };
    });
  };

  // Toggle entire module (all or none)
  const toggleModule = (moduleKey, actions, checked) => {
    setRoleForm(prev => {
      const newPerms = { ...prev.perms };
      if (checked) newPerms[moduleKey] = [...actions];
      else delete newPerms[moduleKey];
      return { ...prev, perms: newPerms };
    });
  };

  const handleSetPassword = async () => {
    if (!pwdForm.password || pwdForm.password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    if (pwdForm.password !== pwdForm.confirm) { toast('Passwords do not match', 'error'); return; }
    setPwdLoading(true);
    try {
      const normalizedEmail = pwdModal.email.trim().toLowerCase();
      const res = await fetch('/api/auth/set-team-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: pwdForm.password,
          ownerUserId: ownerId,
          teamMemberId: pwdModal.id
        })
      });
      const json = await res.json();
      if (res.ok) {
        toast(`Password set for ${pwdModal.name}!`, 'success');
        // Mark as having password
        await db.transact(db.tx.teamMembers[pwdModal.id].update({ hasPassword: true }));
        setPwdModal(null);
        setPwdForm({ password: '', confirm: '' });
      } else {
        toast(json.error || 'Failed to set password', 'error');
      }
    } catch (e) {
      toast('Network error', 'error');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div>
      <div className="sh">
        <div><h2>Teams &amp; Roles</h2><div className="sub">Manage team access &amp; permissions</div></div>
        <button className="btn btn-primary btn-sm" onClick={() => {
          if (tab === 'members') { setEditData(null); setForm({ ...EMPTY, role: roles[0]?.name || '' }); setModal(true); }
          else { setEditRole(null); setRoleForm(EMPTY_ROLE); setRoleModal(true); }
        }}>+ {tab === 'members' ? 'Add Member' : 'Add Role'}</button>
      </div>
      <div className="tabs">
        <div className={`tab${tab === 'members' ? ' active' : ''}`} onClick={() => setTab('members')}>Members</div>
        <div className={`tab${tab === 'roles' ? ' active' : ''}`} onClick={() => setTab('roles')}>Roles &amp; Permissions</div>
      </div>

      {tab === 'members' ? (
        <div className="tw">
          <div className="tw-head"><h3>Team Members ({team.length})</h3></div>
          <div className="tw-scroll">
            <table>
              <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Login</th><th>Actions</th></tr></thead>
              <tbody>
                {team.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No team members yet</td></tr>
                  : team.map((m, i) => (
                    <tr key={m.id}>
                      <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{m.name.charAt(0).toUpperCase()}</div>
                        <strong>{m.name}</strong>
                      </td>
                      <td style={{ fontSize: 12 }}>{m.email}</td>
                      <td style={{ fontSize: 12 }}>{m.phone || '-'}</td>
                      <td><span className="badge bg-blue">{m.role}</span></td>
                      <td>
                        <label className="toggle">
                          <input type="checkbox" checked={m.active !== false} onChange={() => toggleActive(m)} />
                          <span className="toggle-slider" />
                        </label>
                      </td>
                      <td>
                        <span
                          style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9, background: m.hasPassword ? '#d1fae5' : '#fef3c7', color: m.hasPassword ? '#065f46' : '#92400e', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => { setPwdModal(m); setPwdForm({ password: '', confirm: '' }); }}
                          title={m.hasPassword ? 'Change Password' : 'Set Password to enable login'}
                        >
                          {m.hasPassword ? '🔑 Change Pwd' : '⚠ Set Password'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditData(m); setForm({ name: m.name, email: m.email, phone: m.phone || '', role: m.role, active: m.active !== false }); setModal(true); }}>Edit</button>{' '}
                        <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => del(m.id)}>Del</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="tw">
          <div className="tw-head"><h3>Roles ({roles.length})</h3></div>
          <div className="tw-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Role Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Modules Accessible</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r, i) => {
                  const moduleCount = Object.keys(r.perms).length;
                  return (
                    <tr key={r.name}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <strong style={{ fontSize: 14 }}>{r.name}</strong>
                          {r.name === 'Admin' && <span className="badge bg-gray" style={{ fontSize: 10 }}>System Role</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge bg-blue" style={{ fontSize: 11 }}>{moduleCount} Modules</span>
                        {moduleCount > 0 && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)' }}>
                            ({Object.keys(r.perms).slice(0, 3).join(', ')}{moduleCount > 3 ? '...' : ''})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {r.name !== 'Admin' ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditRole(r); setRoleForm({ name: r.name, perms: { ...r.perms } }); setRoleModal(true); }}>Edit Permissions</button>
                            <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => delRole(r.name)}>Del</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Full System Access</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Team Member Modal */}
      {modal && (
        <div className="mo open">
          <div className="mo-box">
            <div className="mo-head"><h3>{editData ? 'Edit' : 'Add'} Team Member</h3><button className="btn-icon" onClick={() => setModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg"><label>Full Name *</label><input value={form.name} onChange={f('name')} /></div>
                <div className="fg"><label>Email *</label><input type="email" value={form.email} onChange={f('email')} /></div>
                <div className="fg"><label>Phone</label><input value={form.phone} onChange={f('phone')} /></div>
                <div className="fg"><label>Role</label><select value={form.role} onChange={f('role')}>{roles.map(r => <option key={r.name}>{r.name}</option>)}</select></div>
              </div>
            </div>
            <div className="mo-foot"><button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Save</button></div>
          </div>
        </div>
      )}

      {/* Add/Edit Role Modal */}
      {roleModal && (
        <div className="mo open">
          <div className="mo-box wide">
            <div className="mo-head"><h3>{editRole ? 'Edit' : 'Add'} Role</h3><button className="btn-icon" onClick={() => setRoleModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg span2"><label>Role Name *</label><input value={roleForm.name} onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))} disabled={editRole?.name === 'Admin'} /></div>
                <div className="fg span2">
                  <label>Module Permissions</label>
                  <div style={{ overflowX: 'auto', marginTop: 8 }}>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Module</th>
                          <th style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>All</th>
                          {ALL_ACTIONS.map(a => (
                            <th key={a} style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border)', textTransform: 'capitalize' }}>{a}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {MODULES.map(m => {
                          const granted = roleForm.perms[m.key] || [];
                          const allGranted = m.actions.every(a => granted.includes(a));
                          return (
                            <tr key={m.key} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600 }}>{m.key}</td>
                              <td style={{ textAlign: 'center', padding: '8px 10px' }}>
                                <input type="checkbox" checked={allGranted} onChange={e => toggleModule(m.key, m.actions, e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                              </td>
                              {ALL_ACTIONS.map(a => {
                                const supported = m.actions.includes(a);
                                return (
                                  <td key={a} style={{ textAlign: 'center', padding: '8px 10px' }}>
                                    {supported
                                      ? <input type="checkbox" checked={granted.includes(a)} onChange={e => togglePerm(m.key, a, e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                                      : <span style={{ color: 'var(--muted)' }}>—</span>
                                    }
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div className="mo-foot"><button className="btn btn-secondary btn-sm" onClick={() => setRoleModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={saveRole}>Save Role</button></div>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {pwdModal && (
        <div className="mo open">
          <div className="mo-box" style={{ width: 380 }}>
            <div className="mo-head">
              <h3>🔑 Set Password — {pwdModal.name}</h3>
              <button className="btn-icon" onClick={() => setPwdModal(null)}>✕</button>
            </div>
            <div className="mo-body">
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#1d4ed8' }}>
                This team member will be able to log in with their email <strong>{pwdModal.email}</strong> and this password.
              </div>
              <div className="fgrid">
                <div className="fg span2"><label>New Password</label><input type="password" value={pwdForm.password} onChange={e => setPwdForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 6 characters" /></div>
                <div className="fg span2"><label>Confirm Password</label><input type="password" value={pwdForm.confirm} onChange={e => setPwdForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat password" /></div>
              </div>
            </div>
            <div className="mo-foot">
              <button className="btn btn-secondary btn-sm" onClick={() => setPwdModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSetPassword} disabled={pwdLoading}>
                {pwdLoading ? 'Setting...' : '✅ Set Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
