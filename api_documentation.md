# T2GCRM API Documentation

Complete technical reference for the T2GCRM backend API. All endpoints use JSON payloads and return JSON responses.

**Base URL**: `https://crm.t2gcrm.in` (or your custom CRM domain)

---

## 1. Authentication — `/api/auth`

All auth endpoints accept `POST` with `action` field to determine the operation.

---

### `login` — Authenticate User

**Request**
```json
{
  "action": "login",
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Success Response** `200`
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "isTeamMember": false,
  "isPartner": false,
  "role": "Owner",
  "perms": null,
  "ownerUserId": "WORKSPACE_ID",
  "teamMemberId": null,
  "partnerId": null
}
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Email and password are required" }` |
| `401` | `{ "error": "Invalid email or password" }` |
| `403` | `{ "error": "Email verification pending", "message": "Please verify your email using the OTP sent during registration." }` |

---

### `register` — Create New Account

**Request**
```json
{
  "action": "register",
  "email": "user@example.com",
  "password": "strongpassword",
  "fullName": "John Doe",
  "bizName": "Acme Corp",
  "phone": "9876543210",
  "selectedPlan": "Trial"
}
```

**Success Response** `200`
```json
{
  "success": true,
  "otp": "123456",
  "message": "Registration successful. Verify OTP."
}
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Email and password are required" }` |
| `400` | `{ "error": "User already exists" }` |

---

### `verify-otp` — Verify Email OTP

**Request**
```json
{
  "action": "verify-otp",
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response** `200`
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "message": "Verified and logged in"
}
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Email and OTP are required" }` |
| `400` | `{ "error": "Already verified" }` |
| `401` | `{ "error": "Invalid OTP" }` |
| `404` | `{ "error": "User not found" }` |

---

### `roles` — Lookup User Role & Workspace

**Request**
```json
{
  "action": "roles",
  "email": "user@example.com"
}
```

**Success Response (Owner)** `200`
```json
{
  "success": true,
  "isOwner": true,
  "isTeamMember": false,
  "isPartner": false,
  "role": "Owner",
  "perms": null,
  "ownerUserId": "WORKSPACE_ID"
}
```

**Success Response (Team Member)** `200`
```json
{
  "success": true,
  "isOwner": false,
  "isTeamMember": true,
  "isPartner": false,
  "role": "Sales Manager",
  "perms": { "Leads": ["list", "create", "edit"] },
  "ownerUserId": "WORKSPACE_ID",
  "teamMemberId": "MEMBER_ID",
  "name": "John Doe"
}
```

**Success Response (Partner)** `200`
```json
{
  "success": true,
  "isOwner": false,
  "isTeamMember": false,
  "isPartner": true,
  "role": "Distributor",
  "perms": null,
  "ownerUserId": "WORKSPACE_ID",
  "partnerId": "PARTNER_ID",
  "name": "Partner Corp"
}
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Email is required" }` |
| `404` | `{ "error": "User not found in any business" }` |
| `404` | `{ "error": "Business profile not found" }` |

---

### `change-password` — Update Password

**Request**
```json
{
  "action": "change-password",
  "email": "user@example.com",
  "newPassword": "newSecurePass123"
}
```

**Success Response** `200`
```json
{ "success": true, "message": "Password updated" }
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Required fields missing" }` |
| `400` | `{ "error": "userId required to create credentials" }` |

---

### `reset-password-request` — Request Password Reset OTP

**Request**
```json
{
  "action": "reset-password-request",
  "email": "user@example.com"
}
```

**Success Response** `200`
```json
{ "success": true, "otp": "654321", "message": "OTP generated" }
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Email required" }` |
| `404` | `{ "error": "User not found" }` |

---

### `reset-password-verify` — Verify OTP & Set New Password

**Request**
```json
{
  "action": "reset-password-verify",
  "email": "user@example.com",
  "code": "654321",
  "newPassword": "newSecurePass"
}
```

**Success Response** `200`
```json
{ "success": true, "message": "Password updated" }
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Required fields missing" }` |
| `400` | `{ "error": "Invalid or expired code" }` |

