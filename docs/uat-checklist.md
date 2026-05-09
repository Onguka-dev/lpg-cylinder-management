# UAT Checklist

## Access

- Admin can access all pages and APIs.
- Warehouse Manager can manage inventory, movements, deliveries, reconciliation, reports, safety, notifications, and integrations.
- RSO can manage customers, retail sales, orders, payments, reports, reconciliation, and assigned movement requests.
- MSO can manage field sales, deliveries, customers, orders, offline drafts, payments, reports, and reconciliation.
- Auditor can view reports, audit logs, safety, payments, orders, deliveries, integrations, notifications, and security review screens without write actions.
- Customer placeholder cannot access operational modules.

## End-to-End Demo Flow

1. Log in as Admin.
2. Confirm `/api/health` returns the current stage.
3. Review `/settings/security` and `/audit-logs`.
4. Create or review a customer in `/customers`.
5. Review cylinder stock in `/inventory` and `/inventory/stock-balances`.
6. Create an inventory movement request in `/inventory/movements`.
7. Log in as Warehouse Manager and approve/dispatch/receive the movement.
8. Log in as RSO and create a refill sale in `/retail-sales/refills`.
9. Create an order in `/orders`.
10. Assign and update a delivery in `/deliveries`, including OTP/GPS/photo placeholders.
11. Create an invoice and payment in `/payments`.
12. Create and submit a daily reconciliation in `/reconciliations`.
13. Create or review a maintenance case in `/safety`.
14. Confirm damaged, unsafe, expired, quarantined, or under-maintenance cylinders cannot be sold or dispatched.
15. Review reports and CSV export in `/reports`.
16. Review notification, integration, and offline placeholders.

## Acceptance Checks

- Required fields show clear validation messages.
- Duplicate customer phone/proof references are blocked.
- Stock-affecting actions write movement/history records.
- Payment and invoice balances update correctly.
- Approved reconciliations are locked unless Admin override is used.
- Audit logs record authentication, changes, approvals, payments, reconciliation, compliance, integration, and security events.
- Unauthorized API calls return `401` or `403` instead of performing changes.
