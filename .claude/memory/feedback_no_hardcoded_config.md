---
name: No Hardcoded Configuration Values
description: All business settings (stages, sources, categories, requirements) must come from userProfiles, not hardcoded. Prompt user where to store customizable values.
type: feedback
---

## CRITICAL: Configuration Values Rule

**NEVER hardcode dropdown values, lists, or configuration options.** Users should be able to customize them in Business Settings.

**Why:**
- Different businesses have different workflows (stages, product types, requirements)
- Hardcoding limits flexibility and causes support requests
- Each workspace should have independent settings
- Future features (e.g., custom fields) depend on this pattern

---

## Hardcoded Values (DON'T DO THIS)

### ❌ Lead Stages
```javascript
// WRONG - In LeadsView.jsx or constants.js
const DEFAULT_STAGES = [
  'New Enquiry',
  'Contacted',
  'Quotation Created',
  'Won',
  'Lost'
];
```

### ❌ Product Categories
```javascript
// WRONG - In ProductView.jsx
const CATEGORIES = ['Electronics', 'Software', 'Consulting', 'Services'];
```

### ❌ Lead Sources
```javascript
// WRONG - Hardcoded dropdown
const SOURCES = ['Direct Call', 'Email', 'Website', 'Referral', 'Partner'];
```

### ❌ Invoice Statuses (Actually OK for this one)
```javascript
// OK because these are SYSTEM STATES, not business config
// Invoice can be: Draft, Sent, Paid, Overdue - system defines this
const INVOICE_STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue'];
```

---

## Correct Pattern: From userProfiles

### ✅ Lead Stages (Correct)
```javascript
// In LeadsView.jsx
const { data } = db.useQuery({
  userProfiles: { $: { where: { userId: ownerId } } }
});

const profile = data?.userProfiles?.[0];
const stages = profile?.stages || DEFAULT_STAGES; // Use profile's custom stages

const stageOptions = stages.map(stage => (
  <option key={stage} value={stage}>{stage}</option>
));
```

### ✅ Product Categories (Correct)
```javascript
// In ProductView.jsx
const productCats = profile?.productCats || DEFAULT_PRODUCT_CATS;

return (
  <select value={productCat} onChange={...}>
    {productCats.map(cat => (
      <option key={cat} value={cat}>{cat}</option>
    ))}
  </select>
);
```

### ✅ Lead Sources (Correct)
```javascript
// In dropdown
const sources = profile?.sources || DEFAULT_SOURCES;

return (
  <select>
    {sources.map(src => (
      <option key={src} value={src}>{src}</option>
    ))}
  </select>
);
```

---

## Where Each Setting is Stored in userProfiles

| Setting | Field | Type | Example | Business Settings? |
|---------|-------|------|---------|-------------------|
| Lead Stages | `stages` | string[] | ['New', 'Won', 'Lost'] | ✅ Yes |
| Lead Sources | `sources` | string[] | ['Direct Call', 'Website'] | ✅ Yes |
| Requirements | `requirements` | string[] | ['Budget OK', 'Decision Maker'] | ✅ Yes |
| Product Categories | `productCats` | string[] | ['Electronics', 'Software'] | ✅ Yes |
| Custom Fields | `customFields` | object[] | [{ name: "Budget", type: "number" }] | ✅ Yes |
| Won Stage | `wonStage` | string | 'Won' | ✅ Yes (default: 'Won') |
| Disabled Stages | `disabledStages` | string[] | ['Inactive', 'Old'] | ✅ Yes |
| Team Can See All Leads | `teamCanSeeAllLeads` | boolean | true | ✅ Yes |
| Invoice Template | `invoiceTemplate` | string | 'Spreadsheet' | ✅ Yes |
| Partner Lead Source | `partnerLeadSource` | string | 'Channel Partners' | ✅ Yes |
| Roles | `roles` | object[] | [{ name: 'Admin', perms: {...} }] | ✅ Yes (via Teams) |

---

## Pattern for Adding a New Customizable Setting

When adding a new module/feature with customizable options:

### Step 1: Define Default in Code
```javascript
// src/utils/helpers.js
export const DEFAULT_CALL_OUTCOMES = [
  'Connected',
  'No Answer',
  'Busy',
  'Voicemail',
  'Wrong Number'
];
```

### Step 2: Add to userProfiles Schema
```javascript
// Somewhere (document this in memory)
// userProfiles collection should have:
// callOutcomes: string[] (default: DEFAULT_CALL_OUTCOMES)
```

### Step 3: Use in Component (Don't Hardcode)
```javascript
// In CallLogsView.jsx or wherever used
const outcomes = profile?.callOutcomes || DEFAULT_CALL_OUTCOMES;

return (
  <select>
    {outcomes.map(outcome => (
      <option key={outcome}>{outcome}</option>
    ))}
  </select>
);
```

### Step 4: Add Business Settings UI
**File:** `src/components/Settings/` (or Business Settings location)

