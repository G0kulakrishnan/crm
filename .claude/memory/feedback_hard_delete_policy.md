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

**Examples:**
- Delete business → removes: teamMembers, leads, invoices, quotations, automations, projects, tasks, etc.
- Delete lead → removes: related quotations, activityLogs, attached files/notes
- Delete team member → removes: attendance records, assignments
- Delete invoice → removes: line items, payments, activityLogs for that invoice

This is a CRITICAL requirement for data integrity and DB performance.
