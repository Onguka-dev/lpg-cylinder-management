# LPG Cylinder Management App

Stage 15 adds browser-friendly offline mode for MSO and delivery users with local draft storage, assigned delivery and vehicle stock snapshots, a sync queue, and conflict-safe server review records on top of authentication, role-based access control, admin master-data configuration, customer management, cylinder inventory, movement workflows, RSO refill sales, order management, MSO field sales, delivery management, billing, daily reconciliation, safety compliance, reporting, and notifications.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Vitest

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set `DATABASE_URL`.

3. Run the initial migration:

```bash
npm run prisma:migrate
```

4. Seed starter data:

```bash
npm run prisma:seed
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo Users

All seeded users use the same demo password: `password123`.

| Role | Email |
| --- | --- |
| Admin | `admin@example.com` |
| Warehouse Manager | `warehouse@example.com` |
| RSO | `rso@example.com` |
| MSO | `mso@example.com` |
| Auditor | `auditor@example.com` |
| Customer | `customer@example.com` |

## Tests

```bash
npm test
```

## Manual Stage 15 Checks

- Visit `/login` and sign in as Admin, Warehouse Manager, or MSO.
- Visit `/offline` and confirm online/offline status, sync status cards, assigned deliveries, vehicle stock snapshot, draft forms, and sync queue are visible.
- Click Refresh snapshot and confirm assigned delivery and vehicle stock snapshot items are saved in the queue.
- Create at least two offline drafts, such as one customer registration draft and one delivery proof/status draft, and confirm they appear in the queue.
- Click Sync queue while online and confirm the queue updates to Synced, Failed, or Conflict with clear review messages.
- Try invalid input, such as syncing a proof-of-delivery draft with an invalid OTP, and confirm the API returns a clear validation message.
- Confirm field sale drafts are flagged for review/conflict rather than silently updating vehicle stock.
- Confirm Admin and Warehouse Manager can use/review offline sync records, MSO can use offline mode for assigned work, and Auditor/Customer cannot access `/offline` or `/api/offline`.
- Confirm `/api/health` returns stage `15`.

## Manual Stage 14 Checks

- Visit `/login` and sign in as Admin.
- Visit `/notifications` and confirm the notification log, Pending/Sent/Failed KPI cards, filters, and seeded low-stock notification appear.
- Visit `/settings/notifications` and confirm SMS, email, and push placeholder channel settings plus notification templates for customer order confirmation, delivery updates, receipts, low stock, pending deliveries, maintenance alerts, emergency recalls, and safety warnings.
- Use `/notifications/new` to create two mock notification records and confirm they appear in the notification log.
- Try invalid input, such as a very short message or missing recipient contact, and confirm a clear validation message appears.
- Create or update supported workflows such as an order, delivery status, payment, maintenance case, or safety incident and confirm a notification record is created.
- Confirm Admin can manage templates/settings, Warehouse Manager can view/send notification placeholders, Auditor can view notification logs only, and Customer cannot access notification screens or APIs.
- Confirm live SMS/email/push integrations are not connected and remain placeholders.
- Confirm `/api/health` returns stage `14`.

## Manual Stage 13 Checks

- Visit `/login` and sign in as Admin, Warehouse Manager, RSO, MSO, or Auditor.
- Visit `/reports` and confirm KPI cards for inventory levels, sales revenue, outstanding payments, compliance alerts, maintenance cases, damaged cylinders, deliveries, and user activity.
- Use filters for date range, region placeholder, location/dealer, role, customer category, SKU, and status; confirm the dashboard reloads and keeps selected filter values.
- Confirm dashboards/tables are visible for inventory levels, cylinder status, cylinder location, cylinder circulation, sales revenue, outstanding payments, customer credit limits, delivery performance, reconciliation variances, safety compliance, maintenance due, damaged cylinders, and user activity logs.
- Use at least two CSV export links, such as Inventory Levels CSV and User Activity CSV, and confirm each returns CSV content.
- Confirm Excel, PDF, and scheduled reporting are shown as placeholders only.
- Try an invalid export type at `/api/reports/export?type=bad-report` and confirm a clear validation message.
- Confirm Auditor can view reports and export CSV, while Customer cannot access `/reports` or `/api/reports/export`.
- Confirm `/api/health` returns stage `13`.

## Manual Stage 12 Checks

- Visit `/login` and sign in as Admin or Warehouse Manager.
- Visit `/safety` and confirm compliance alert counts, maintenance cases, and safety incident lists are visible.
- Create at least two maintenance cases from `/safety/maintenance-cases/new` and confirm they appear in the safety list and detail pages.
- On a maintenance case detail page, record an inspection result, move the cylinder to quarantine, approve return to stock, and try the scrap/write-off placeholder action.
- Log a safety incident from `/safety/incidents/new` with certificate/document and photo upload placeholders.
- Confirm cylinder records show expiry date, hydro-test due date, unsafe status, quarantine status, and maintenance status.
- Confirm `/reports` includes compliance alert, open maintenance, and safety incident reporting.
- Try invalid input such as a short maintenance reason, missing inspection notes, or missing incident description and confirm a clear validation message.
- Confirm damaged, expired, quarantined, under-maintenance, or unsafe cylinders cannot be used for refill sales, field sales, or filled-stock dispatch.
- Confirm Auditor can view safety/compliance pages but cannot create cases or incidents, and Customer cannot access safety screens or APIs.
- Confirm `/api/health` returns stage `12`.

## Manual Stage 11 Checks

- Visit `/login` and sign in as Admin, Warehouse Manager, RSO, MSO, or Auditor.
- Visit `/reconciliations` and confirm submitted, approved locked, stock variance, payment variance, and reconciliation list are visible.
- Create a close-of-day reconciliation from `/reconciliations/new` for an RSO, MSO, or Warehouse Manager.
- Confirm the detail page shows opening stock, goods received, sales/issues, transfers, returns, damaged cylinders, expected closing stock, actual closing stock, stock variance, cash/Mpesa/card collections, expected cash, actual cash, payment variance, and explanation fields.
- Submit a draft reconciliation and confirm its status changes to `Submitted`.
- As Admin or Warehouse Manager, approve or return a submitted reconciliation.
- Confirm an approved reconciliation is locked against normal editing and that only Admin sees the override form.
- Use Admin override on an approved reconciliation and confirm the override reason is recorded.
- Try invalid input such as negative actual closing stock, negative actual cash, or a short override reason and confirm a clear validation message appears.
- Confirm RSO/MSO can only submit their own reconciliations, Auditor can view but cannot create or review, and Customer cannot access reconciliation screens or APIs.
- Confirm `/api/health` returns stage `11`.

## Manual Stage 10 Checks

- Visit `/login` and sign in as Admin, Warehouse Manager, RSO, or MSO.
- Visit `/payments` and confirm invoice totals, amount paid, outstanding dues, and invoice list.
- Generate an invoice from `/payments/invoices/new` using a delivered order or closed retail sale.
- Confirm invoice detail shows line totals, tax, delivery fee, discount, promotion placeholder, invoice total, amount paid, balance, refund placeholder, and credit limit check.
- Record one partial payment using cash, Mpesa, card, or online placeholder and confirm a receipt number appears.
- Record a second payment and confirm invoice status changes to paid when balance reaches zero.
- Visit a customer profile and confirm payment history and invoices are visible.
- Visit `/reports` and confirm invoice/payment report totals and receipt list.
- Try invalid input such as missing invoice source, payment amount of zero, payment above balance, or an invoice that exceeds customer credit limit and confirm a clear validation message.
- Confirm Auditor can view billing and reports but cannot create invoices or record payments.
- Confirm Customer cannot access billing screens or APIs.
- Confirm `/api/health` returns stage `10`.

## Manual Stage 9 Checks

- Visit `/login` and sign in as Admin, Warehouse Manager, or MSO.
- Visit `/deliveries` and confirm delivery assignments list with route, zone, assigned MSO/driver, vehicle, order, customer, and status.
- Create a delivery assignment from `/deliveries/new` for an eligible order and confirm it appears in the list and detail views.
- Confirm the linked order moves to `Assigned` when the delivery is assigned.
- On the delivery detail page, move a delivery through loading confirmation and customer arrival.
- Mark a delivery as delivered with OTP, digital signature placeholder, photo upload placeholder, GPS latitude/longitude placeholder, and customer remarks.
- Confirm the linked order moves to `Dispatched` after loading/customer-arrival steps and `Delivered` after proof of delivery.
- Create or use another assignment and mark it failed, returned, or exception with one of: customer unavailable, damaged cylinder, wrong location, payment issue, or partial delivery.
- Try invalid delivery input such as missing order, one-character driver name, delivered with no OTP, or failed with no reason and confirm clear validation messages.
- Confirm Auditor can view delivery screens but cannot assign or update deliveries.
- Confirm Customer and RSO cannot access delivery screens or APIs.
- Confirm `/api/health` returns stage `9`.

## Manual Stage 8 Checks

- Visit `/login` and sign in as MSO with `mso@example.com` / `password123`.
- Visit `/mso` and `/field-sales` and confirm the assigned vehicle, route, zone, vehicle inventory, assigned customers, assigned orders, quick actions, and Stage 15 offline sync placeholder appear on mobile and desktop widths.
- Open `/field-sales/sales/new`, create one instant sale with an existing customer, and confirm the detail page shows customer, SKU, payment method/reference, delivery status, vehicle, route, zone, issued filled cylinder, collected empty cylinder, and audit-facing discrepancy area.
- Create a second instant sale while registering a new field customer and confirm it appears in `/field-sales/sales` and the customer appears in `/customers`.
- Confirm each MSO sale reduces filled stock on the assigned vehicle and increases empty stock by one cylinder.
- Try an invalid field sale, such as no selected customer or no SKU, and confirm a clear validation message appears.
- Try a SKU with no filled vehicle stock and confirm the app blocks the sale with a clear stock message.
- Log in as Auditor and confirm `/field-sales` and `/field-sales/sales` are view-only.
- Log in as Customer or RSO and confirm restricted field-sales screens or APIs are blocked.
- Confirm `/api/health` returns stage `8`.

## Earlier Stage Checks

- Visit `/login` and sign in with each seeded role.
- Confirm Admin can access all pages.
- As Admin, RSO, or MSO, visit `/orders`.
- Create an order with one line item and confirm it appears in the order list and detail views.
- Create a bulk/commercial order with multiple line items and confirm all lines appear on the detail page.
- Confirm automatic order numbers, priority flag, channel, delivery zone, expected delivery date, and status are shown.
- Move an order through Pending, Confirmed, Assigned, Dispatched, Delivered, and Closed.
- Cancel an order before dispatch and confirm it cannot be edited afterward.
- Confirm edit/cancel controls are not available once an order is Dispatched.
- Try invalid order input such as no customer, no line items, or quantity above available stock and confirm a clear validation message appears.
- Confirm Auditor and Warehouse Manager can view orders, but cannot create/edit order records.
- Confirm Customer cannot access order management.
- As RSO, visit `/retail-sales/refills`.
- Create a walk-in refill for an existing customer.
- Create another walk-in refill while registering a new customer.
- Confirm each refill appears in the list and detail views.
- Confirm the detail view shows invoice number, receipt number, payment record, issued filled cylinder, received empty cylinder, and delivery/credit placeholders.
- Confirm filled stock decreases and empty stock increases at the assigned RSO outlet after the transaction closes.
- Try an invalid refill input such as no customer or no SKU and confirm a validation message appears.
- Confirm Auditor can view refill records but cannot create them.
- Confirm MSO, Warehouse Manager, and Customer cannot create RSO refill transactions.
- As Admin or Warehouse Manager, visit `/inventory`.
- Visit `/inventory/movements` and create movement requests for receipt, issue, transfer, damaged quarantine, or maintenance transfer.
- As Warehouse Manager, approve a requested movement.
- Dispatch an approved transfer or issue and confirm the linked cylinders update status/location only after dispatch.
- Receive a dispatched transfer and confirm stock balances update only after receiving.
- Receive one movement with a variance and confirm the variance reason is logged on the movement detail page.
- Confirm movement history and linked cylinder history are shown on movement and cylinder detail pages.
- Confirm RSO and MSO can request and receive stock only for movements touching their assigned locations.
- Confirm Auditor can view movement records and audit history but cannot approve, dispatch, receive, or create movements.
- Try invalid movement input such as a missing source location for a transfer and confirm a validation message appears.
- Create at least two cylinder records and confirm they appear in `/inventory/cylinders` and their detail pages.
- Edit one cylinder status or location and confirm a history entry is created.
- Use `/inventory/opening-balances/new` to create a small opening balance and confirm generated cylinders appear in the cylinder list.
- Visit `/inventory/stock-balances` and confirm balances are grouped by SKU, location, and status.
- Confirm alert placeholders are visible for low stock, overstock, and excess damaged cylinders.
- Try invalid cylinder input such as a one-character serial number and confirm a validation message appears.
- Confirm Customer roles cannot access inventory screens or actions.
- Confirm Auditor can view inventory screens but cannot create or edit cylinders.
- As Admin, RSO, or MSO, visit `/customers`.
- Register at least two customers and confirm they appear in the customer list and profile pages.
- Search customers by name, phone, or ID/passport/proof reference.
- Edit one customer and confirm the updated values appear on the profile.
- Try a duplicate phone or duplicate ID/passport/proof reference and confirm a clear duplicate message appears.
- Try invalid customer input, such as a short name or invalid phone, and confirm a validation message appears.
- Confirm the customer profile shows placeholders for orders, payments, complaints, and service history.
- Confirm Auditor can view `/customers` and customer profiles, but cannot create or edit customers.
- As Admin, visit `/admin/master-data`.
- Open SKU Master, Cylinder Sizes, Prices, Taxes, Regions, Zones, Warehouses, Retail Outlets, Vehicles, Maintenance Locations, Damaged Quarantine Locations, and Stock Thresholds.
- Create at least two records in a master-data area and confirm they appear in the list and detail views.
- Edit one record and confirm the updated values appear on the detail view.
- Deactivate one record and confirm its status changes to inactive.
- Try an invalid record such as a one-character name or negative amount and confirm a validation message appears.
- Confirm Warehouse Manager can access `/warehouse`, `/inventory`, and `/transfers`, but not `/reports`.
- Confirm RSO can access `/rso`, `/retail-sales`, and `/retail-inventory`.
- Confirm MSO can access `/mso`, `/field-sales`, and `/deliveries`.
- Confirm Auditor can access `/auditor`, `/reports`, `/audit-logs`, and inventory viewing screens but cannot perform write actions.
- Confirm Customer can access `/customer` only as a placeholder role view.
- Confirm non-admin roles cannot access `/admin/master-data`.
- Use the logout button in the top bar and confirm protected pages redirect back to `/login`.
- Confirm `/api/health` returns a basic status payload.
- Confirm `/api/starter-data` returns roles, users, locations, and LPG SKU starter data.
- Confirm Prisma seed data includes all six roles, sample users, locations, audit log placeholders, master data records, 6kg, 13kg, and 50kg LPG cylinder SKU types, seed cylinders, and a Stage 5 seed movement request.
