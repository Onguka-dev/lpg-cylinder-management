# Role-Based User Guide

## Admin

- Use `/settings/security` to review password policy, session timeout, MFA readiness, and device sessions.
- Use `/admin/master-data` to manage SKUs, locations, fees, thresholds, vehicles, routes, and other master data.
- Use `/audit-logs` and `/auditor` for full audit visibility.
- Admin can override locked reconciliation records with an audit reason.

## Warehouse Manager

- Use `/inventory` to review cylinders and stock balances.
- Use `/inventory/movements` to approve, dispatch, receive, and log variances.
- Use `/deliveries` for loading and delivery coordination.
- Use `/safety` for maintenance, quarantine, and return-to-stock controls.

## RSO

- Use `/customers` to register and update customers.
- Use `/retail-sales/refills` for walk-in refill sales.
- Use `/orders` for retail or call-centre order capture.
- Use `/reconciliations` for close-of-day stock and cash accountability.

## MSO

- Use `/field-sales` for vehicle stock, assigned route/zone, instant sale placeholders, and empty cylinder collection.
- Use `/deliveries` for delivery status updates and proof-of-delivery placeholders.
- Use `/offline` to manage offline drafts and sync queue placeholders.
- Use `/reconciliations` for daily accountability.

## Auditor

- Use `/auditor` for exception and review shortcuts.
- Use `/audit-logs` to filter logs by category, severity, and search text.
- Use `/reports` for dashboards and CSV export.
- Auditor access is view-only for operational workflows.

## Customer Placeholder

- Customer self-service is intentionally limited at this stage.
- Customer users should not access internal operational workflows.