---

### `set-team-password` — Set Team Member Credentials

**Request**
```json
{
  "action": "set-team-password",
  "email": "member@team.com",
  "password": "teamPass123",
  "ownerUserId": "WORKSPACE_ID",
  "teamMemberId": "MEMBER_ID"
}
```

**Success Response** `200`
```json
{ "success": true, "message": "Password set" }
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Required fields missing" }` |

---

### `set-partner-password` — Set Partner Credentials

**Request**
```json
{
  "action": "set-partner-password",
  "email": "partner@biz.com",
  "password": "partnerPass123",
  "ownerUserId": "WORKSPACE_ID",
  "partnerId": "PARTNER_ID"
}
```

**Success Response** `200`
```json
{ "success": true, "message": "Partner password set" }
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Required fields missing" }` |

---

## 2. Admin Management — `/api/auth` (Superadmin Only)

---

### `admin-create-user` — Create Business Account

Creates a fully verified business account with credentials and profile in one shot.

**Request**
```json
{
  "action": "admin-create-user",
  "email": "newbiz@example.com",
  "password": "securePass123",
  "fullName": "Jane Smith",
  "bizName": "Smith Corp",
  "phone": "9876543210",
  "selectedPlan": "Premium",
  "duration": 30
}
```

**Success Response** `200`
```json
{
  "success": true,
  "message": "Business \"Smith Corp\" created successfully",
  "userId": "NEW_USER_ID",
  "profileId": "NEW_PROFILE_ID"
}
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Email and password are required" }` |
| `400` | `{ "error": "User with this email already exists" }` |

---

### `admin-delete-user` — Delete Business (Cascading)

Permanently deletes ALL business data: leads, customers, invoices, quotes, tasks, projects, expenses, products, team members, partners, activity logs, automation flows, and all associated credentials.

**Request**
```json
{
  "action": "admin-delete-user",
  "profileId": "PROFILE_ID",
  "targetUserId": "USER_ID",
  "ownerEmail": "owner@example.com"
}
```

**Success Response** `200`
```json
{
  "success": true,
  "message": "Business deleted. 142 records removed.",
  "deletedCount": 142
}
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "profileId and targetUserId are required" }` |

---

## 3. Universal Data API — `/api/data`

Supports CRUD operations for all modules. Uses HTTP methods: `GET`, `POST`, `PATCH`, `DELETE`.

### Available Modules

| Module Key | Collection | Description |
|:---|:---|:---|
| `leads` | `leads` | CRM leads / enquiries |
| `customers` | `customers` | Verified clients |
| `quotations` | `quotations` | Sales quotes |
| `invoices` | `invoices` | Tax invoices |
| `amc` | `amc` | AMC contracts |
| `expenses` | `expenses` | Business expenses |
| `products` | `products` | Product catalog & stock |
| `vendors` | `vendors` | Supplier contacts |
| `purchase-orders` | `purchaseOrders` | Vendor purchase orders |
| `projects` | `projects` | Work projects |
| `tasks` | `tasks` | Individual tasks |
| `teams` | `teamMembers` | Team member accounts |
| `subs` | `subs` | Recurring subscriptions |
| `logs` | `activityLogs` | System activity logs |
| `ecomSettings` | `ecomSettings` | Storefront configuration |
| `orders` | `orders` | E-commerce orders |
| `appointments` | `appointments` | Booked appointments |
| `appointmentSettings` | `appointmentSettings` | Appointment configuration |
| `ecomCustomers` | `ecomCustomers` | Storefront customers |
| `memberStats` | `memberStats` | Daily team stats (auto-populated) |

---

### `GET` — List Records

**Endpoint**: `/api/data?module=leads&ownerId=WORKSPACE_ID`

**Success Response** `200`
```json
{
  "success": true,
  "data": [
    { "id": "lead-123", "name": "John Smith", "stage": "New", "createdAt": 1711234567890 }
  ]
}
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Invalid or missing module. Received: xyz. Allowed: leads, customers, ..." }` |
| `400` | `{ "error": "ownerId is required to identify the workspace context" }` |

