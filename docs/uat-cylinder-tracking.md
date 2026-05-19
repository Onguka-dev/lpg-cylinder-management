# Cylinder Tracking UAT Script

Use this script to validate the complete Wells Gas cylinder tracking cycle in a UAT database seeded with demo data. Demo users use `password123` only in local or UAT environments.

## Preconditions

- Run `npm install` if dependencies are missing.
- Run `npx prisma generate`.
- Run `npm run db:migrate` against the UAT database.
- Run `npm run db:seed` to load demo roles, users, locations, customers, cylinders, movements, reconciliation, reports, audit markers, and integration placeholders.
- Confirm the app starts and `/api/health` responds.
- Confirm seeded users can log in: Admin, Warehouse Manager, Plant Manager, RSO, MSO, Service Centre Staff, Finance/SAP Reviewer, and Auditor.

## Scenario 1: Supplier Receipt Into Warehouse

1. Log in as Admin or Warehouse Manager.
2. Open Inventory > Supplier Receipts > New.
3. Select Wandiege Main Warehouse.
4. Enter supplier, purchase order, delivery note, vehicle/truck number, receipt date/time, received by, remarks, and attachment placeholder.
5. Add lines for 3 x 6kg, 3 x 13kg, and 2 x 50kg cylinders with factory serial numbers and barcodes.
6. Save as Draft, review, then post the receipt.

Expected result:
- Posted receipt creates cylinder asset records.
- Stock is available at Wandiege by size, status, and location.
- Each cylinder has a receipt movement history and audit entry.
- Draft receipts do not affect stock until posted.

## Scenario 2: Duplicate Barcode and Serial Validation

1. Start another supplier receipt.
2. Reuse one existing barcode or factory serial number from Scenario 1.
3. Try to post the receipt.

Expected result:
- Duplicate barcode or serial number is blocked before posting.
- No duplicate cylinder is created.
- The user sees a clear validation message.

## Scenario 3: Warehouse To Plant Empty Transfer

1. Log in as Warehouse Manager.
2. Open Inventory > Plant Transfers > New.
3. Select Wandiege Main Warehouse as source and Sabuni Road Refilling Plant as destination.
4. Scan or enter empty cylinders currently at Wandiege.
5. Enter vehicle, driver, seal number, dispatch note, expected receipt time, and remarks.
6. Dispatch the transfer.

Expected result:
- Only empty cylinders at Wandiege are accepted.
- Dispatched cylinders move to in-transit status.
- Wandiege stock decreases only through the in-transit workflow.
- Movement history and scan events are written.

## Scenario 4: Plant Receipt, Variance, and Refill Return

1. Log in as Plant Manager.
2. Open the dispatched plant transfer.
3. Scan received cylinders.
4. Mark one expected cylinder as missing or damaged to create a variance.
5. Create a refill batch from received empty cylinders.
6. Mark the refill batch filled after quality check.
7. Dispatch filled cylinders back to Wandiege.
8. Log in as Warehouse Manager and receive the return by scan.

Expected result:
- Plant receipt updates location and status only for received cylinders.
- Missing, extra, or damaged scans create variance cases.
- Filled cylinders become warehouse stock only after Wandiege confirms receipt.
- Refill batch and quality inspection details remain traceable.

## Scenario 5: Dispatch Filled Cylinders To Selling Point

1. Log in as Warehouse Manager.
2. Open Inventory > Selling Point Dispatches > New.
3. Use Wandiege as source.
4. Select a valid destination such as KDK 152E, POLYVIEW, Ugunja, or another Western service centre.
5. Scan filled cylinders physically located at Wandiege.
6. Enter transfer number, vehicle, driver or sales rep, route, dispatch officer, receiving officer, date/time, and remarks.
7. Dispatch the batch.
8. Log in as the destination role and receive by scan.

Expected result:
- Only filled cylinders at the source can be dispatched.
- Destination stock becomes available for sale only after receipt confirmation.
- Vans, stations, and service centres see their own stock.
- In-transit and overdue transfers are visible in reports.

## Scenario 6: Nairobi Warehouse Distribution

1. Log in as Admin or Warehouse Manager.
2. Receive demo cylinders into Lake Gas Nairobi Warehouse or Oilcom Nairobi Warehouse.
3. Dispatch cylinders to Garden Estate, Jogoo Road, Nairobi West, Dagoretti, or Mlolongo.
4. Receive at the Nairobi service centre by scan.
5. Open stock reports with Nairobi region filters.

Expected result:
- Lake Gas and Oilcom dispatch only their own stock.
- Nairobi cylinders do not appear as Wandiege stock unless transferred.
- Cross-region movement is restricted to permitted roles.

## Scenario 7: Customer Registration and Full Cylinder Sale

