---
name: Quotations Module Architecture
description: Quote management, conversion to invoice, line items, customer estimation
type: project
---

## Quotations Module Overview

**File:** `src/components/Finance/QuotationsView.jsx`

**Purpose:** Create quotes/estimates for customers, track acceptance/rejection, convert to invoices.

## Data Schema

```javascript
EMPTY_QUOTATION = {
  quotationNo: '',             // Auto-generated (QT-XXXXX or custom)
  quotationDate: '',           // ISO date (defaults to today)
  validUntil: '',              // ISO date (quote expiry)
  customerName: '',            // Required
  customerEmail: '',           // Required
  customerPhone: '',           // Optional
  customerAddress: '',         // Optional
  lineItems: [                 // Array of items
    {
      itemName: '',
      description: '',
      quantity: 0,
      rate: 0,
      gst: 0,                  // GST percentage
      amount: 0                // Calculated: quantity * rate
    }
  ],
  subtotal: 0,                 // Sum of all amounts
  gstAmount: 0,                // Calculated GST
  discountAmount: 0,           // Manual discount
  totalAmount: 0,              // Final amount
  status: 'Draft',             // 'Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'
  notes: ''                    // Internal notes/terms
}
```

**Auto-generated fields:** `id`, `userId`, `actorId`, `quotationNo`, `createdAt`, `updatedAt`, `sentAt`, `acceptedAt`, `rejectedAt`, `convertedToInvoiceId`

## Quotation Lifecycle

### Status Progression
1. **Draft** — Not yet sent to customer
2. **Sent** — Sent to customer via email
3. **Accepted** — Customer accepted quote
4. **Rejected** — Customer rejected quote
5. **Expired** — Quote validity date passed
6. **Converted** — Converted to invoice (linked via `convertedToInvoiceId`)

### Status Actions
- **Draft:** Edit, send, delete, convert to invoice
- **Sent:** Log customer response (accept/reject), send reminder, convert to invoice
- **Accepted:** Convert to invoice, view only
- **Rejected:** View only, can re-edit and resend as new quote
- **Expired:** View only (can't convert; recreate new quote)

## List View Features

### Filters
- Search: Quotation no, customer name, email
- Status filter: All, Draft, Sent, Accepted, Rejected, Expired
- Date range filter

### Columns
- Quotation No, Customer, Amount, Status, Date, Valid Until, Actions

### Row Actions
- View/Edit (edit only if Draft)
- Send email
- Log acceptance/rejection
- Convert to invoice (if not rejected/expired)
- Download PDF
- Delete

## Conversion to Invoice

**Flow:**
1. Click "Convert to Invoice" on quotation
2. System creates new invoice with:
   - Same lineItems (copied)
   - Same customer info
   - New invoice number (auto-generated)
   - `invoiceDate` = today
   - `dueDate` = configurable (default 30 days from invoiceDate)
3. Sets quotation status to 'Converted'
4. Sets quotation `convertedToInvoiceId` to new invoice ID
5. Creates activityLog: "Quotation converted to Invoice INV-XXXXX"
6. Invoice created as Draft (customer must send)

## Hard Delete Behavior

**On delete:**
1. Quotation record deleted
2. All activityLogs linked to quotation deleted (entityId match)
3. Linked invoice NOT affected (if already converted, invoice stays)
4. Can't delete if already converted to invoice (check first)

## Permissions

- `perms.can('Quotations', 'create')` — Create, edit drafts, send, delete
- `perms.can('Quotations', 'edit')` — Edit draft quotations
- `perms.can('Quotations', 'delete')` — Delete any quotation

## DB Collections Used

| Collection | Purpose |
|---|---|
| `quotations` | Quote records |
| `invoices` | Linked invoice (if converted) |
| `customers` | Customer lookup |
| `activityLogs` | Audit trail |

## Important Notes

- **Expiry calculation** — `validUntil` is manual date, system checks if expired (no auto-expiry)
- **No auto-payment request** — Manual send email only
- **Partial conversion** — Can't convert partial quote; must convert full quotation
- **No versioning** — Editing quote overwrites previous version; no history of changes
- **Manual status update** — Status updated by user, not automatic
- **GST same as invoices** — Same calculation per line item
- **Quotation and invoice decoupled** — After conversion, changes to quotation don't affect invoice
