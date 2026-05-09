# Production Readiness Checklist

## Security

- Replace demo users and passwords.
- Replace SHA-256 prototype password hashing with a slow salted hash such as Argon2 or bcrypt.
- Set a long random `AUTH_SECRET`.
- Enforce MFA after the placeholder provider is connected.
- Review RBAC permissions for every API route.
- Enable HTTPS, secure cookies, and strict transport security.
- Configure audit log retention and export policy.

## Database

- Run migrations with `npx prisma migrate deploy`.
- Configure PostgreSQL backups and restore testing.
- Confirm indexes for high-volume tables.
- Separate production, UAT, and development databases.
- Disable destructive reset scripts in production runbooks.

## Operations

- Configure live integrations only after provider credentials and retry rules are approved.
- Connect object storage for document, photo, signature, and certificate uploads.
- Configure monitoring, logging, alerting, and uptime checks.
- Add error tracking for frontend and backend exceptions.
- Confirm support process for failed sync, failed payments, and integration retries.

## UAT Sign-Off

- Complete the UAT checklist.
- Verify role-based workflows with real business users.
- Confirm all known limitations are accepted or scheduled.
- Capture sign-off from operations, finance, warehouse, sales, safety/compliance, and audit stakeholders.
