# Known Limitations

- Payment gateway, Mpesa, card, SMS, email, SAP/accounting, barcode/RFID, GPS/maps, photo upload, signature, Excel/PDF export, and scheduled reports are placeholders or mock adapters.
- Offline mode stores draft/sync data for demonstration, but conflict resolution remains manual.
- Password hashing is intentionally simple for the staged prototype and must be upgraded before real production use.
- Customer self-service is a placeholder.
- Advanced pricing, promotions, credit workflows, delivery optimization, and live stock reservation rules are not fully automated.
- File uploads store placeholders only; no object storage or virus scanning is connected.
- Some dashboards use simple tables/KPI cards instead of advanced analytics.
- Visual QA screenshots are captured from the local development browser and should be refreshed after final logo/image assets are supplied. In this Codex session the available in-app browser viewport was phone-sized, so final desktop-width screenshots should be refreshed in a widened browser before client sign-off.
- Browser-level print/share, mobile push notification permissions, and native camera/gallery upload flows remain placeholders until production hosting and device policy are selected.
- Demo users share a seeded password for UAT convenience and must not be used in production.
- `npm run demo:reset` is destructive and should be used only against local/UAT demo databases.
