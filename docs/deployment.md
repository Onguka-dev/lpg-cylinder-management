# Deployment Guide

## Purpose

This guide prepares the LPG Cylinder Management App for testing, UAT, and production-style demonstrations. Stage 18 does not connect live payment, SMS, email, GPS, or barcode providers; those remain mock adapters/placeholders.

## Required Services

- Node.js 20 LTS or newer
- PostgreSQL 14 or newer
- A database user with permission to create tables, indexes, and enums
- HTTPS-capable hosting for production

## Environment Variables

Create `.env` from `.env.example` and set:

- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_SECRET`: long random secret for signed sessions
- `APP_URL` / `NEXTAUTH_URL`: public app URL for deployed environments
- `APP_BRAND_NAME`: Wells Gas brand name
- `APP_COMPANY_NAME`: Green Wells Energies company name
- `APP_ENV` / `NEXT_PUBLIC_APP_ENV`: local, uat, staging, or production
- `NEXT_PUBLIC_APP_NAME`: display name
- `FILE_UPLOAD_PROVIDER`: use `local-placeholder` until production storage is approved
- `SMS_PROVIDER` / `EMAIL_PROVIDER`: use `mock` until live messaging providers are approved
- `PAYMENT_PROVIDER`: use `mock` until live payment providers are approved
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
2. For free initial hosting, use Vercel Hobby and connect the GitHub branch `feature/wells-gas-client-ready-branding`.
3. Use Neon Free Postgres by default because the app mainly needs Prisma/PostgreSQL. Use Supabase Free only if you later adopt Supabase Auth, Storage, or platform-specific features.
4. Set a strong `AUTH_SECRET`.
5. Install dependencies with `npm ci`.
6. Generate Prisma Client with `npm run prisma:generate`.
7. Apply production-safe migrations with `npm run db:migrate`.
8. Seed UAT/demo data only where appropriate with `npm run db:seed`.
9. Build with `npm run build`.
10. Start with `npm run start`, or use Vercel's Next.js runtime.

## Vercel Configuration

- Framework preset: Next.js
- Repository branch: `feature/wells-gas-client-ready-branding`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: leave unset/default
- Runtime environment variables: configure in Vercel Project Settings, never in Git
- Public URL: set `APP_URL` and `NEXTAUTH_URL` to the Vercel preview/production URL, then redeploy

## Production-Safe Prisma Notes

- Use `npm run db:migrate` / `prisma migrate deploy` in deployed environments.
- Do not run `prisma migrate dev` or reset commands against production databases.
- `npm run db:reset-demo` is destructive and exists only for local/UAT demo databases.
- Review migration SQL before applying to production and confirm a database backup exists.

## Verification

```bash
npm run uat:check
```

Then manually verify `/api/health`, `/login`, `/settings/security`, `/audit-logs`, and the main operational modules.
