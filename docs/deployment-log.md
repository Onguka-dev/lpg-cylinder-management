# Wells Gas Free Hosting Deployment Log

Date prepared: 2026-05-09

## Deployment Target

- Platform used: Vercel Hobby, GitHub-connected project.
- Repository: `https://github.com/Onguka-dev/lpg-cylinder-management`
- Branch deployed: `feature/wells-gas-client-ready-branding`
- Framework preset: Next.js.
- Install command: `npm ci`
- Build command: `npm run build`
- Output configuration: Vercel Next.js default output. No custom output directory is required.
- Start command outside Vercel: `npm run start`

## Database Provider Decision

- Selected provider: Neon Free Postgres.
- Reason: The app mainly needs PostgreSQL for Prisma and does not currently use Supabase Auth or Supabase Storage.
- Alternative: Supabase Free Postgres can also work if the project later adopts Supabase Auth, Storage, or dashboard operations.

## Required Hosted Environment Variables

Configure these in Vercel Project Settings -> Environment Variables. Do not commit actual values.

- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_URL`
- `NEXTAUTH_URL`
- `APP_BRAND_NAME`
- `APP_COMPANY_NAME`
- `NEXT_PUBLIC_APP_NAME`
- `APP_ENV`
- `NEXT_PUBLIC_APP_ENV`
- `FILE_UPLOAD_PROVIDER`
- `UPLOADS_PLACEHOLDER_PATH`
- `SMS_PROVIDER`
- `EMAIL_PROVIDER`
- `PAYMENT_PROVIDER`
- `MOCK_INTEGRATIONS_ENABLED`

Optional, only if your Postgres provider gives separate URLs:

- `DIRECT_URL`
- `DATABASE_URL_UNPOOLED`

## Migration Status

- Local migration verification: pending for hosted database.
- Hosted migration command: `npm run db:migrate`
- Safe migration behavior: uses `prisma migrate deploy`.
- Do not run `npm run prisma:migrate`, `prisma migrate dev`, or `npm run db:reset-demo` against production.

## Seed Status

- Demo seed command: `npm run db:seed`
- Seed status: pending platform/database provisioning.
- Seed only for a safe demo/UAT deployment.
- Demo accounts use `password123`; replace or disable before production go-live.

## Deployment Steps To Complete In Vercel

1. In Vercel, import the GitHub repository.
2. Select branch `feature/wells-gas-client-ready-branding`.
3. Keep the Next.js framework preset.
4. Confirm install command `npm ci`.
5. Confirm build command `npm run build`.
6. Leave output directory unset/default.
7. In Neon, create a free Postgres project/database.
8. Copy the Neon connection string into Vercel as `DATABASE_URL`.
9. Add all required environment variables listed above.
10. Run `npm run db:migrate` against the hosted database using the same environment variables.
11. Run `npm run db:seed` only for demo/UAT.
12. Deploy from Vercel.
13. Set `APP_URL` and `NEXTAUTH_URL` to the final Vercel preview/production URL.
14. Redeploy if URL environment variables changed.

## Online Test Results

Status: not executed from Codex because Vercel and Neon account credentials are not available in this workspace.

Once deployed, test:

- [ ] Login page opens.
- [ ] Admin login succeeds.
- [ ] Dashboard opens.
- [ ] Warehouse overview opens.
- [ ] Retail POS opens.
- [ ] MSO screens open.
- [ ] Warehouse mobile screens open.
- [ ] Order/payment/delivery sample flow works.
- [ ] Reports open and CSV export works.
- [ ] Unauthorized roles are blocked from restricted screens.
- [ ] `/api/health` returns OK.

## Known Limitations

- SMS, email, payment, GPS/maps, barcode/RFID, and file uploads remain mock or placeholder providers.
- Vercel Hobby and Neon Free are suitable for initial demo/UAT only, not guaranteed production scale.
- Hosted database credentials must remain in Vercel/Neon secret storage only.
- Demo seed users are convenient for UAT and should not remain enabled for real production use.
- Final desktop screenshots should be refreshed in a widened browser before client sign-off.

## Backup Plan

- Keep GitHub branch `feature/wells-gas-client-ready-branding` as the deployment source.
- Keep backup branch `backup/original-lpg-cylinder-app-before-wells-gas`.
- Take a Neon/Supabase database backup before migrations and before UAT demos.
- Record the deployed Vercel build URL and Git commit before changing environment variables or rerunning migrations.

## Reference Docs Checked

- Vercel build configuration: `https://vercel.com/docs/builds/configure-a-build`
- Vercel Git deployments: `https://vercel.com/docs/deployments/git`
- Vercel Next.js deployment: `https://vercel.com/docs/frameworks/nextjs`
- Neon connection pooling and migration notes: `https://neon.com/docs/connect/connection-pooling`
