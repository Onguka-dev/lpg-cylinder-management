# LPG Cylinder Management App

Stage 5 adds inventory movement and transfer workflows on top of authentication, role-based access control, admin master-data configuration, customer management, and the cylinder inventory foundation. Sales and delivery workflows remain placeholders.

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

## Manual Stage 5 Checks

- Visit `/login` and sign in with each seeded role.
- Confirm Admin can access all pages.
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
