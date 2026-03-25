# TechCRM API Documentation

This document outlines the API structure and data models for TechCRM, to assist in independent mobile app development.
# T2GCRM API Documentation

This document provides a comprehensive technical reference for the T2GCRM API endpoints. All requests should include the appropriate headers and follow the structure outlined below.

---

## **1. Authentication APIs**

### `POST` **Login API**
Authenticate a user and retrieve a JWT token for session authorization.

#### **Endpoint**
> `https://crm.t2gcrm.in/api/auth/login`

#### **Request Body**
```json
{
  "email": "user@example.com",
  "password": "your_secure_password"
}
```

#### **Response (Success)**
```json
{
  "message": "Login successfully!",
  "token": "1|abc123tokenXYZ",
  "user": {
    "id": "user-uuid-1",
    "name": "John Doe",
    "email": "user@example.com"
  },
  "perms": {
    "Leads": ["list", "create", "edit", "delete"],
    "Invoices": ["list", "create"]
  },
  "isTeamMember": false,
  "role": "Owner",
  "status_code": 200,
  "status": true
}
```

#### **Response (Error)**
```json
{
  "message": "Invalid email or password",
  "status_code": 401,
  "status": false
}
```

---

### `POST` **Register API**
Create a new business workspace and owner account.

#### **Endpoint**
> `https://crm.t2gcrm.in/api/auth/register`

#### **Request Body**
```json
{
  "email": "newuser@example.com",
  "password": "strongpassword123",
  "fullName": "Jane Smith",
  "bizName": "Smith Solutions",
  "phone": "9876543210",
  "selectedPlan": "Trial"
}
```

#### **Response (Success)**
```json
{
  "message": "Registered successfully!",
  "token": "1|newuser-token-789",
  "status_code": 200,
  "status": true
}
```

#### **Response (Error)**
```json
{
  "message": "Email already registered",
  "status_code": 409,
  "status": false
}
```

---

## **2. Core Data APIs (Universal)**

### `POST` **Create/Update Record**
Create or update entries in any module (Leads, Customers, Expenses, etc.). Automatic activity logs are created.

#### **Endpoint**
> `https://crm.t2gcrm.in/api/data`

#### **Request Body (New Lead)**
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

#### **Response (Success)**
```json
{
  "message": "Record saved successfully!",
  "id": "new-lead-uuid-444",
  "status_code": 200,
  "status": true
}
```

#### **Response (Error - Missing Payload)**
```json
{
  "message": "Payload name is required for this module",
  "status_code": 400,
  "status": false
}
```

---

### `DELETE` **Delete Record (Cascading)**
Permanently remove a record AND its associated activity logs/tasks.

#### **Endpoint**
> `https://crm.t2gcrm.in/api/data`

#### **Request Body**
```json
{
  "method": "DELETE",
  "module": "leads",
  "ownerId": "WORKSPACE_ID",
  "id": "lead-uuid-to-delete",
  "logText": "User initiated delete via mobile"
}
```

#### **Response (Success)**
```json
{
  "message": "Record and associated logs/tasks deleted",
  "status_code": 200,
  "status": true
}
```

---

## **3. Communication APIs**

### `POST` **WhatsApp Notification**
Send a manual or automated WhatsApp message via Waprochat.

#### **Endpoint**
> `https://crm.t2gcrm.in/api/notify`

#### **Request Body**
```json
{
  "to": "919123456789",
  "message": "Your project status is updated to: In Progress.",
  "ownerId": "WORKSPACE_ID"
}
```

#### **Response (Success)**
```json
{
  "message": "Message sent successfully!",
  "status_code": 200,
  "status": true
}
```

#### **Response (Error - Invalid Token)**
```json
{
  "message": "WhatsApp API token is missing or invalid in settings",
  "status_code": 500,
  "status": false
}
```

---

## **4. Finance APIs (Invoices/Quotes)**

### `POST` **Create Invoice**
Generate a new invoice with line items and customer link.

#### **Endpoint**
> `https://crm.t2gcrm.in/api/data` (Module: `invoices`)

#### **Request Body**
```json
{
  "module": "invoices",
  "ownerId": "WORKSPACE_ID",
  "client": "John Customer",
  "no": "INV/2026/05",
  "date": "2026-03-25",
  "items": [
    { "name": "Consulting", "qty": 1, "rate": 5000, "taxRate": 18 },
    { "name": "Travel", "qty": 2, "rate": 500, "taxRate": 5 }
  ],
  "total": 6100,
  "logText": "Invoice #05 generated"
}
```

#### **Response (Success)**
```json
{
  "message": "Invoice generated successfully",
  "id": "inv-uuid-888",
  "status_code": 200,
  "status": true
}
```

---

## **5. Public Store & Booking APIs**

### `POST` **Ecommerce Checkout**
Place an order from the public store side.

#### **Endpoint**
> `https://crm.t2gcrm.in/api/ecom/checkout`

#### **Request Body**
```json
{
  "ownerId": "WORKSPACE_ID",
  "ecomName": "my-cool-store",
  "customer": {
    "name": "Sarah Buyer",
    "email": "sarah@gmail.com",
    "phone": "9988776655",
    "address": "456 Park Avenue, NY"
  },
  "items": [{ "name": "Gadget X", "qty": 2, "rate": 200 }],
  "total": 400
}
```

#### **Response (Error - Mismatch)**
```json
{
  "message": "Mail ID or phone number mismatch with an existing record found in the CRM",
  "status_code": 400,
  "status": false
}
```

---

## **Module Keys Table**
When calling the `/api/data` endpoint, use these keys for the `"module"` property.

| Module Key | Database Table | Actions |
| :--- | :--- | :--- |
| `leads` | `leads` | Create, Update, Delete |
| `customers` | `customers` | Create, Update, Delete |
| `quotations` | `quotes` | Create, Update, Delete |
| `invoices` | `invoices` | Create, Update, Delete |
| `projects` | `projects` | Create, Update, Delete |
| `tasks` | `tasks` | Create, Update, Delete |
| `expenses` | `expenses` | Create, Update, Delete |
| `products` | `products` | Create, Update, Delete |
| `logs` | `activityLogs` | Create, Delete |