1. Log in as RSO, MSO, Van Sales, or Service Centre Staff.
2. Open Retail Sales > POS.
3. Register or select a customer with name, phone, ID/passport, KRA PIN, address, customer type, and notes.
4. Select Full Cylinder + Gas.
5. Scan an outgoing filled cylinder at the current selling point.
6. Complete payment through the existing invoice/payment workflow.

Expected result:
- Sale can use only cylinders physically available at the selling point.
- Outgoing cylinder moves to with-customer status.
- CustomerCylinderCustody is created.
- Receipt shows customer, sale type, size, barcode, payment mode, and responsible selling point.

## Scenario 8: Refill Exchange With Returned Empty

1. Open POS as a selling point user.
2. Select the same customer.
3. Select Refill Exchange/Gas Only.
4. Scan an outgoing filled cylinder.
5. Scan the returned empty cylinder.
6. Complete the sale.

Expected result:
- Filled stock decreases and empty stock increases at the selling point.
- Returned empty cylinder moves to empty-at-selling-point status.
- Customer custody for the returned cylinder closes.
- Custody history shows both outgoing and returned cylinders.

## Scenario 9: Non-Coded Return

1. In POS or Log Return, choose Return Cylinder with No QR Code.
2. Search and select the customer by phone, ID number, email, or full name.
3. Enter visible serial number, size, brand/manufacturer if visible, condition, photo placeholder, intake location, and staff remarks.
4. Continue a refill exchange by scanning the outgoing filled cylinder.
5. Log in as Warehouse Manager or Admin and review the non-coded intake queue.
6. Approve and link to an existing cylinder, create a new pending cylinder, or reject/escalate.

Expected result:
- Non-coded return keeps the customer link.
- The returned cylinder remains pending review and cannot be sold.
- Tagging queue reports pending barcode riveting/tagging.
- Rejected or non-company cylinders remain reportable.

## Scenario 10: Empty Reverse Logistics

1. Log in as selling point user.
2. Confirm empties collected from customers are visible at the selling point.
3. Open Empty Return Transfer.
4. Dispatch empties to Wandiege, Ugunja, Lake Gas, or Oilcom based on region and route.
5. Log in as warehouse user and receive by scan.

Expected result:
- Empties move through in-transit status.
- Warehouse receipt updates location/status to empty-at-warehouse.
- Damaged or leaking cylinders route to quarantine instead of refill flow.
- Empty returns reports reconcile to the transfer.

## Scenario 11: Damaged or Leaking Return

1. Mark one returned empty as damaged or leaking.
2. Try to include it in a normal refill or selling workflow.

Expected result:
- Damaged/leaking cylinder moves to quarantine workflow.
- Normal dispatch, sale, and refill flows block the cylinder.
- Safety or variance reports show the damaged return.

## Scenario 12: Reports and CSV Export

1. Open Reports > Cylinder Movement & Inventory.
2. Review tabs for Cylinder Transfers, Sales by Cylinder, Stock Levels, Customer Custody, In Transit, Variance/Loss, and Empty Returns.
3. Apply filters for date range, size, location, source, destination, status, customer, sales person, and barcode search.
4. Export visible rows to CSV.
5. Open SAP Reconciliation report and confirm mock queue statuses are visible where transactions created queue entries.

Expected result:
- Reports use real movement, sale, custody, reconciliation, and stock data.
- CSV exports include visible table rows.
- Auditor can view/export but cannot edit records.
- Excel/PDF exports remain placeholders until final utilities are approved.

## Scenario 13: Daily Reconciliation With Deliberate Variance

1. Log in as service centre or warehouse user.
2. Create a daily stock count for one location.
3. Enter one deliberate variance by size/status.
4. Submit the reconciliation.
5. Log in as supervisor and approve, return for correction, or close.
6. Try editing an approved reconciliation without Admin override.

Expected result:
- Expected vs actual stock is calculated.
- VarianceCase is created and remains visible until closure.
- Approved reconciliation locks against normal edits.
- Admin override requires a reason and creates an audit log.

## Scenario 14: Role Permission Negative Tests

1. Log in as Auditor and attempt to post a supplier receipt, dispatch a warehouse transfer, or perform a sale.
2. Log in as Warehouse-only user and attempt a selling point POS sale.
3. Log in as Customer and attempt to open inventory, reports, audit, or admin screens.

Expected result:
- Auditor can view/export permitted records only.
- Warehouse-only user cannot perform selling point sales unless assigned a permitted role.
- Customer cannot access internal operations screens.
- Failed attempts are denied without changing stock or custody.

## UAT Sign-Off Evidence

Record the following for sign-off:

- Date, environment URL, database/environment name, and build commit.
- Roles tested and tester names.
- Receipt, transfer, sale, return, reconciliation, report export, and audit record references.
- Any accepted limitations from `docs/cylinder-tracking-known-limitations.md`.
- Any issues raised, owner, severity, and target fix date.
