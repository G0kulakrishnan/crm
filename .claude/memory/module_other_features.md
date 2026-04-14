---
name: Other Features & Modules
description: Projects, Tasks, Appointments, Automation, E-commerce, Integrations, Call Logs, Attendance
type: project
---

## Projects Module

**File:** `src/components/Work/ProjectsView.jsx`

**Purpose:** Project management with task tracking, team assignments, timeline.

**Schema:**
```javascript
PROJECT = {
  name: '',                    // Required
  description: '',
  client: '',                  // Customer name
  status: 'Active',            // Active, On Hold, Completed
  startDate: '',               // ISO date
  endDate: '',                 // ISO date
  team: [],                    // Array of team member IDs
  budget: 0,
  spent: 0,
  tasks: []                    // Linked task IDs
}
```

**Features:**
- Create/edit/delete projects
- Assign team members to project
- Track project status (Active/On Hold/Completed)
- Link tasks to project
- View project timeline (start → end date)

**Hard delete:** Deletes project + all linked activityLogs. Tasks preserved.

---

## Tasks Module

**File:** `src/components/Work/TasksView.jsx`

**Purpose:** Task tracking with status, priority, assignment, reminders.

**Schema:**
```javascript
TASK = {
  title: '',                   // Required
  description: '',
  status: 'Open',              // Open, In Progress, Completed
  priority: 'Medium',          // Low, Medium, High, Urgent
  dueDate: '',                 // ISO date
  assign: '',                  // Team member email
  projectId: '',               // Link to project
  entityType: '',              // lead, customer, invoice (optional)
  entityId: '',                // ID of linked record
  reminders: []                // Array of reminder settings
}
```

**Features:**
- Create inline or via modal
- Kanban view by status (Open → In Progress → Completed)
- Bulk edit (status, priority, assignment)
- Drag-and-drop status update
- Linked to lead/customer/invoice (optional)
- Reminder notifications

**Hard delete:** Deletes task + activityLogs

---

## Appointments Module

**File:** `src/components/Appointments/AppointmentBooking.jsx`

**Purpose:** Booking system with slot management, customer scheduling, reminders.

**Schema:**
```javascript
APPOINTMENT = {
  customerId: '',              // Customer being scheduled
  date: '',                    // ISO date
  time: '',                    // HH:MM format
  type: '',                    // Type/category
  notes: '',                   // Appointment notes
  status: 'Scheduled',         // Scheduled, Completed, Cancelled
  reminderEmail: true,         // Email reminder
  reminderSMS: false,          // SMS reminder
  assignedTo: ''               // Staff member
}
```

**Features:**
- Time slot availability (configurable max appointments per slot)
- Public booking link (customers can self-schedule)
- Calendar view with time slots
- Automatic reminders (email/SMS)
- Confirmation emails

**Hard delete:** Deletes appointment + activityLogs

---

## Automation Engine (Email Workflows)

**File:** `/api/cron/process-automations.js` (runs every 60 seconds)

**Purpose:** Automated email sending based on triggers.

**Trigger Types:**
- `stage-change` — Lead stage updated
- `amc-expiry` — AMC expiry date reached
- `new-appointment` — Appointment created
- `ecom-order` — E-commerce order placed

**Automation Schema:**
```javascript
AUTOMATION = {
  name: '',                    // Rule name
  trigger: 'stage-change',     // Trigger type
  targetStage: 'Won',          // For stage-change trigger
  recipientType: 'customer',   // customer, owner, team
  recipientEmail: '',          // If specific recipient
  subject: '',                 // Email subject
  body: '',                    // Email body (supports {{variable}} substitution)
  active: true
}
```

**Variable substitution:**
- `{{leadName}}`, `{{customerEmail}}`, `{{phone}}`, `{{source}}`, `{{stage}}`
- `{{invoiceNo}}`, `{{totalAmount}}`, `{{dueDate}}`

**Deduplication:** `executedAutomations` collection stores (userId, automationId, triggeredRecordId, timestamp). Prevents duplicate emails within same minute.

**Hard delete:** Deletes automation + clears executedAutomations entries

---

## E-commerce Module

**File:** `src/components/Ecommerce/` (multiple files)

**Purpose:** Public store, product catalog, shopping cart, checkout, order tracking.

**Collections:**
- `orders` — Customer orders (items, total, status, payment)
- `ecomCustomers` — E-commerce customer records
- `ecomSettings` — Store config (name, logo, favicon, tax)
- `products` — Store inventory (name, price, tax, image)

**Checkout Flow:**
1. Customer adds items to cart
2. Proceeds to checkout
3. Enters shipping/payment info
4. Creates invoice (via `/api/ecom/checkout`)
5. Sends confirmation email with order details
6. Creates order record in `orders` collection
7. Creates/updates customer record in `ecomCustomers`