Create form to add/edit/remove custom values:
```javascript
// In BusinessSettings component
const [callOutcomes, setCallOutcomes] = useState(profile?.callOutcomes || []);

const addOutcome = (newOutcome) => {
  setCallOutcomes([...callOutcomes, newOutcome]);
};

const removeOutcome = (outcome) => {
  setCallOutcomes(callOutcomes.filter(o => o !== outcome));
};

const saveSettings = () => {
  db.transact(db.tx.userProfiles[profile.id].update({
    callOutcomes: callOutcomes
  }));
};
```

### Step 5: Document
Add to memory file with:
- Where setting is stored
- Default values
- How to use in components
- Which Business Settings tab

---

## Decision Tree: Is This Hardcoded or Customizable?

**Question 1: Can different businesses need different values?**
- YES → Make it customizable
- NO → Go to Q2

**Question 2: Are these business workflow steps or system constants?**
- Business workflow → Customizable (e.g., stages, sources, requirements)
- System constant → Hardcoded (e.g., Invoice statuses, call directions)

**Question 3: Will owner want to add/edit/remove values?**
- YES → Customizable
- NO → Hardcoded

**Question 4: Is this value specific to one workspace?**
- YES → Customizable
- NO → Hardcoded

---

## Examples by Category

### ✅ CUSTOMIZABLE (From userProfiles)
- Lead stages (different workflows per business)
- Lead sources (different channels per business)
- Requirements (different criteria per business)
- Product categories (different product mix per business)
- Custom fields (business-specific data)
- Team roles (different team structures per business)
- Invoice templates (different branding/format per business)
- Appointment types (different service types per business)
- Email templates (different messaging per business)

### ❌ HARDCODED (System Constants)
- Invoice statuses: Draft, Sent, Paid, Overdue
- Call directions: Incoming, Outgoing, Missed
- Call outcomes: Connected, No Answer, Busy (BUT: Can be customized, see Call Outcomes example above)
- Order statuses: Pending, Processing, Shipped, Delivered
- User roles: Owner, Team Member, Partner (structure is fixed, but permissions within roles are customizable)
- Module names: Leads, Invoices, etc. (system architecture)
- Action types: list, create, edit, delete (permission system)

---

## When to Prompt User

**When adding a new dropdown/selector to any module:**

Example prompt to add:
```
Where should this option list come from?

A) Hardcoded in code (fixed, same for all businesses)
   - Use DEFAULT_XXX constant from helpers.js
   - Examples: Invoice statuses, call directions
   
B) Customizable in Business Settings (different per workspace)
   - Store in userProfiles.[ settingName ]
   - User can add/edit/remove values
   - Examples: Lead stages, product categories

Which approach for [YourNewSetting]?
```

---

## Implementation Checklist

When adding a customizable setting:

- [ ] Created DEFAULT_XXX constant in `src/utils/helpers.js`
- [ ] Added field to userProfiles schema documentation (memory or code comment)
- [ ] Component uses `profile?.[ fieldName ] || DEFAULT_XXX` (never hardcoded)
- [ ] Business Settings form created to add/edit/remove values
- [ ] Save updates to userProfiles via `db.transact()`
- [ ] All dropdowns/lists that use this setting pull from profile
- [ ] New workspace gets sensible defaults (loaded from DEFAULT_XXX)
- [ ] Owner can customize in Business Settings
- [ ] No hardcoded list of values in any component
- [ ] Documented in memory with:
  - Where it's stored (userProfiles field name)
  - Default values
  - How to use in components
  - Business Settings location

---

## Real-World Examples from Existing Code

### Lead Stages (Customizable ✅)
- **Stored in:** `userProfiles.stages`
- **Default:** `DEFAULT_STAGES` from helpers.js
- **Used in:** LeadsView.jsx, Kanban columns, stage dropdowns
- **Customized in:** Business Settings → Stages tab
- **How:** Owner can add/remove/reorder stages, disable stages

### Product Categories (Customizable ✅)
- **Stored in:** `userProfiles.productCats`
- **Default:** `DEFAULT_PROD_CATS` from helpers.js
- **Used in:** Lead form, Customer form, Invoice items
- **Customized in:** Business Settings → Product Categories tab

### Lead Sources (Customizable ✅)
- **Stored in:** `userProfiles.sources`
- **Default:** `DEFAULT_SOURCES` from helpers.js
- **Used in:** Lead form, source filter in list view, import mapping
- **Customized in:** Business Settings → Sources tab

### Custom Fields (Customizable ✅)
- **Stored in:** `userProfiles.customFields`
- **Default:** Empty array `[]`
- **Used in:** Lead form, displayed as dynamic inputs
- **Customized in:** Business Settings → Custom Fields tab
- **Structure:** `{ name: "Budget", type: "number", options: "..." }`

### Call Directions (Hardcoded ❌)
- **Values:** 'Incoming', 'Outgoing', 'Missed'
- **Why hardcoded:** System direction (device call), not business process
- **Used in:** Call log form, team call summary, call direction icon

### Invoice Statuses (Mostly Hardcoded ❌)
- **Values:** 'Draft', 'Sent', 'Paid', 'Overdue'
- **Why hardcoded:** System states, not business workflow
- **Note:** Could be made customizable, but currently hardcoded for simplicity
