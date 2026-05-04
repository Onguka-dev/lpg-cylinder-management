# LPG Cylinder Management App

Stage 1 adds authentication, session handling, and role-based access control. Business workflows are intentionally placeholders.

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

## Manual Stage 1 Checks

- Visit `/login` and sign in with each seeded role.
- Confirm Admin can access all pages.
- Confirm Warehouse Manager can access `/warehouse`, `/inventory`, and `/transfers`, but not `/reports`.
- Confirm RSO can access `/rso`, `/retail-sales`, and `/retail-inventory`.
- Confirm MSO can access `/mso`, `/field-sales`, and `/deliveries`.
- Confirm Auditor can access `/auditor`, `/reports`, and `/audit-logs`, but not `/inventory`.
- Confirm Customer can access `/customer` only as a placeholder role view.
- Use the logout button in the top bar and confirm protected pages redirect back to `/login`.
- Confirm `/api/health` returns a basic status payload.
- Confirm `/api/starter-data` returns roles, users, locations, and LPG SKU starter data.
- Confirm Prisma seed data includes all six roles, sample users, locations, audit log placeholders, and 6kg, 13kg, and 50kg LPG cylinder SKU types.
