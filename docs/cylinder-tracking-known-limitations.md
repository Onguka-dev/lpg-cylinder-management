# Cylinder Tracking Known Limitations

These limitations are acceptable for UAT if stakeholders explicitly sign them off. They must be reviewed again before handling live operational data.

## Scanner and Mobile Capture

- USB and Bluetooth scanner keyboard input is supported through the reusable scan input patterns.
- Manual barcode entry is supported for fallback and UAT.
- Real camera scanning is a placeholder and does not yet decode barcodes from the device camera.
- Photo capture for damaged cylinders, non-coded returns, documents, and proof attachments stores placeholders only until object storage and device capture policy are approved.

## SAP and External Integrations

- SAP posting uses the mock queue and integration logs only.
- No real SAP endpoint, SAP credential, or SAP posting secret is committed or required for UAT.
- Mock success and failure states are intended to validate operational readiness without blocking receipts, movements, sales, returns, or reconciliation.
- Payment gateway, Mpesa, card, email, SMS, GPS/maps, barcode/RFID hardware integrations, and scheduled exports remain mock or placeholder integrations.

## Reporting and Export

- CSV export is the supported export format for current UAT checks.
- Excel and PDF export buttons or labels are placeholders unless final export utilities are connected.
- Advanced dashboard analytics are intentionally simple KPI cards and operational tables.
- Report accuracy depends on running the complete transaction path, including receipt confirmation and reconciliation submission.

## Data, Security, and Production Use

- Seeded demo users share `password123` and are safe only for local or UAT demonstration.
- Customer KYC fields must remain restricted to authorized roles.
- Password hashing is a prototype implementation and must be upgraded before production launch.
- Offline sync remains a demonstration workflow with manual conflict review.
- Production launch requires verified backups, restore testing, monitoring, live environment variables, and disabled destructive reset scripts.

## Operational Scope

- Non-coded cylinders remain blocked from sale until reviewed, linked or tagged, and approved.
- Damaged, leaking, quarantined, under-maintenance, scrapped, or unsafe cylinders are blocked from normal sale and dispatch flows.
- Cross-region movements require Admin or Warehouse Manager permission.
- Customer self-service remains a placeholder unless a secure customer app is separately implemented.
