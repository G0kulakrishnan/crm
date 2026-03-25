# TechCRM API Documentation

This document outlines the API structure and data models for TechCRM, to assist in independent mobile app development.
# T2GCRM API Documentation

This document provides a structured reference for the T2GCRM API endpoints to assist in mobile and third-party integrations.

## InstantDB Configuration
- **App ID**: `19c240f7-1ba0-486a-95b4-adb651f63cfd`
- **SDK**: Use the InstantDB SDK for Flutter.
- **Filtering**: Every query MUST include `.where({ userId: ownerId })`.

---

### `POST` **Login API**
Authenticate user and get access token for InstantDB session.

#### **Endpoint**
> `https://crm.t2gcrm.in/api/auth/login`

#### **Request Body**
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

#### **Response (Success)**
```json
{
  "success": true, 
  "token": "1|xxxxxxxxxxxx", 
  "isTeamMember": false, 
  "role": "Owner", 
  "perms": { "Leads": ["list", "create", "edit", "delete"], "Invoices": ["list", "create"] },
  "ownerUserId": "uuid-123-456",
  "teamMemberId": null,
  "status_code": 200,
  "status": true
}
```

#### **Response (Error)**
```json
{
  "message": "Invalid credentials",
  "status_code": 401,
  "status": false
}
```

---

### `POST` **Data Module API (Universal)**
Create, Update, or Delete records in any module (Leads, Invoices, Projects, etc.) with automatic activity logging and cascading cleanup.

#### **Endpoint**
> `https://crm.t2gcrm.in/api/data`

#### **Request Body (Create Lead)**
```json
{
  "module": "leads",
  "ownerId": "WORKSPACE_ID",
  "actorId": "USER_ID",
  "userName": "John Doe",
  "name": "New Prospect",
  "phone": "9988776655",
  "stage": "New",
  "logText": "Lead created via Mobile App"
}
```

#### **Response (Success)**
```json
{
  "success": true,
  "id": "new-record-uuid",
  "message": "Record created successfully",
  "status_code": 200,
  "status": true
}
```

---

### `DELETE` **Data Module API**
Delete a record and all its associated activity logs/tasks (Cascading Delete).

#### **Endpoint**
> `https://crm.t2gcrm.in/api/data`

#### **Request Body**
```json
{
  "method": "DELETE",
  "module": "leads",
  "ownerId": "WORKSPACE_ID",
  "id": "record-uuid-to-delete",
  "logText": "Deleted via Mobile App"
}
```

#### **Response (Success)**
```json
{
  "success": true,
  "message": "Record and associated data deleted successfully",
  "status_code": 200,
  "status": true
}
```

---

### `POST` **WhatsApp / Notification API**
Send automated WhatsApp messages or emails to leads and customers.

#### **Endpoint**
> `https://crm.t2gcrm.in/api/notify`

#### **Request Body (WhatsApp Text)**
```json
{
  "to": "919988776655",
  "message": "Hello, your appointment is confirmed!",
  "ownerId": "WORKSPACE_ID"
}
```

#### **Response (Success)**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "status_code": 200,
  "status": true
}
```

---

### `POST` **E-commerce Checkout API**
Place a public order and link it to a customer/lead.

#### **Endpoint**
> `https://crm.t2gcrm.in/api/ecom/checkout`

#### **Request Body**
```json
{
  "ownerId": "WORKSPACE_ID",
  "ecomName": "your-store-slug",
  "customer": { "name": "Buyer", "email": "buyer@email.com", "phone": "9911223344", "address": "123 Street" },
  "items": [{ "name": "Product A", "qty": 1, "rate": 500 }],
  "total": 500
}
```

#### **Response (Error - Email/Phone Mismatch)**
```json
{
  "success": false,
  "error": "Mail ID or phone number mismatch with existing record",
  "status_code": 400,
  "status": false
}
```

---

## **Module Reference (Collection Names)**
When using the `/api/data` endpoint, use these keys for the `module` parameter:

| Module Key | Description |
| :--- | :--- |
| `leads` | Lead Management |
| `customers` | Converted Clients |
| `quotations` | Proposals & Quotes |
| `invoices` | Billing & Payments |
| `projects` | Work & Projects |
| `tasks` | Task Management |
| `expenses` | Business Expenses |
| `products` | Inventory / Services |
| `logs` | Activity Timeline |
