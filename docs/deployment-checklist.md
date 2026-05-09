# Wells Gas Deployment Checklist

Use this checklist before deploying the Wells Gas LPG Cylinder Management App to UAT, staging, or production. Do not paste real secrets into GitHub, tickets, screenshots, or documentation.

## Source Control

- [ ] Confirm branch `feature/wells-gas-client-ready-branding` is current and pushed to GitHub.
- [ ] Confirm no local uncommitted work remains before deployment tagging.
- [ ] Confirm `.env` and `.env.local` are ignored and not committed.
- [ ] Confirm deployment notes and known limitations have been reviewed.

## Database

- [ ] PostgreSQL 14 or newer is provisioned.
- [ ] Production/UAT database name, user, password, host, port, and SSL mode are confirmed outside Git.
- [ ] Database backup and restore plan is documented.
- [ ] `DATABASE_URL` is set in the hosting provider secret manager.
- [ ] Prisma migrations are reviewed.
- [ ] Run `npm run db:migrate`.
- [ ] Load seed/demo data only where appropriate with `npm run db:seed`.

## Environment Variables

- [ ] `DATABASE_URL` is set.
- [ ] `AUTH_SECRET` is set to a long random production value.
- [ ] `APP_URL` and `NEXTAUTH_URL` are set to the deployed URL.
- [ ] `APP_BRAND_NAME=Wells Gas`.
- [ ] `APP_COMPANY_NAME=Green Wells Energies`.
- [ ] `APP_ENV` and `NEXT_PUBLIC_APP_ENV` are set correctly.
- [ ] `FILE_UPLOAD_PROVIDER=local-placeholder` until real storage is approved.
- [ ] `SMS_PROVIDER=mock` until live SMS is approved.
- [ ] `EMAIL_PROVIDER=mock` until live email is approved.
- [ ] `PAYMENT_PROVIDER=mock` until live Mpesa/card/online credentials are approved.
- [ ] No real API keys, payment credentials, SMS tokens, or database passwords are committed.

## Build And Release

- [ ] Install dependencies with `npm ci`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Start with `npm run start` or the hosting platform equivalent.
- [ ] Confirm `/api/health` returns an OK payload.

## UAT Smoke Test

- [ ] Login tested with Admin.
- [ ] Login tested with Warehouse Manager.
- [ ] Login tested with RSO.
- [ ] Login tested with MSO.
- [ ] Login tested with Auditor.
- [ ] Dashboard reviewed on desktop and mobile.
- [ ] Warehouse overview and Zone A incoming reviewed.
- [ ] Retail POS/refill screens reviewed.
- [ ] MSO field sales screens reviewed.
- [ ] Warehouse mobile/PWA screens reviewed.
- [ ] Reports and CSV export reviewed.
- [ ] Notifications, profile, settings, and audit screens reviewed.
- [ ] Unauthorized role access verified for restricted screens.

## Backup And Rollback

- [ ] Database backup exists before migration.
- [ ] Previous known-good Git commit or release tag is recorded.
- [ ] Hosting rollback procedure is documented.
- [ ] Demo reset command `npm run db:reset-demo` is confirmed as local/UAT only and not available to production operators.