---

### `POST` — Create Record

**Request**
```json
{
  "module": "leads",
  "ownerId": "WORKSPACE_ID",
  "actorId": "USER_ID",
  "userName": "John Admin",
  "name": "Alex Prospect",
  "phone": "9123456780",
  "email": "alex@prospect.com",
  "source": "Facebook Ads",
  "stage": "New",
  "logText": "Lead captured via mobile app"
}
```

**Success Response** `200`
```json
{
  "success": true,
  "id": "new-record-uuid",
  "message": "Record created successfully"
}
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Invalid or missing module..." }` |
| `400` | `{ "error": "ownerId is required to identify the workspace context" }` |
| `500` | `{ "error": "Internal server error" }` |

> **Note**: Creating a `projects` record auto-converts matching leads to Won stage. Creating `tasks` auto-assigns sequential task numbers (T-101, T-102...).

---

### `PATCH` — Update Record

**Request**
```json
{
  "module": "leads",
  "id": "LEAD_ID",
  "ownerId": "WORKSPACE_ID",
  "actorId": "USER_ID",
  "stage": "Contacted",
  "logText": "Contacted via phone call"
}
```

**Success Response** `200`
```json
{ "success": true, "message": "Record updated successfully" }
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Record ID is required for updates" }` |

---

### `DELETE` — Delete Record (Cascading)

Deletes the record plus associated activity logs. For `projects`, also deletes child tasks. For `leads`/`customers`, also deletes linked tasks.

**Request**
```json
{
  "module": "leads",
  "id": "LEAD_ID",
  "ownerId": "WORKSPACE_ID"
}
```

**Success Response** `200`
```json
{ "success": true, "message": "Record deleted successfully" }
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Record ID is required for deletion" }` |
| `405` | `{ "error": "Method not allowed" }` |

---

## 4. Messaging — `/api/notify`

### Send Email

**Request**
```json
{
  "type": "email",
  "to": "client@example.com",
  "subject": "Invoice #123",
  "body": "Hi, please find your invoice attached.",
  "ownerId": "WORKSPACE_ID",
  "processedKey": "unique-dedup-key"
}
```

**Success Response** `200`
```json
{ "success": true, "messageId": "<msg-id@smtp.server>" }
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Missing required fields" }` |
| `400` | `{ "error": "SMTP not configured" }` |
| `500` | `{ "error": "SMTP connection error message" }` |

**Deduplicated Response** `200`
```json
{ "success": true, "skipped": true, "message": "Duplicate blocked by server-side guard" }
```

---

### Send WhatsApp (Template)

**Request**
```json
{
  "type": "whatsapp",
  "to": "919876543210",
  "templateId": "329129",
  "variables": [
    { "field": "body", "index": 1, "value": "John" },
    { "field": "body", "index": 2, "value": "INV-001" }
  ],
  "ownerId": "WORKSPACE_ID",
  "processedKey": "unique-dedup-key"
}
```

**Success Response** `200`
```json
{ "success": true, "messageId": "wamid.xxx" }
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "WhatsApp not configured" }` |
| `400` | `{ "error": "Template ID required for WhatsApp" }` |
| `400` | `{ "error": "Waprochat template fail" }` |

---

## 5. POS Billing — `/api/finance`

### Generate Retail Bill

**Request**
```json
{
  "action": "generate-bill",
  "cart": [
    { "id": "PROD_ID", "name": "Wireless Mouse", "qty": 2, "rate": 500, "tax": 18 }
  ],
  "customer": { "id": "CUST_ID", "name": "Walk-in Customer", "phone": "9000000000" },
  "payMode": "UPI",
  "userId": "WORKSPACE_ID",
  "actorId": "USER_ID"
}
```

**Success Response** `200`
```json
{
  "success": true,
  "invoice": {
    "id": "invoice-uuid",
    "no": "POS-123456",
    "client": "Walk-in Customer",
    "total": 1180,
    "status": "Paid",
    "payMode": "UPI"
  }
}
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Missing checkout data" }` |
| `400` | `{ "error": "Insufficient stock for Wireless Mouse" }` |
| `405` | `{ "error": "Method not allowed" }` |
| `405` | `{ "error": "Action not allowed" }` |
| `500` | `{ "error": "Internal server error" }` |

