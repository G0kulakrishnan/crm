---
name: Hard Delete Policy (No Soft Deletes)
description: All deletes must be permanent hard deletes from DB, no soft deletes or orphaned records
type: feedback
---

**Rule:** When ANY item is deleted from the UI, permanently remove it from the database. NO soft deletes, NO orphaned records, NO memory waste.

**Why:** Soft deletes duplicate data, orphaned records waste database space, and create confusion about what data actually exists. The user explicitly wants a clean database with zero cruft.

**How to apply:** 
- Always use `db.tx.collection[id].delete()` for hard deletes
- When deleting parent records, cascade delete child records in same transaction
- Example: Delete lead → also delete its quotations, activityLogs, assignments
- Never mark records as `deleted: true` or `status: 'deleted'`
- Test deletions to ensure no orphaned records remain in DB

**Cascade map (implemented in `api/data.js` DELETE handler):**

| Module | Also Deletes |
|--------|--------------|
| **Leads** | activityLogs, appointments, tasks (entityId), callLogs (leadId) |
| **Customers** | activityLogs, appointments, tasks (entityId), callLogs (leadId), AMC (customerId) |
| **Projects** | activityLogs, tasks (projectId), expenses (projectId), appointments |
| **Vendors** | activityLogs, purchaseOrders (vendorId) |
| **Team Members** | userCredentials (by email), attendance (by staffEmail), memberStats (memberId), activityLogs |
| **Channel Partners** | partnerCommissions, userCredentials, activityLogs (in Distributors.jsx) |
| **Business (admin delete)** | ALL 30+ collections: leads, customers, invoices, quotations, tasks, projects, appointments, amc, expenses, products, vendors, purchaseOrders, partnerApplications, partnerCommissions, campaigns, campaignTemplates, teamMembers, attendance, memberStats, callLogs, activityLogs, messagingLogs, outbox, automations, automationTemplates, orders, ecomCustomers, ecomSettings, appointmentSettings, subs, coupons, leadFiles, userCredentials (all) |

**Important routing rule:**
- Module delete buttons should call `DELETE /api/data` (not direct `db.tx.X.delete()`) so the cascade runs
- Exception: deletes with custom cascade logic can run in-component (e.g. Distributors.jsx), but MUST still cascade all children

**Verification:** After any delete, the DB should have zero records where `userId`, `entityId`, `leadId`, `projectId`, `vendorId`, `customerId`, `staffEmail`, or `memberId` equals the deleted id.

This is a CRITICAL requirement for data integrity and DB performance.
