---
name: Leads Module Architecture
description: Complete guide to lead management system, stages, integrations, custom fields, and data flow
type: project
---

## Leads Module Overview

**File:** `src/components/Leads/LeadsView.jsx` (1695 lines)

**Purpose:** Complete lead lifecycle management — create, edit, bulk operations, stage workflows, integrations (CSV/Google Sheets), custom fields, activity logging, dual views (list & kanban).

## Data Schema

```javascript
EMPTY_LEAD = {
  name: '',                    // Required
  companyName: '',             // Optional
  email: '',                   // Validated for duplicates
  phone: '',                   // Formatted, validated for duplicates
  source: '',                  // From userProfiles.sources
  stage: '',                   // From userProfiles.stages
  assign: '',                  // Team member email/name
  followup: '',                // ISO datetime
  requirement: '',             // From userProfiles.requirements
  notes: '',                   // Internal notes
  productCat: '',              // Product category
  remWA: false,                // WhatsApp reminder
  remEmail: true,              // Email reminder (default)
  remSMS: false,               // SMS reminder
  retailerId: '',              // Link to partner
  distributorId: '',           // Link to distributor
  custom: {}                   // Dynamic custom fields
}
```

**Auto-generated fields:** `id`, `userId`, `actorId`, `createdAt`, `updatedAt`, `stageChangedAt`

## Views

### List View (Default)
- Paginated table (25/50/100/500/All rows)
- Filter by: Source, Stage, Staff assignment
- Tab filters: All, Today, Tomorrow, Next 7 Days, Overdue
- Search: Name, email, phone, source, stage, assign, notes
- Bulk actions: Select multiple → Assign/Change Stage/Delete
- Configure View: Column visibility, visible stages, default page size (localStorage)

### Kanban View
- Columns by stage (auto-generated)
- Drag-and-drop stage updates with `stageChangedAt` timestamp
- Same filters apply (source, stage, staff, search)
- Cards show: Name, source, phone, edit/convert/delete buttons

## Stages & Workflow

**Default:** New Enquiry → Enquiry Contacted → Quotation Created → ... → Won/Lost

**Customization:**
- `userProfiles.stages` — Custom stage list (owner can reorder)
- `userProfiles.disabledStages` — Hide stages from UI (don't delete)
- `userProfiles.wonStage` — Which stage triggers auto-conversion to customer (default: 'Won')

**Stage Change Behavior:**
1. Updates `stage` field
2. Sets `stageChangedAt = Date.now()`
3. Logs activity with actor info
4. If new stage matches `wonStage`: Auto-creates customer record

## Integrations

### CSV Import
- User selects CSV file → auto-maps columns (name, email, phone, source, stage, etc.)
- Modal confirms mappings (column or fixed value)
- Validates: Name required, stage/source must exist
- Duplicate check across leads + customers
- Batch import: 50 leads per transaction
- Activity log created for skipped/invalid rows

### Google Sheets
- Apps Script calls POST `/api/webhook/gsheets`
- Mapping stored in `userProfiles.gsheets[0]`
- Auto-dedup by email/phone (updates if duplicate found, doesn't create new)
- Phone formatting: Strips non-digits, preserves leading +
- Disabled flag per integration + global `gsheetsDisabled`

### Future
- JustDial, IndiaMART webhook handlers ready (pattern: `/api/webhook/[source].js`)

## Custom Fields

**Definition:** `userProfiles.customFields` array
```javascript
{ name: "Budget", type: "text|number|dropdown", options: "Opt1,Opt2" }
```

**Storage:** `lead.custom = { fieldName: value }`

**Features:**
- Rendered in create/edit modal with appropriate input type
- Searchable in list view
- Exportable/importable in CSV
- Column visibility configurable

## Activity & Audit Logging

**Auto-logged events:**
- Lead created: "Lead created | Follow Up set to [date]"
- Lead updated: Field-by-field changes with old → new values
- Stage change: "Stage changed from X to Y (drag & drop)"
- Conversion: "Manually converted to Customer. Stage changed to Won."
- Bulk ops: "Bulk assigned to [name]" or "Bulk status changed to [stage]"
- Delete: "Lead deleted from CRM"

**DB collection:** `activityLogs` with entityId, entityType, text, userId, actorId, createdAt

**Timeline:** Detail view shows last 100 logs (sorted DESC by createdAt)

## Permissions

- `perms.can('Leads', 'create')` — Create, import, template download
- `perms.can('Leads', 'edit')` — Edit, convert, bulk assign/stage, call logging
- `perms.can('Leads', 'delete')` — Delete single or bulk

**Visibility Control:**
- `userProfiles.teamCanSeeAllLeads` (default: true)
  - If false: Non-owners see only unassigned + their assigned leads
  - If true: Non-owners see all leads

## Hard Delete Behavior

**Cascading delete:**
1. Lead deleted
2. All activityLogs linked to lead deleted (entityId match)
3. All tasks linked to lead deleted (entityId match)
4. Call logs preserved (historical record)

**No soft delete** — Confirmation dialog, then permanent removal from DB.

## Performance Notes

**Queries:**
- Single mount query: leads, customers, teamMembers, userProfiles, activityLogs (limit 100), callLogs, partnerApplications
- All filtering client-side with useMemo (date filters, source/stage/staff dropdowns, search)

**Pagination:** User-configurable default page size, persisted in localStorage

**Gotchas:**
1. Custom field name changes don't migrate old data (orphaned)
2. Phone normalization differs between CSV (strips all) vs Sheets (preserves +)
3. Kanban column order depends on stage order in profile; disabled stages hidden but not deleted
4. View config (visible stages) stored per-user in localStorage; conflicts if settings change
5. Bulk operations use Promise.all() without error handling (partial success silent)
6. CSV export columns may not match import order
7. Activity logs limited to 100 in initial query (may miss older logs)
8. Auto-convert to customer creates NEW customer record (no de-duplication check)

## Key Functions

- `save()` — Create/edit lead, validate, log activity, trigger auto-notifications
- `convertToCustomer(lead)` — Creates customer, updates lead stage to wonStage
- `logActivity(text)` — Log to activityLogs collection
- `handleBulkAction(action, selectedIds)` — Bulk assign/stage/delete with Promise.all()
- `handleDragEnd(leadId, newStage)` — Kanban drag-drop, stage update, activity log
- `importFromCSV(file)` — Parse CSV, map columns, validate, batch create
- `fireAutoNotifications(trigger, lead)` — WhatsApp/email on creation

## DB Collections Used

| Collection | Purpose |
|---|---|
| `leads` | Main lead records |
| `customers` | Converted leads |
| `teamMembers` | Assignment targets |
| `userProfiles` | Settings (stages, sources, custom fields, wonStage) |
| `activityLogs` | Audit trail |
| `callLogs` | Call history |
| `partnerApplications` | Partner/distributor records |
