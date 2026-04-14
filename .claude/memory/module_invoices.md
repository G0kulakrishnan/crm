---
name: Invoices Module Architecture
description: Invoice creation, tracking, payment status, templates, GST, bulk operations
type: project
---

## Invoices Module Overview

**File:** `src/components/Finance/InvoicesView.jsx`

**Purpose:** Create, manage, and track invoices with GST, templates, status tracking (draft/sent/paid), bulk operations, and export.

## Data Schema

```javascript
EMPTY_INVOICE = {
  invoiceNo: '',               // Auto-generated (INV-XXXXX format or custom)
  invoiceDate: '',             // ISO date (defaults to today)
  dueDate: '',                 // ISO date for payment due
  customerName: '',            // Required
  customerEmail: '',           // Required (for sending)
  customerPhone: '',           // Optional
  customerAddress: '',         // Optional
  gstIn: '',                   // Customer GST number (if applicable)
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
  totalAmount: 0,              // Final amount (subtotal + gst - discount)
  paymentStatus: 'Draft',      // 'Draft', 'Sent', 'Partial', 'Paid', 'Overdue'
  paymentMethod: '',           // 'Bank Transfer', 'Credit Card', 'Cash', 'Cheque'
  notes: '',                   // Internal notes
  templateId: ''               // Link to template (optional)
}
```

**Auto-generated fields:** `id`, `userId`, `actorId`, `invoiceNo`, `createdAt`, `updatedAt`, `sentAt` (timestamp when marked sent), `paidAt` (timestamp when marked paid)

## Invoice Creation & Templates

### Manual Creation
1. Click "Create Invoice" → modal form
2. Select customer or enter manually
3. Add line items (itemName, qty, rate, GST%)
4. Auto-calculation: amount, subtotal, GST, total
5. Set payment terms (dueDate, paymentMethod)
6. Save as Draft

### From Template
- Select pre-saved template → loads default line items + format
- Edit as needed
- Save as new invoice

### From Quotation
- In Quotations view: "Convert to Invoice" → creates invoice from quotation line items
- Pre-fills customer, items, amounts

## Customizable Templates

**Storage:** `userProfiles.invoiceTemplate` + custom templates in `invoices` with `isTemplate: true`

**Fields:**
- `templateName` — 'Spreadsheet' (default) or custom name
- `templateFormat` — HTML/CSS for printing
- Default line item format

**Template Usage:**
- Owner can save invoice as template for future use
- Template marked with `isTemplate: true` and `template_type`
- List view filters to hide templates from main invoice list

## Invoice Workflow

### Status Progression
1. **Draft** — Unsent, editable
2. **Sent** — Email sent to customer, marked `sentAt` timestamp
3. **Partial** — Partial payment received (paymentStatus = 'Partial')
4. **Paid** — Full payment received, marked `paidAt` timestamp
5. **Overdue** — Due date passed without full payment

### Actions per Status
- **Draft:** Edit, send, convert to quotation, delete
- **Sent:** Log payment, send reminder, delete (cascades to activity logs)
- **Paid:** View only (locked), delete (rare)

### Payment Tracking
- `paymentStatus` updated manually (no auto-detection)
- `paidAt` timestamp set when marked paid
- No real-time payment notification integration

## List View Features

### Filters
- Search: Invoice no, customer name, email
- Status filter: All, Draft, Sent, Paid, Overdue, Partial
- Date range filter: invoiceDate, dueDate
- Payment method filter

### Columns
- Invoice No, Customer, Amount, Status, Date, Due Date, Payment Method, Actions

### Bulk Actions
- Select multiple → Mark as Sent / Delete
- No bulk mark-as-paid

### Row Actions
- View/Edit (edit only if Draft)
- Send email
- Log payment
- Download PDF
- Delete

## GST Handling

- **Line-level GST:** Each item has GST% field
- **Calculation:** Item GST amount = (amount * gst%) / 100
- **Total GST:** Sum of all item GSTs
- **Final total:** subtotal + totalGST - discount
- **Invoice display:** Shows itemized GST column
- **Template integration:** GST template field customizable per business

## Export & Printing

- **PDF:** Generate via browser print (uses CSS media query)
- **CSV:** Export as spreadsheet with columns: Invoice No, Customer, Amount, Status, Date
- **Email:** Send invoice to customer email with attachment

## Hard Delete Behavior

**On delete:**
1. Invoice record deleted
2. All activityLogs linked to invoice deleted (entityId match)
3. Linked quotation NOT affected (just loses invoice reference)
4. Line items stored in invoice doc → deleted with parent

## Permissions

- `perms.can('Invoices', 'create')` — Create, edit drafts, send, delete
- `perms.can('Invoices', 'edit')` — Edit draft invoices, log payment
- `perms.can('Invoices', 'delete')` — Delete any invoice

## DB Collections Used

| Collection | Purpose |
|---|---|
| `invoices` | Invoice records + templates (with isTemplate flag) |
| `customers` | Customer lookup (by email/phone) |
| `quotations` | Link to source quotation (if converted) |
| `activityLogs` | Audit trail (created, sent, paid) |

## Important Notes

- **No auto-numbering** — Invoice numbers can be custom; no enforced sequence
- **No payment reminders** — Manual email send only (no auto-cron reminders)
- **No multi-currency** — Single currency per invoice (from global settings)
- **Discount is manual** — No percentage discount, only fixed amount
- **Payment tracking manual** — Marked by user, not automatic
- **Email integration** — Requires configured SMTP in userProfiles
- **Template editing** — Saved templates can be cloned and modified
- **Financial records preserved** — Invoices never archived, only deleted hard
