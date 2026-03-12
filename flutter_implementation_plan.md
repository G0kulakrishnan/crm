# Flutter App Implementation Plan: TechCRM

This document provides a step-by-step roadmap for building the TechCRM mobile application using Flutter, integrating with the existing InstantDB backend and custom Vercel API endpoints.

## 1. Project Prerequisites
- **Framework**: Flutter (latest stable).
- **State Management**: Provider, Riverpod, or Bloc (highly recommended for real-time data).
- **Database SDK**: `instant_xml` or standard HTTP implementation for InstantDB.
- **API URL**: `https://mycrm.t2gcrm.in` (Custom Auth/Email/WhatsApp).
- **InstantDB App ID**: `19c240f7-1ba0-486a-95b4-adb651f63cfd`.

---

## 2. Technical Roadmap

### Phase 1: Authentication & Permission Setup
1. **Login Flow**:
   - Implement `POST /api/auth/login`.
   - On success, store the `token`, `ownerUserId`, and `perms` (Permissions map) locally.
   - Use the `token` to authenticate the InstantDB SDK: `db.auth.signInWithToken(token)`.
2. **Permissions Engine**:
   - Create a global utility to check if a user can access a module.
   - Example: `bool canAccess(String module) => perms.containsKey(module) && perms[module].isNotEmpty;`
3. **Magic Link**:
   - (Optional but recommended) Support `db.auth.sendMagicCode` for passwordless login.

### Phase 2: Core Data Synchronization
1. **Dynamic Config**:
   - On app start, fetch `userProfiles` where `userId == ownerUserId`.
   - Cache `stages` (Leads), `taskStatuses`, and `taxRates` to use in dropdowns.
2. **Real-time Subscriptions**:
   - Use `db.subscribe` for the Dashboard and Lists to ensure the app is always in sync with the web version.

### Phase 3: Module Development
1. **Leads & Customers**:
   - CRUD operations using `db.transact`.
   - Support for `customFields` defined in `userProfiles`.
   - Integration with WhatsApp API (`POST /api/send-whatsapp`) for quick messaging.
2. **Finance Module (Invoices & Quotations)**:
   - Implement document listing with "Status" badges.
   - Use the shared logic for total calculations (Subtotal, GST, Discounts).
   - Support for **AMC** fields in the Create/Edit forms.
3. **Expenses**:
   - Implement category-based tracking using `expCats`.

### Phase 4: Communications & Logs
1. **Email Integration**:
   - Call `POST /api/send-email` for document sharing.
2. **Activity Logs**:
   - Every transaction in Flutter **MUST** be accompanied by an `activityLogs` entry via `db.transact` for the audit trail.

---

## 3. UI/UX Standards
- **Design Language**: Follow the web app's sleek, dark-mode/glassmorphism aesthetic.
- **Responsiveness**: Ensure the app works perfectly on both iOS and Android.
- **Offline Mode**: Utilize local caching for improved performance in low-connectivity areas.

---

## 4. Security & Isolation
- **Multi-Tenancy**: Every data fetch **MUST** include a filter for the `userId`. Never fetch data without `$.where({ userId: ownerId })`.
- **Sensitive Modules**: Strict UI-level blocking of "Admin" and "Settings" modules for Team Members.

---

## 5. Deployment
- **API Environment**: Use `.env` files for `INSTANT_APP_ID` and the base `API_URL`.
- **Testing**: Verify all auth roles (Owner vs. Manager vs. Sales) before release.
