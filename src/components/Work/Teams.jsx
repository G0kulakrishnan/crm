import React, { useState } from 'react';
import db from '../../instant';
import { id } from '@instantdb/react';
import { useToast } from '../../context/ToastContext';

const PERMS = ['Dashboard', 'Leads', 'Quotations', 'Invoices', 'AMC', 'Expenses', 'Products', 'Projects', 'Tasks', 'Reports', 'Settings'];
const DEFAULT_ROLES = [
  { name: 'Admin', perms: [...PERMS] },
  { name: 'Sales', perms: ['Dashboard', 'Leads', 'Quotations', 'Products', 'Tasks'] },
];
const EMPTY = { name: '', email: '', phone: '', role: 'Sales', active: true };
const EMPTY_ROLE = { name: '', perms: [] };

export default function Teams({ user }) {
  const [tab, setTab] = useState('members');
  const [modal, setModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editRole, setEditRole] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [roleForm, setRoleForm] = useState(EMPTY_ROLE);
  const toast = useToast();

  const { data } = db.useQuery({
    teamMembers: { $: { where: { userId: user.id } } },
    userProfiles: { $: { where: { userId: user.id } } }
  });
  const team = data?.teamMembers || [];
  const profileId = data?.userProfiles?.[0]?.id;
  const roles = data?.userProfiles?.[0]?.roles || DEFAULT_ROLES;
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast('Name and email required', 'error'); return; }
    const payload = { ...form, userId: user.id };
    if (editData) { await db.transact(db.tx.teamMembers[editData.id].update(payload)); toast('Member updated', 'success'); }
    else { await db.transact(db.tx.teamMembers[id()].update(payload)); toast('Member added', 'success'); }
    setModal(false);
  };

  const del = async (tid) => { if (!confirm('Remove this team member?')) return; await db.transact(db.tx.teamMembers[tid].delete()); toast('Removed', 'error'); };
  const toggleActive = async (m) => { await db.transact(db.tx.teamMembers[m.id].update({ active: !m.active })); };

  const saveRole = async () => {
    if (!roleForm.name.trim()) { toast('Role name required', 'error'); return; }
    let newRoles = [...roles];
    if (editRole) {
      const idx = newRoles.findIndex(r => r.name === editRole.name);
      if (idx !== -1) newRoles[idx] = roleForm;
    } else {
      if (newRoles.find(r => r.name.toLowerCase() === roleForm.name.toLowerCase())) { toast('Role already exists', 'error'); return; }
      newRoles.push({ name: roleForm.name.trim(), perms: roleForm.perms });
    }
    const payload = { roles: newRoles, userId: user.id };
    if (profileId) { await db.transact(db.tx.userProfiles[profileId].update(payload)); }
    else { await db.transact(db.tx.userProfiles[id()].update(payload)); }
    toast('Role saved', 'success');
    setRoleModal(false);
  };

  const delRole = async (rName) => {
    if (!confirm('Delete this role?')) return;
    const newRoles = roles.filter(r => r.name !== rName);
    if (profileId) await db.transact(db.tx.userProfiles[profileId].update({ roles: newRoles }));
    toast('Role deleted', 'error');
  };

  const rf = (p) => (e) => {
    const checked = e.target.checked;
    setRoleForm(prev => ({
      ...prev,
      perms: checked ? [...prev.perms, p] : prev.perms.filter(x => x !== p)
    }));
  };

  return (
    <div>
      <div className="sh">
        <div><h2>Teams & Roles</h2><div className="sub">Manage team access</div></div>
        <button className="btn btn-primary btn-sm" onClick={() => { 
          if (tab === 'members') { setEditData(null); setForm({ ...EMPTY, role: roles[0]?.name || '' }); setModal(true); }
          else { setEditRole(null); setRoleForm(EMPTY_ROLE); setRoleModal(true); }
        }}>+ {tab === 'members' ? 'Add Member' : 'Add Role'}</button>
      </div>
      <div className="tabs">
        <div className={`tab${tab === 'members' ? ' active' : ''}`} onClick={() => setTab('members')}>Members</div>
        <div className={`tab${tab === 'roles' ? ' active' : ''}`} onClick={() => setTab('roles')}>Roles & Permissions</div>
      </div>
      
      {tab === 'members' ? (
      <div className="tw">
        <div className="tw-head"><h3>Team Members ({team.length})</h3></div>
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {team.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No team members</td></tr>
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
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditData(m); setForm({ name: m.name, email: m.email, phone: m.phone || '', role: m.role, active: m.active !== false }); setModal(true); }}>Edit</button>{' '}
                    <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => del(m.id)}>Del</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      ) : (
      <div className="tw">
        <div className="tw-head"><h3>Roles ({roles.length})</h3></div>
        <table>
          <thead><tr><th>#</th><th>Role Name</th><th>Permissions</th><th>Actions</th></tr></thead>
          <tbody>
            {roles.map((r, i) => (
              <tr key={r.name}>
                <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                <td><strong>{r.name}</strong></td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {r.perms.map(p => <span key={p} className="badge bg-gray" style={{ fontSize: 10 }}>{p}</span>)}
                    {r.perms.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 11 }}>No access</span>}
                  </div>
                </td>
                <td>
                  {r.name !== 'Admin' ? (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEditRole(r); setRoleForm(r); setRoleModal(true); }}>Edit</button>{' '}
                      <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={() => delRole(r.name)}>Del</button>
                    </>
                  ) : <span style={{ fontSize: 11, color: 'var(--muted)' }}>System Role</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      {modal && (
        <div className="mo open" onClick={e => e.target === e.currentTarget && setModal(false)}>
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

      {roleModal && (
        <div className="mo open" onClick={e => e.target === e.currentTarget && setRoleModal(false)}>
          <div className="mo-box wide">
            <div className="mo-head"><h3>{editRole ? 'Edit' : 'Add'} Role</h3><button className="btn-icon" onClick={() => setRoleModal(false)}>✕</button></div>
            <div className="mo-body">
              <div className="fgrid">
                <div className="fg span2"><label>Role Name *</label><input value={roleForm.name} onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))} disabled={editRole?.name === 'Admin'} /></div>
                <div className="fg span2">
                  <label>Module Access</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 8, padding: 16, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {PERMS.map(p => (
                      <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={roleForm.perms.includes(p)} onChange={rf(p)} style={{ width: 16, height: 16, cursor: 'pointer' }} /> {p}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mo-foot"><button className="btn btn-secondary btn-sm" onClick={() => setRoleModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={saveRole}>Save Role</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
