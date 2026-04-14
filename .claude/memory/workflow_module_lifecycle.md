---
name: Module Lifecycle Workflow
description: When creating or deleting modules, update team roles, plans, and routing in three locations
type: feedback
---

## CRITICAL: Three-Place Module Update Rule

**Whenever you create or delete a module in T2GCRM, you MUST update THREE files in the admin system.** If you skip any, the module will either:
- Not appear in role permissions (users can't control access)
- Not be gated by plan (anyone can use it regardless of subscription)
- Not work in sidebar routing (module disabled but no reason shown to user)

## The Three Updates

### 1. Team Roles — Teams.jsx
**File:** `src/components/Work/Teams.jsx` (lines 10-34)

**Update:** `MODULES` array

**Purpose:** Defines what actions (list, view, create, edit, delete) are available for each module in role permissions UI

**Format:**
```javascript
const MODULES = [
  { key: 'Dashboard', actions: ['view'] },
  { key: 'Leads', actions: ['list', 'create', 'edit', 'delete'] },
  { key: 'YourNewModule', actions: ['list', 'create', 'edit', 'delete'] },  // ← Add here
  // ... rest of modules
];
```

**Key points:**
- Uses **PascalCase** for module key
- Actions array: ['list', 'view', 'create', 'edit', 'delete'] (pick which apply)
- Each action becomes a checkbox in Roles & Permissions grid
- Non-applicable actions show "—" in grid (e.g., Dashboard has only 'view')

**When deleting module:**
- Remove entire object from MODULES array
- Existing role permissions with this module preserved in DB (just hidden from UI)

---

### 2. Plan Modules — AdminPanel.jsx
**File:** `src/components/Admin/AdminPanel.jsx` (lines 14-38)

**Update:** `ALL_MODULES` array

**Purpose:** Defines which modules can be enabled/disabled per plan and what limits apply

**Format:**
```javascript
const ALL_MODULES = [
  { key: 'leads', label: 'Leads', hasLimit: true, limitKey: 'maxLeads', defaultLimit: 10000 },
  { key: 'yourNewModule', label: 'Your New Module', hasLimit: false },  // ← Add here
  // ... rest of modules
];
```

**Key points:**
- Uses **camelCase** for module key (NOT PascalCase)
- `label` is display name in Admin panel
- `hasLimit: true` only if module has a numeric limit (like maxLeads, maxUsers)
- If hasLimit true, must specify `limitKey` (e.g., 'maxYourModule') and `defaultLimit` (e.g., 500)
- `hasLimit: false` for most modules (they're either enabled or disabled, no quota)

**When deleting module:**
- Remove entire object from ALL_MODULES
- Existing plan configurations may still reference it (will be ignored)

---

### 3. Plan Enforcement Routing — usePlanEnforcement.js
**File:** `src/hooks/usePlanEnforcement.js` (lines 12-39)

**Update:** `VIEW_TO_MODULE` mapping

**Purpose:** Maps sidebar nav item IDs to module keys for `isViewAllowed()` checks

**Format:**
```javascript
const VIEW_TO_MODULE = {
  leads: 'leads',
  customers: 'customers',
  'your-view-id': 'yourNewModule',  // ← Add here if has sidebar nav
  // ... rest of mappings
};
```

**Key points:**
- Maps sidebar view ID (kebab-case) → module key (camelCase)
- Example: sidebar item `id: 'my-module'` maps to module key `'myModule'`
- Example: sidebar item `id: 'all-tasks'` maps to module key `'tasks'`
- Only add if module has a sidebar nav item
- **ALWAYS-ALLOWED views** (dashboard, userprofile, settings, admin, apidocs, manual, appointment-settings) are hardcoded — don't map
- For unmapped views, system defaults to `allow: true` (safety fallback)

**When deleting module:**
- Remove mapping from VIEW_TO_MODULE
- If sidebar nav already hidden via plan enforcement, no additional cleanup needed

---

## Case Sensitivity Rules

**CRITICAL: Case mismatch breaks everything!**

| System | Case | Example |
|--------|------|---------|
| Teams.jsx MODULES | **PascalCase** | `Leads`, `CallLogs`, `PurchaseOrders` |
| AdminPanel.jsx ALL_MODULES | **camelCase** | `leads`, `callLogs`, `purchaseOrders` |
| usePlanEnforcement VIEW_TO_MODULE keys | **camelCase** | `leads`, `callLogs`, `purchaseOrders` |
| Sidebar nav item id | **kebab-case** | `call-logs`, `purchase-orders`, `all-tasks` |

**Auto-conversion happens in code:**
- Teams component filters modules using `planEnforcement.isModuleEnabled()`
- Conversion: Teams `Leads` → Admin `leads` via MODULE_TO_PLAN_KEY mapping in Teams.jsx

---

## Complete Checklist for New Module

When creating a module, follow this exact checklist:

### Implementation
- [ ] Create component file in `src/components/YourModule/`
- [ ] Add API handlers in `api/` (if needed)
- [ ] Add route in `src/App.jsx`
- [ ] Add sidebar nav item in `src/components/Layout/Sidebar.jsx` with `id: 'your-view-id'`

### Admin System (CRITICAL)
- [ ] Add to `src/components/Work/Teams.jsx` MODULES array (PascalCase key)
- [ ] Add to `src/components/Admin/AdminPanel.jsx` ALL_MODULES array (camelCase key)
- [ ] Add to `src/hooks/usePlanEnforcement.js` VIEW_TO_MODULE (if sidebar nav item exists)

### Optional
- [ ] Set default permissions in Teams.jsx DEFAULT_ROLES (if not all roles should have access)
- [ ] Add module limit if it has quotas (e.g., maxProjectMembers)
- [ ] Document in module memory file

### Testing
- [ ] Log in as owner → verify module appears in Roles & Permissions grid
- [ ] Create plan → verify module checkbox appears in plan editor
- [ ] Assign plan → verify module enabled/disabled correctly
- [ ] Log in as team member → verify module visible/hidden based on role permissions
- [ ] Modify team role → verify module access updates for team members

---

## Complete Checklist for Deleting Module

When removing a module, follow this checklist:

### Removal
- [ ] Remove from `src/components/Work/Teams.jsx` MODULES array
- [ ] Remove from `src/components/Admin/AdminPanel.jsx` ALL_MODULES array
- [ ] Remove from `src/hooks/usePlanEnforcement.js` VIEW_TO_MODULE
- [ ] Remove sidebar nav item from `src/components/Layout/Sidebar.jsx`
- [ ] Remove route from `src/App.jsx`
- [ ] Delete component file(s)
- [ ] Delete API handlers (if any)

### Data Cleanup
- [ ] Hard delete all module records from database (via admin panel)
- [ ] Verify no orphaned records referencing deleted module
- [ ] Update activity logs if needed

### Testing
- [ ] Existing role permissions still load (old references ignored)
- [ ] Plan editor no longer shows deleted module
- [ ] Sidebar nav item gone
- [ ] No broken links or console errors

---

## Common Mistakes (Don't Do These!)

1. **Case mismatch:** Teams has `Leads`, Admin has `Lead` (missing 's') → won't match
2. **Missing VIEW_TO_MODULE:** Module in plans but not in routing → sidebar nav shows but module is blocked
3. **Forgot to add to ALL_MODULES:** Module in roles but not in plans → can't control via admin
4. **Forgot to add to MODULES:** Module in plans but not in roles → can't grant permissions to team members
5. **Hardcoded module references:** Checking `moduleName === 'Leads'` instead of using `planEnforcement.isModuleEnabled('leads')` → bypasses plan enforcement
6. **Deleted module data first:** Customers can't use feature anymore before admin finishes cutover → support issues
7. **Case typo in sidebar id:** `'call-logs'` in nav but `'callLogs'` in mappings → routing fails silently

---

## References

**Where to find each file:**
- Teams.jsx: `src/components/Work/Teams.jsx` (line 10-34)
- AdminPanel.jsx: `src/components/Admin/AdminPanel.jsx` (line 14-38)
- usePlanEnforcement.js: `src/hooks/usePlanEnforcement.js` (line 12-39)
- Sidebar.jsx: `src/components/Layout/Sidebar.jsx` (nav items)
- App.jsx: `src/App.jsx` (route definitions)

**Related documentation:**
- [Teams Module](module_teams.md) — Role permissions system
- [CLAUDE.md](../CLAUDE.md) — Full module lifecycle procedure

---

## Example: Adding "Inventory" Module

**Step 1: Teams.jsx**
```javascript
{ key: 'Inventory', actions: ['list', 'create', 'edit', 'delete'] }
```

**Step 2: AdminPanel.jsx**
```javascript
{ key: 'inventory', label: 'Inventory Management', hasLimit: false }
```

**Step 3: usePlanEnforcement.js**
```javascript
inventory: 'inventory',
```

**Step 4: Sidebar.jsx**
```javascript
{ id: 'inventory', label: '📦 Inventory', ... }
```

**Step 5: App.jsx**
```javascript
{ id: 'inventory', path: '/#/inventory', component: <InventoryView ... /> }
```

Now the module is fully integrated with roles, plans, and routing!
