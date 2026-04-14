---
name: Customers Module Architecture
description: Customer management, linked to leads, profile management, partner segmentation
type: project
---

## Customers Module Overview

**File:** `src/components/Clients/CustomerView.jsx`

**Purpose:** Manage converted leads as customers, track relationship, link to orders/invoices, partner segmentation (retailers/distributors).

## Data Schema

```javascript
EMPTY_CUSTOMER = {
  name: '',                    // Required
  email: '',                   // Validated for duplicates
  phone: '',                   // Formatted, validated for duplicates
  source: '',                  // Lead source (inherited)
  productCat: '',              // Product category
  notes: '',                   // Internal notes
  partnerId: '',               // Link to partner (if created via partner channel)
  distributorId: '',           // Link to distributor
  retailerId: '',              // Link to retailer
  leadId: ''                   // Link back to original lead
}
```

**Auto-generated fields:** `id`, `userId`, `actorId`, `createdAt`, `updatedAt`

## Creation Paths

### Path 1: Auto-Conversion from Lead
- When lead stage changes to `userProfiles.wonStage` (default: 'Won')
- Automatic customer creation in lead save logic
- Auto-triggers: `logActivity('Manually converted to Customer. Stage changed to Won.')`

### Path 2: Manual Creation
- "Create Customer" button in Customers view
- Full form fill (name, email, phone, source, category, notes)
- Duplicate check: Phone/email against leads + customers

### Path 3: E-commerce Checkout
- When customer places order via `/ecom/checkout` API
- Auto-creates customer if not found by email/phone
- Sets `source = 'E-commerce'`

## Views & Features

### List View
- Table with columns: Name, Email, Phone, Source, Category, Partner, Notes, Actions
- Filters: Search (name, email, phone), Source dropdown, Partner dropdown
- Pagination: 25/50/100/All rows
- Bulk actions: Delete
- Row actions: Edit, View detail (invoices/orders linked), Delete

### Detail View
- Customer info (name, email, phone, source, category, notes)
- Linked records:
  - Invoices (show all invoices where this customer is recipient)
  - Orders (if e-commerce enabled; show all orders for this email)
  - Original lead (if leadId exists; link to lead record)
- Edit button → modal form

## Linked Records

**Invoices:** Linked via customer email matching
**Orders:** E-commerce orders linked by customer email
**Lead:** Original lead linked via `leadId` field
**Partner:** If `partnerId`/`distributorId`/`retailerId` set, shows partner name and type

## Hard Delete Behavior

**On delete:**
1. Customer record deleted
2. All activityLogs linked to customer deleted (entityId match)
3. Invoices NOT deleted (preserved for accounting)
4. Orders NOT deleted (preserved for e-commerce history)
5. Link back to lead NOT removed (leadId preserved in lead record for reference)

## Permissions

- `perms.can('Customers', 'create')` — Create new customers
- `perms.can('Customers', 'edit')` — Edit customer info
- `perms.can('Customers', 'delete')` — Delete customers

**Visibility:**
- Owners see all customers
- Non-owners: Depends on `userProfiles.teamCanSeeAllLeads` (same logic as leads)

## DB Collections Used

| Collection | Purpose |
|---|---|
| `customers` | Customer records |
| `invoices` | Linked invoices (not deleted when customer deleted) |
| `orders` | E-commerce orders (not deleted) |
| `leads` | Original lead (linked via leadId) |
| `activityLogs` | Audit trail |
| `partnerApplications` | Partner/distributor info |

## Important Notes

- **No soft delete** — Hard delete only
- **Duplicate prevention** — Phone/email checked against leads + customers
- **Lead conversion is automatic** — Can't prevent customer creation when stage reaches wonStage
- **Historical data preserved** — Invoices and orders stay in DB after customer deleted (for accounting/compliance)
- **Partner integration** — Customers can be segmented by distributor/retailer for channel partner views
