# TechCRM API Documentation

This document outlines the API structure and data models for TechCRM, to assist in independent mobile app development.

## InstantDB Configuration
- **App ID**: `19c240f7-1ba0-486a-95b4-adb651f63cfd`
- **SDK**: Use the InstantDB SDK for your platform (JavaScript/React, Flutter, etc.)

- **Modules Required**: CRM (Leads/Customers), Projects, Tasks, Finance (Invoices/Quotations/Expenses).
- **Excluded**: POS Billing.

## Authorization & Roles (RBAC)
The mobile app MUST enforce the same permissions as the web dashboard.

### 1. Identify User Status
- **Owner**: If the logged-in user's ID matches `userProfiles.userId`, they are the owner and have full access.
- **Team Member**: If the user is found in the `teamMembers` namespace:
  - Match their `email` to find their `role` (e.g., 'Sales', 'Manager').
  - Lookup this role in `userProfiles.roles` to get their `perms` object.

### 2. Permissions Schema
The `userProfiles.roles` array contains definitions like:
```json
{
  "name": "Sales",
  "perms": {
    "Leads": ["list", "create", "edit"],
    "Projects": ["list"],
    "Invoices": [] // Empty means NO access to Finance
  }
}
```

### 3. Enforcement Logic
Before showing the **Finance** module (Invoices, Quotations, Expenses):
1. Fetch the user's role from `teamMembers`.
2. Find that role's permissions in `userProfiles.roles`.
3. If the module name (e.g., 'Invoices') is not in the `perms` object or has an empty array, **hide the Finance menu/navigation** in the mobile app.

## Data Model (Namespaces)

### `userProfiles` (App Configuration)
**CRITICAL**: The mobile app must fetch configuration from here to show dynamic stages, labels, and fields.
- **Fields**:
  - `userId` (String)
  - `stages` (List<String>): Lead stages (e.g., 'New', 'Contacted')
  - `sources` (List<String>): Lead sources (e.g., 'Website', 'Google')
  - `labels` (List<String>): Lead labels (e.g., 'Warm', 'Hot')
  - `customFields` (List<Map>): `{ name, type, required }` for Leads/Customers
  - `taskStatuses` (List<String>): Statuses for Tasks (e.g., 'Pending', 'In Progress')
  - `expCats` (List<String>): Expense categories (e.g., 'Travel', 'Office')
  - `businessSettings` (Map): Company details used in Invoices.

### `leads`
Main namespace for managing sales opportunities.
- **Fields**:
  - `name`, `email`, `phone`, `source`, `stage`, `label`, `notes` (String)
  - `assign` (String): Assigned user name/email
  - `followup` (DateTime string)
  - `custom` (Map): Key-value pairs matching `userProfiles.customFields`
  - `userId` (String): Account Owner ID (Critical for filtering)
  - `actorId` (String): ID of user who created/edited

### `projects`
- **Fields**:
  - `name`, `client`, `status`, `desc`, `assignTo` (String)
  - `startDate`, `endDate` (Date string)
  - `userId`, `actorId` (String)

### `tasks`
- **Fields**:
  - `title`, `assignTo`, `priority`, `status`, `notes`, `client` (String)
  - `dueDate` (Date string)
  - `projectId` (String): Links to a project
  - `userId`, `actorId` (String)

### `invoices` & `quotations`
Financial documents created for customers.
- **Fields**:
  - `no` (String): Invoice/Quote number
  - `client` (String): Customer/Lead name
  - `items` (List<Map>): `{ name, desc, qty, rate, taxRate }`
  - `total`, `sub`, `taxTotal`, `discAmt`, `adj` (Number)
  - `status` (String): 'Draft', 'Sent', 'Paid'
  - `dueDate` (Date string)
  - `userId`, `actorId` (String)

### `expenses`
- **Fields**:
  - `desc`, `category`, `status`, `notes` (String)
  - `date` (Date string)
  - `amount`, `taxRate`, `taxAmt` (Number)
  - `userId`, `actorId` (String)

### `activityLogs`
Audit trail for all entities.
- **Fields**: `entityId`, `entityType`, `text`, `userName`, `createdAt`

## Serverless Function Endpoints (Vercel)
**Base URL**: `https://mycrm.t2gcrm.in`

### Authentication
Endpoints for session management.

#### Login
- **Endpoint**: `POST /api/auth/login` (Full URL: `https://mycrm.t2gcrm.in/api/auth/login`)
- **Body**: `{ "email": "...", "password": "..." }`
- **Returns**: `{ "success": true, "token": "...", "isTeamMember": boolean }`
- **Note**: Use the returned token with `db.auth.signInWithToken(token)` in InstantDB.

#### Password Reset
- **Endpoint**: `POST /api/auth/reset-password` (Full URL: `https://mycrm.t2gcrm.in/api/auth/reset-password`)
- **Body (Request OTP)**: `{ "action": "request", "email": "..." }`
- **Body (Verify & Reset)**: `{ "action": "verify", "email": "...", "code": "...", "newPassword": "..." }`

## Data Operations (CRUD)
The mobile app can fully edit data using InstantDB Transactions (`db.transact`).

### Update Lead Stage
To change a lead's status:
```javascript
db.transact([
  db.tx.leads[leadId].update({ stage: 'Contacted' })
])
```

### Log Activity
Every edit should be accompanied by an activity log entry:
```javascript
db.transact([
  db.tx.activityLogs[id()].update({
    entityId: leadId,
    entityType: 'lead',
    text: 'Stage changed to Contacted',
    userName: currentUserEmail,
    createdAt: Date.now()
  })
])
```

### Create Project from Lead
```javascript
db.transact([
  db.tx.projects[id()].update({ name: 'New Project', userId: ownerId }),
  db.tx.leads[leadId].update({ stage: 'Won' }) // Convert lead to Won
])
```

## Integration Tips
1. **Multi-Tenancy**: The mobile app MUST filter every query with `$.where({ userId: ownerId })` to ensure data isolation.
2. **Real-time Sync**: Use `db.subscribe` for live updates on the Dashboard and Lead lists.
3. **Dual Auth**: 
   - **Magic Link**: Use `db.auth.sendMagicCode` and `db.auth.verifyMagicCode` from the InstantDB SDK.
   - **Password**: Call the custom `/api/auth/login` endpoint to get a token, then use `db.auth.signInWithToken(token)`.
