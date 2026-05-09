# Deployment Guide

## Purpose

This guide prepares the LPG Cylinder Management App for testing, UAT, and production-style demonstrations. Stage 18 does not connect live payment, SMS, email, GPS, or barcode providers; those remain mock adapters/placeholders.

## Required Services

- Node.js compatible with the project lockfile
- PostgreSQL 14 or newer
- A database user with permission to create tables, indexes, and enums
- HTTPS-capable hosting for production

## Environment Variables

Create `.env` from `.env.example` and set:

- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_SECRET`: long random secret for signed sessions
- `NEXT_PUBLIC_APP_NAME`: display name
- `NEXT_PUBLIC_APP_ENV`: local, uat, staging, or production
- `MOCK_INTEGRATIONS_ENABLED`: keep `true` until live adapters are approved
- `UPLOADS_PLACEHOLDER_PATH`: placeholder path for future document/photo storage

## Local/UAT Setup

```bash
npm install
npm run demo:prepare
npm run dev
```

Open `http://localhost:3000`.

## Reset Demo Data

Use this only for local/UAT demonstration databases:

```bash
npm run demo:reset
```

The reset command reapplies migrations and runs the Prisma seed configured in `package.json`.

## Deployment Steps

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Set a strong `AUTH_SECRET`.
3. Install dependencies with `npm ci`.
4. Generate Prisma Client with `npm run prisma:generate`.
5. Apply migrations with `npx prisma migrate deploy`.
6. Seed UAT/demo data only where appropriate with `npm run prisma:seed`.
7. Build with `npm run build`.
8. Start with `npm run start`.

## Verification

```bash
npm run uat:check
```

Then manually verify `/api/health`, `/login`, `/settings/security`, `/audit-logs`, and the main operational modules.
