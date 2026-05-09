# End-to-End Demo Script

## Preparation

```bash
npm run demo:prepare
npm run dev
```

Use `http://localhost:3000` and the seeded users from the README.

## Demonstration Path

1. Admin signs in and opens the dashboard.
2. Admin reviews security controls and active sessions at `/settings/security`.
3. Admin opens `/audit-logs` and shows authentication/security events.
4. Admin reviews seeded master data and SKUs.
5. RSO signs in and registers a customer.
6. Warehouse Manager signs in and reviews cylinders/stock balances.
7. Warehouse Manager creates or approves an inventory movement.
8. RSO creates a retail refill sale and payment placeholder.
9. Admin or RSO creates a customer order with multiple line items.
10. Warehouse Manager or MSO assigns and updates delivery status.
11. MSO records proof of delivery placeholders: OTP, signature, photo, GPS, and remarks.
12. Admin/RSO/MSO creates an invoice and records partial/full payment.
13. RSO/MSO/Warehouse user creates daily reconciliation.
14. Warehouse Manager creates a maintenance case and confirms unsafe cylinders are blocked.
15. Auditor signs in and reviews `/auditor`, `/audit-logs`, `/reports`, and exception lists.

## Reset Between Demos

```bash
npm run demo:reset
```

Only use reset against local or UAT demo databases.
