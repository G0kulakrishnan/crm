---
name: Teams Module Architecture
description: Team management, role-based permissions, call logs, attendance, team performance
type: project
---

## Teams Module Overview

**File:** `src/components/Work/Teams.jsx` (900+ lines)

**Purpose:** Manage team members, roles, permissions, call logs, attendance, and team performance tracking.

## Tabs

1. **Members** — Add, edit, delete team members; set passwords; assign roles
2. **Roles & Permissions** — Define roles and module/action permissions
3. **Attendance** — Daily check-in/check-out, attendance summary
4. **Call Logs** — Incoming/outgoing call tracking with duration, outcome, assignment
5. **Team Performance** — Analytics dashboard (call count, lead conversion, task completion)

## Team Members

### Data Schema
```javascript
EMPTY_MEMBER = {
  name: '',                    // Required
  email: '',                   // Required, unique per workspace
  phone: '',                   // Optional
  role: 'Sales',               // Role name (references defined roles)
  active: true,                // Active/inactive flag
  password: ''                 // Set by owner via "Set Password" modal
}
```

**Auto-generated:** `id`, `userId`, `createdAt`

### Member Management

**Add Member:**
1. Click "Add Team Member" → modal form
2. Enter name, email, phone, select role
3. Save → creates teamMembers record
4. Owner then clicks "Set Password" → generates unique link or sets directly

**Edit Member:**
- Click edit → modify name, email, phone, role
- Role can be changed anytime

**Delete Member (Hard Delete):**
1. Confirm deletion dialog
2. Deletes teamMembers record
3. Cascades:
   - All attendance records for this member deleted
   - Lead/invoice/task assignments preserved (not deleted)
   - Activity logs where `actorId` = member deleted

**Permissions:**
- `perms.can('Teams', 'create')` — Add team members
- `perms.can('Teams', 'edit')` — Edit role, set password
- `perms.can('Teams', 'delete')` — Delete team members
- Team member count limited by plan: `planEnforcement.getLimit('maxUsers')`

## Roles & Permissions

### Module Definition
```javascript
MODULES = [
  { key: 'Dashboard', actions: ['view'] },
  { key: 'Leads', actions: ['list', 'create', 'edit', 'delete'] },
  { key: 'Customers', actions: ['list', 'create', 'edit', 'delete'] },
  // ... 20+ modules
]
```

### Role Schema
```javascript
ROLE = {
  name: 'Sales',               // Role name
  perms: {                     // Module → actions mapping
    Dashboard: ['view'],
    Leads: ['list', 'create', 'edit'],
    Invoices: ['list', 'create'],
    // ...
  }
}
```

### Default Roles
- **Admin:** Full access to all modules + actions (except hardcoded Admin/Settings)
- **Sales:** Dashboard (view), Leads (list/create/edit), Customers (list), Quotations (list/create), Products (list)

### Permission Checking

**In components:**
```javascript
const canCreate = perms?.can('Leads', 'create') === true;
const canEdit = perms?.can('Invoices', 'edit') === true;
```

**Hardcoded restrictions:**
- Team members CANNOT access Admin module
- Team members CANNOT access Settings module
- Owners always have full access

### Edit Permissions Modal

**Grid layout:**
- Rows: Each module (24 total)
- Columns: Module name + "All" checkbox + 5 action columns (list, view, create, edit, delete)
- "All" checkbox toggles all actions for module
- Individual checkboxes toggle specific actions
- Non-applicable actions show "—" (e.g., Dashboard has no create/edit/delete)

**Plan filtering:** Only shows modules enabled in business plan (via `planEnforcement.isModuleEnabled()`)

## Call Logs

### Team Member Call Summary Table

**Columns:**
- Member name
- Total calls (all calls for member today or filtered date range)
- Connected (calls with duration > 0 OR outcome = "Connected")
- To Leads (calls with leadId set)
- Unknown (calls without leadId)
- Outgoing, Incoming, Missed (directional counts)
- Not Picked (outgoing calls with no duration and no connection)

**Date Range:**
- Default: Today
- User selectable: From date → To date range
- Shows "Today (YYYY-MM-DD)" or "From X to Y" label

**Click row:** Filters call logs to show only that member's calls

### Call Log Tab (Full List)

**Columns:** Direction, Phone, Contact, Lead, Outcome, Duration (mm:ss format), Staff, Date & Time, Notes

**Filters:** Phone/name search, direction (all/incoming/outgoing), date range, staff member

**Bulk import:** CSV upload with auto-mapping

**Manual log:** Create call record manually (direction, phone, outcome, duration, notes, assigned staff)

## Attendance

### Check-in/Check-out

**Feature:**
- Team member clicks "Check In" → logs GPS location + address + timestamp
- Clicks "Check Out" → logs end time
- Appears in attendance tab as daily record

**Data stored:**
```javascript
ATTENDANCE = {
  email: '',                   // Team member email
  date: '',                    // ISO date
  checkInTime: '',             // ISO timestamp
  checkOutTime: '',            // ISO timestamp (null if not checked out)
  checkInLat: 0,               // Latitude
  checkInLng: 0,               // Longitude
  checkInAddress: '',          // Geocoded address
  userId: ''                   // Owner ID
}
```

### Attendance Summary

**Table view:**
- Filter by date range (default: month start to today)
- Columns: Date, Member Name, Check-in Time, Check-out Time, Check-in Location, Duration
- Pagination: 25/50/100 rows

**Filters:**
- Staff member dropdown (show all or filter)
- Date range

## Team Performance Dashboard

**Metrics (calculated from related records):**
- Total calls, connected calls, missed calls, avg duration per member
- Leads assigned, leads converted to customers
- Invoices created, quotations sent, tasks completed
- Attendance trends

**Charts:**
- Call activity per member (bar chart)
- Lead conversion funnel
- Task completion rate

## Hard Delete Behavior

**On delete team member:**
1. teamMembers record deleted
2. All attendance records for member deleted
3. activityLogs where `actorId` = member deleted
4. Lead assignments NOT removed (preserved with member name for historical accuracy)
5. Invoices/tasks NOT deleted

## Plan Enforcement

- Max users enforced: `planEnforcement.getLimit('maxUsers')`
- When adding member: Check `team.length < maxUsers`
- Error: "Team member limit reached for your plan. Please upgrade."

## Permissions in Teams Module

- `perms.can('Teams', 'create')` — Add team members
- `perms.can('Teams', 'edit')` — Edit members, manage roles
- `perms.can('Teams', 'delete')` — Delete team members

**Visibility:**
- Only owner/admin can access Teams tab
- Team members cannot see other team members or manage roles

## DB Collections Used

| Collection | Purpose |
|---|---|
| `teamMembers` | Team member records |
| `userProfiles` | Role definitions (roles array) |
| `callLogs` | Call tracking |
| `attendance` | Check-in/check-out records |
| `activityLogs` | Audit trail |
| `leads`, `invoices`, `quotations`, `tasks` | Linked work records |

## Important Notes

- **Hardcoded Admin/Settings blocks** — Can't be granted to team members
- **Password reset:** Owner must manually set via modal (no self-service)
- **Role updates:** Changes take immediate effect for all team members with that role
- **Module filtering:** Permissions grid only shows modules in plan (via useMemo with planEnforcement)
- **Call log duration:** Format changed to mm:ss (e.g., 1:30 instead of 90s)
- **Not Picked column:** New visual clarity for unanswered outgoing calls
- **No team privacy** — All team members see all leads/invoices (unless teamCanSeeAllLeads = false)
- **Attendance optional** — Not enforced; purely for tracking