**Order Tracking:** Public order status page (order # lookup) shows status (pending, processing, shipped, delivered)

**Hard delete:** Deletes order + activityLogs. Invoice preserved.

---

## Integrations

**File:** `src/components/System/Integrations.jsx`

**Purpose:** Connect external lead sources (Google Sheets, IndiaMART, JustDial).

### Google Sheets
- **Setup:** Share Google Sheet + configure field mapping
- **Webhook:** Apps Script calls POST `/api/webhook/gsheets`
- **Mapping:** Column → Lead field or Fixed value
- **Dedup:** By phone/email (updates existing, doesn't create new)

### IndiaMART
- **Setup:** Enter API credentials + configure mapping
- **Sync:** Manual "Sync Now" or auto-webhook
- **Webhook:** POST `/api/webhook/indiamart`
- **Pull API:** GET with cursor-based pagination

### JustDial
- **Setup:** Configure webhook URL in JustDial portal
- **Webhook:** POST `/api/webhook/justdial` (only)
- **No pull API** — Webhook-only integration

**Configuration stored:** `userProfiles.gsheets[]`, `userProfiles.indiamart[]`, `userProfiles.justdial[]`

**Hard delete:** Clears configuration (doesn't delete already-synced leads)

---

## Call Logs

**File:** `src/components/CallLogs/CallLogs.jsx`

**Purpose:** Track incoming/outgoing calls, duration, outcomes, assign to leads.

**Schema:**
```javascript
CALL_LOG = {
  phone: '',                   // Phone number called/received
  contactName: '',             // Contact name
  direction: 'Outgoing',       // Incoming, Outgoing, Missed
  outcome: 'Connected',        // Connected, No Answer, Busy, Voicemail, Wrong Number
  duration: 0,                 // Seconds
  notes: '',                   // Call notes
  leadId: '',                  // Linked lead
  leadName: '',                // Auto-filled from lead
  staffEmail: '',              // Staff member
  staffName: '',               // Staff name
  source: 'android'            // android, api (manual)
}
```

**Features:**
- Manual entry (create call log form)
- Android app sync (batch upload)
- Duration in mm:ss format
- "Not Picked" status for unanswered outgoing calls (new)
- Team summary table with Connected/Not Picked/Missed counts
- Date range filtering

**Auto-import:** Android app syncs periodically via POST `/api/call-logs`

**Hard delete:** Deletes call log + activityLogs

---

## Attendance

**File:** Team module, Attendance tab

**Purpose:** Daily check-in/check-out tracking with GPS location.

**Schema:**
```javascript
ATTENDANCE = {
  email: '',                   // Team member email
  date: '',                    // ISO date (YYYY-MM-DD)
  checkInTime: '',             // ISO timestamp
  checkOutTime: '',            // ISO timestamp
  checkInLat: 0,               // Latitude
  checkInLng: 0,               // Longitude
  checkInAddress: '',          // Geocoded address
  userId: ''                   // Owner ID
}
```

**Features:**
- One-click "Check In" → captures GPS + address
- "Check Out" → logs end time
- Monthly attendance report (summary table)
- Summary view with duration calculation

**Hard delete:** Deletes attendance record

---

## Reports & Analytics

**File:** `src/components/Reports/`

**Purpose:** Business analytics and KPIs.

**Dashboards:**
- Lead funnel (by stage)
- Conversion rate (leads → customers)
- Revenue trends (invoices, quotations, AMC)
- Team performance (calls, leads converted, tasks)
- Product sales breakdown

**Export:** CSV, PDF (via browser print)

---

## Admin Panel

**File:** `src/components/Admin/AdminPanel.jsx`

**Purpose:** Multi-tenant administration (plans, businesses, global settings, API docs).

**Tabs:**
- **Users:** Create/delete business accounts (superadmin only)
- **Plans:** Define billing plans (modules, limits, features)
- **Analytics:** System-wide metrics
- **API Docs:** Developer documentation

**Hard delete:** Delete business → cascades to delete all data for that business (all collections filtered by userId)

---

## Business Settings

**File:** `src/components/Settings/`

**Purpose:** Workspace configuration (stages, sources, custom fields, SMTP, reminders, etc.)

**Configurable:**
- Lead stages (add/remove/reorder/disable)
- Sources (lead origins)
- Requirements (business needs)
- Custom fields (name, type, options)
- Email templates (for automations, invoices, quotations)
- SMTP config (for sending emails)
- WhatsApp config (for notifications)
- Reminder settings (email/SMS toggles)
- Partner settings (distributor/retailer segment)

**Storage:** All in `userProfiles` document (single record per workspace)

---

## Common Patterns Across All Modules

1. **Hard delete only** — No soft deletes or archives
2. **Cascading deletes** — Parent deletion deletes activityLogs; preserves linked invoices/orders
3. **Activity logging** — Every CRUD operation logged
4. **Pagination** — 25/50/100/All rows configurable
5. **Bulk operations** — Select multiple + apply action
6. **Status workflows** — Step progression (Draft → Sent → Approved)
7. **Role-based visibility** — Filtered by perms + teamCanSeeAllLeads setting
8. **Plan enforcement** — Module gating by planEnforcement hook
9. **Email templates** — Customizable per workspace (SMTP config)
10. **Timestamps** — createdAt, updatedAt on all records; some have status-specific timestamps (sentAt, paidAt, etc.)