> **Note**: Automatically deducts stock for tracked products and auto-converts matching leads to Won stage.

---

## 6. Ecommerce Checkout — `/api/ecom/checkout` (Public)

### Submit Order

**Request**
```json
{
  "ownerId": "WORKSPACE_ID",
  "ecomName": "store-slug",
  "customer": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "9876543210",
    "address": "123 Main St"
  },
  "items": [{ "name": "Product A", "qty": 1, "rate": 100 }],
  "total": 100
}
```

**Success Response** `200`
```json
{
  "success": true,
  "orderId": "order-uuid",
  "invoiceId": "invoice-uuid",
  "invoiceNo": "ECOM/2026/1234"
}
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Missing required fields: ownerId, customer, items" }` |
| `400` | `{ "error": "Mail ID or phone number mismatch with existing record" }` |
| `405` | `{ "error": "Method not allowed" }` |
| `500` | `{ "error": "Checkout failed" }` |

> **Note**: Auto-creates a lead if no existing customer/lead found. Auto-generates an invoice tagged as `ecom`.

---

## 7. Appointment Booking — `/api/appointments/book` (Public)

### Book Slot

**Request**
```json
{
  "ownerId": "WORKSPACE_ID",
  "slug": "store-slug",
  "service": "Hair Cut",
  "date": "2026-03-25",
  "time": "10:00 AM",
  "customer": {
    "name": "Alice Smith",
    "email": "alice@example.com",
    "phone": "9988776655",
    "notes": "First visit"
  }
}
```

**Success Response** `200`
```json
{ "success": true, "appointmentId": "appointment-uuid" }
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "error": "Missing required fields: ownerId, date, time, customer.name, customer.phone" }` |
| `400` | `{ "error": "Mail ID or phone number mismatch with existing record" }` |
| `409` | `{ "error": "This time slot is fully booked (max 3 per slot)" }` |
| `405` | `{ "error": "Method not allowed" }` |
| `500` | `{ "error": "Booking failed" }` |

> **Note**: Auto-creates a lead if no existing customer/lead found. Respects `maxPerSlot` from appointment settings.

---

## 8. Google Sheets Webhook — `/api/webhook/gsheets`

### Receive Lead from Google Sheets

**Request**
```json
{
  "userId": "WORKSPACE_ID",
  "actorId": "USER_ID",
  "type": "lead",
  "data": ["John Doe", "john@example.com", "9876543210", "Website", "New"]
}
```

**Success Response (New Lead)** `200`
```json
{
  "success": true,
  "message": "Lead processed and added to CRM",
  "leadId": "new-lead-uuid"
}
```

**Success Response (Existing Lead)** `200`
```json
{
  "success": true,
  "message": "Lead already exists, added log",
  "leadId": "existing-lead-uuid"
}
```

**Error Responses**
| Status | Response |
|--------|----------|
| `400` | `{ "success": false, "message": "Invalid payload structure" }` |
| `400` | `{ "success": false, "message": "No active Google Sheets mapping found for this user" }` |
| `400` | `{ "success": false, "message": "Incomplete integration configuration" }` |
| `404` | `{ "success": false, "message": "User profile not found" }` |
| `405` | `{ "success": false, "message": "Method Not Allowed" }` |
| `500` | `{ "success": false, "message": "Internal server error processing webhook" }` |

---

## Global Error Response

All endpoints return this format for unhandled errors:

```json
{ "error": "Error description" }
```

| Status | Meaning |
|--------|---------|
| `400` | Bad Request — missing or invalid parameters |
| `401` | Unauthorized — invalid credentials |
| `403` | Forbidden — account not verified |
| `404` | Not Found — record/user doesn't exist |
| `405` | Method Not Allowed — wrong HTTP method or action |
| `409` | Conflict — resource already taken (slot, etc.) |
| `500` | Server Error — backend configuration or runtime failure |
