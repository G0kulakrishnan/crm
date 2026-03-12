# TechCRM API Documentation

This document outlines the API structure and data models for TechCRM, to assist in independent mobile app development.

## InstantDB Configuration
- **App ID**: `19c240f7-1ba0-486a-95b4-adb651f63cfd`
- **SDK**: Use the InstantDB SDK for Flutter.
- **Filtering**: Every query MUST include `.where({ userId: ownerId })`.

---

## 1. Authentication & RBAC

### Login
- **Endpoint**: `POST /api/auth/login` (Full URL: `https://mycrm.t2gcrm.in/api/auth/login`)
- **Body**: `{ "email": "...", "password": "..." }`
- **Response**: 
  ```json
  {
    "success": true, 
    "token": "...", 
    "isTeamMember": boolean, 
    "role": "Owner|Sales|...", 
    "perms": { "Module": ["list", "edit"] },
    "ownerUserId": "...",
    "teamMemberId": "..."
  }
  ```
- **Action**: Use the returned `token` with `db.auth.signInWithToken(token)`.

### Register
- **Endpoint**: `POST /api/auth/register`
- **Body**: `{ "email": "...", "password": "...", "fullName": "...", "bizName": "...", "phone": "...", "selectedPlan": "Trial" }`
- **Response**: `{ "success": true, "token": "...", "message": "Registered successfully" }`

### Roles Check
- **Endpoint**: `GET/POST /api/auth/roles`
- **Auth**: Use the logged-in email.
- **Purpose**: Dynamically check permissions for a user across different businesses.

### Password Reset
- **Action 'request'**: `POST /api/auth/reset-password` with `{ "action": "request", "email": "..." }`.
- **Action 'verify'**: `POST /api/auth/reset-password` with `{ "action": "verify", "email": "...", "code": "...", "newPassword": "..." }`.

### Change Password
- **Endpoint**: `POST /api/auth/change-password`
- **Body**: `{ "email": "...", "newPassword": "...", "userId": "..." }`

### Set Team Password (First-time setup)
- **Endpoint**: `POST /api/auth/set-team-password`
- **Body**: `{ "email": "...", "password": "...", "ownerUserId": "...", "teamMemberId": "..." }`
- **Purpose**: Used for team members to set their initial password after being invited.

---

## 2. Communications

### Send Email (SMTP)
- **Endpoint**: `POST /api/send-email`
- **Body**: `{ "to": "...", "subject": "...", "body": "...", "ownerId": "...", "fromName": "..." }`
- **Note**: Connects via the SMTP settings stored in the owner's `userProfiles`.

### Send WhatsApp (Meta Cloud API)
- **Endpoint**: `POST /api/send-whatsapp`
- **Body**: `{ "to": "...", "message": "...", "ownerId": "..." }`
- **Note**: Uses the WhatsApp Token and Phone Number ID from the owner's `userProfiles`.

---

## 3. Data Model (Namespaces)

### `userProfiles` (App Configuration)
**CRITICAL**: Fetch this first to get dynamic settings.
- `userId`: Owner ID.
- `stages`, `sources`, `labels`: Lists for Leads.
- `taskStatuses`: List for Tasks.
- `expCats`: Expense categories.
- `taxRates`: `{ label, rate }` objects.
- `customFields`: `{ name, type, options, required }`.
- `businessSettings`: Company info (Address, Email, Phone, Logo, etc.).

### `leads`
- `name`, `email`, `phone`, `source`, `stage`, `label`, `notes`, `assign`, `followup`, `custom` (Map).

### `invoices` & `quotations`
- `no`: Document number (e.g., INV/2025/001).
- `client`: Customer name matching a `leads` or `customers` record.
- `items`: `List<{ name, desc, qty, rate, taxRate }>`.
- `disc`, `discType`, `adj`, `total`, `taxAmt`.
- `payments`: `List<{ date, amount }>` (Invoices only).
- **AMC Integration**: `isAmc`, `amcPlan`, `amcAmount`, `amcTaxRate`, `amcCycle`, `amcStart`, `amcEnd`.
- `shipTo`: Shipping address.

### `expenses`
- `desc`, `category`, `amount`, `date`, `status`, `taxRate`, `taxAmt`.

### `activityLogs`
- `entityId`, `entityType`, `text`, `userName`, `createdAt`.

---

## 4. Permissions Schema
Located in `userProfiles.roles`. The mobile app should hide modules where the user has an empty array or missing key.
```json
{
  "name": "Sales",
  "perms": {
    "Leads": ["list", "create", "edit"],
    "Invoices": ["list"]
  }
}
```

---

## 5. Implementation Tips
1. **Multi-Tenancy**: Always filter your queries: `db.useQuery({ leads: { $: { where: { userId: ownerId } } } })`.
2. **Activity Logging**: Log every transaction in `activityLogs` to maintain an audit trail.
3. **Magic Links**: InstantDB supports Magic Link auth. Use `db.auth.sendMagicCode` and `db.auth.verifyMagicCode` from the SDK.
