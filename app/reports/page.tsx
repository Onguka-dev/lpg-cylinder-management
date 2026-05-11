import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentSession } from "@/lib/auth";
import { formatMoney } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import {
  canViewReports,
  dateRange,
  formatReportLabel,
  normalizeReportFilters,
  reportTypes,
  type ReportFilters
} from "@/lib/reports";

export default async function ReportsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const session = await getCurrentSession();
  if (!session || !canViewReports(session.user.role)) redirect("/unauthorized");

  const filters = normalizeReportFilters(searchParams ?? {});
  const createdAt = dateRange(filters);
  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);

  const [
    skus,
    locations,
    regions,
    inventoryByStatus,
    inventoryByLocation,
    inventoryBySku,
    cylinderHistory,
    refillRevenue,
    fieldRevenue,
    invoiceTotals,
    outstandingInvoices,
    creditCustomers,
    deliveryByStatus,
    reconciliationRecords,
    plantVarianceCases,
    safetyCounts,
    maintenanceCases,
    damagedCylinders,
    userActivity
  ] = await Promise.all([
    prisma.masterDataRecord.findMany({ where: { type: "SKU_MASTER", isActive: true }, orderBy: { name: "asc" } }),
    prisma.masterDataRecord.findMany({ where: { type: { in: ["LOCATION", "WAREHOUSE", "RETAIL_OUTLET", "VEHICLE", "MAINTENANCE_LOCATION", "DAMAGED_QUARANTINE_LOCATION"] }, isActive: true }, orderBy: { name: "asc" } }),
    prisma.masterDataRecord.findMany({ where: { type: "REGION", isActive: true }, orderBy: { name: "asc" } }),
    prisma.cylinder.groupBy({ by: ["status"], where: cylinderWhere(filters), _count: { _all: true } }),
    prisma.cylinder.groupBy({ by: ["currentLocationId"], where: cylinderWhere(filters), _count: { _all: true } }),
    prisma.cylinder.groupBy({ by: ["skuId"], where: cylinderWhere(filters), _count: { _all: true } }),
    prisma.cylinderHistory.findMany({ where: { ...(createdAt ? { createdAt } : {}) }, include: { cylinder: true, changedBy: true }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.refillOrder.aggregate({ where: { ...(createdAt ? { createdAt } : {}), ...(filters.skuId ? { skuId: filters.skuId } : {}), ...(filters.locationId ? { locationId: filters.locationId } : {}) }, _sum: { totalAmount: true } }),
    prisma.fieldSale.aggregate({ where: { ...(createdAt ? { createdAt } : {}), ...(filters.skuId ? { skuId: filters.skuId } : {}), ...(filters.locationId ? { vehicleId: filters.locationId } : {}) }, _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { ...(createdAt ? { createdAt } : {}), ...(invoiceStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {}) }, _sum: { totalAmount: true, amountPaid: true, balanceAmount: true } }),
    prisma.invoice.findMany({ where: { balanceAmount: { gt: 0 }, ...(createdAt ? { createdAt } : {}) }, include: { customer: true }, orderBy: { balanceAmount: "desc" }, take: 10 }),
    prisma.customer.findMany({ where: { ...(filters.customerCategory ? { category: filters.customerCategory as never } : {}) }, orderBy: { creditLimit: "desc" }, take: 10 }),
    prisma.delivery.groupBy({ by: ["status"], where: { ...(createdAt ? { createdAt } : {}), ...(deliveryStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {}) }, _count: { _all: true } }),
    prisma.dailyReconciliation.findMany({ where: { ...(createdAt ? { reconciliationDate: createdAt } : {}), ...(reconciliationStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {}), OR: [{ stockVariance: { not: 0 } }, { paymentVariance: { not: 0 } }] }, include: { owner: true, location: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.plantVarianceCase.findMany({ where: { ...(createdAt ? { createdAt } : {}), ...(plantVarianceStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {}) }, include: { transfer: true, cylinder: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    Promise.all([
      prisma.cylinder.count({ where: { OR: [{ unsafeStatus: true }, { quarantinedStatus: true }] } }),
      prisma.cylinder.count({ where: { expiryDate: { lt: now } } }),
      prisma.cylinder.count({ where: { hydroTestDueDate: { lt: now } } }),
      prisma.cylinder.count({ where: { inspectionDueDate: { gte: now, lte: soon } } })
    ]),
    prisma.maintenanceCase.findMany({ where: { ...(maintenanceStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {}) }, include: { cylinder: { include: { sku: true, currentLocation: true } } }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.cylinder.findMany({ where: { OR: [{ status: "DAMAGED" }, { unsafeStatus: true }, { quarantinedStatus: true }] }, include: { sku: true, currentLocation: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.auditLog.findMany({ where: { ...(createdAt ? { createdAt } : {}), ...(filters.role ? { user: { role: { name: filters.role as never } } } : {}) }, include: { user: { include: { role: true } } }, orderBy: { createdAt: "desc" }, take: 12 })
  ]);

  const locationName = new Map(locations.map((location) => [location.id, location.name]));
  const skuName = new Map(skus.map((sku) => [sku.id, sku.name]));
  const salesRevenue = Number(refillRevenue._sum.totalAmount ?? 0) + Number(fieldRevenue._sum.amount ?? 0);
  const outstanding = Number(invoiceTotals._sum.balanceAmount ?? 0);
  const totalCylinders = inventoryByStatus.reduce((sum, row) => sum + row._count._all, 0);
  const safetyAlertTotal = safetyCounts.reduce((sum, count) => sum + count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 13</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Reporting & Analytics Dashboards</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Inventory, sales, payments, delivery, reconciliation, safety, maintenance, damaged cylinder, and user activity reporting with CSV export.
        </p>
      </section>

      <Filters filters={filters} skus={skus} locations={locations} regions={regions} />

      <section className="grid gap-3 md:grid-cols-4">
        <Summary label="Inventory Levels" value={String(totalCylinders)} />
        <Summary label="Sales Revenue" value={formatMoney(salesRevenue)} />
        <Summary label="Outstanding Payments" value={formatMoney(outstanding)} />
        <Summary label="Compliance Alerts" value={String(safetyAlertTotal)} />
        <Summary label="Maintenance Cases" value={String(maintenanceCases.length)} />
        <Summary label="Damaged Cylinders" value={String(damagedCylinders.length)} />
        <Summary label="Delivery Records" value={String(deliveryByStatus.reduce((sum, row) => sum + row._count._all, 0))} />
        <Summary label="Activity Logs" value={String(userActivity.length)} />
        <Summary label="Plant Variances" value={String(plantVarianceCases.length)} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Exports</h2>
            <p className="mt-1 text-sm text-slate-500">CSV is active. Excel, PDF, and scheduled reporting are placeholders for later stages.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {reportTypes.map((type) => <Link className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700" href={`/api/reports/export?type=${type}&${new URLSearchParams(cleanFilterParams(filters)).toString()}`} key={type}>{formatReportLabel(type)} CSV</Link>)}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <ReportPanel title="Inventory By Status"><BarList rows={inventoryByStatus.map((row) => ({ label: formatReportLabel(row.status), value: row._count._all }))} /></ReportPanel>
        <ReportPanel title="Cylinder Location"><BarList rows={inventoryByLocation.map((row) => ({ label: locationName.get(row.currentLocationId) ?? "Unknown", value: row._count._all }))} /></ReportPanel>
        <ReportPanel title="Inventory By SKU"><BarList rows={inventoryBySku.map((row) => ({ label: skuName.get(row.skuId) ?? "Unknown", value: row._count._all }))} /></ReportPanel>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ReportPanel title="Cylinder Circulation">
          <SimpleTable headers={["Date", "Cylinder", "From", "To", "Changed By"]} rows={cylinderHistory.map((entry) => [entry.createdAt.toISOString().slice(0, 10), entry.cylinder.serialNumber, entry.previousStatus ?? "None", entry.newStatus, entry.changedBy?.name ?? "System"])} />
        </ReportPanel>
        <ReportPanel title="Delivery Performance"><BarList rows={deliveryByStatus.map((row) => ({ label: formatReportLabel(row.status), value: row._count._all }))} /></ReportPanel>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ReportPanel title="Outstanding Payments">
          <SimpleTable headers={["Invoice", "Customer", "Category", "Balance"]} rows={outstandingInvoices.map((invoice) => [invoice.invoiceNumber, invoice.customer.name, formatReportLabel(invoice.customer.category), formatMoney(invoice.balanceAmount)])} />
        </ReportPanel>
        <ReportPanel title="Customer Credit Limits">
          <SimpleTable headers={["Customer", "Category", "Credit Limit", "Status"]} rows={creditCustomers.map((customer) => [customer.name, formatReportLabel(customer.category), formatMoney(customer.creditLimit), customer.status])} />
        </ReportPanel>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ReportPanel title="Reconciliation Variances">
          <SimpleTable headers={["Reference", "Owner", "Location", "Stock Var", "Payment Var"]} rows={reconciliationRecords.map((record) => [record.reference, record.owner.name, record.location?.name ?? "No location", String(record.stockVariance), formatMoney(record.paymentVariance)])} />
        </ReportPanel>
        <ReportPanel title="Plant Transfer Variance Cases">
          <SimpleTable headers={["Reference", "Transfer", "Type", "Status", "Cylinder"]} rows={plantVarianceCases.map((variance) => [variance.reference, variance.transfer.reference, formatReportLabel(variance.type), formatReportLabel(variance.status), variance.cylinder?.serialNumber ?? "No cylinder"])} />
        </ReportPanel>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ReportPanel title="Safety Compliance">
          <BarList rows={[
            { label: "Unsafe / Quarantined", value: safetyCounts[0] },
            { label: "Expired", value: safetyCounts[1] },
            { label: "Hydro-Test Overdue", value: safetyCounts[2] },
            { label: "Inspection Due 30d", value: safetyCounts[3] }
          ]} />
        </ReportPanel>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ReportPanel title="Maintenance Due">
          <SimpleTable headers={["Case", "Cylinder", "SKU", "Location", "Status"]} rows={maintenanceCases.map((item) => [item.caseNumber, item.cylinder.serialNumber, item.cylinder.sku.name, item.cylinder.currentLocation.name, formatReportLabel(item.status)])} />
        </ReportPanel>
        <ReportPanel title="Damaged Cylinders">
          <SimpleTable headers={["Cylinder", "SKU", "Location", "Status", "Unsafe"]} rows={damagedCylinders.map((cylinder) => [cylinder.serialNumber, cylinder.sku.name, cylinder.currentLocation.name, formatReportLabel(cylinder.status), cylinder.unsafeStatus ? "Yes" : "No"])} />
        </ReportPanel>
      </section>

      <ReportPanel title="User Activity Logs">
        <SimpleTable headers={["Date", "User", "Role", "Action", "Details"]} rows={userActivity.map((log) => [log.createdAt.toISOString().slice(0, 16).replace("T", " "), log.user?.name ?? "System", log.user?.role.name ?? "", log.action, log.details])} />
      </ReportPanel>
    </div>
  );
}

function cylinderWhere(filters: ReportFilters) {
  return {
    ...(filters.skuId ? { skuId: filters.skuId } : {}),
    ...(filters.locationId ? { currentLocationId: filters.locationId } : {}),
    ...(cylinderStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {})
  };
}

const cylinderStatuses = ["FILLED", "EMPTY", "EMPTY_IN_TRANSIT", "FILLED_IN_TRANSIT", "FILLED_AT_WAREHOUSE", "DAMAGED", "IN_TRANSIT", "RESERVED", "UNDER_MAINTENANCE", "WITH_CUSTOMER"];
const deliveryStatuses = ["ASSIGNED", "LOADING_CONFIRMED", "CUSTOMER_ARRIVAL", "DELIVERED", "FAILED", "RETURNED", "EXCEPTION"];
const invoiceStatuses = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];
const reconciliationStatuses = ["DRAFT", "SUBMITTED", "APPROVED", "RETURNED"];
const maintenanceStatuses = ["OPEN", "INSPECTION_RECORDED", "QUARANTINED", "APPROVED_RETURN_TO_STOCK", "SCRAP_PLACEHOLDER", "CLOSED"];
const plantVarianceStatuses = ["OPEN", "RESOLVED"];

function cleanFilterParams(filters: ReportFilters): Record<string, string> {
  return Object.fromEntries(Object.entries(filters).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0));
}

function Filters({ filters, skus, locations, regions }: { filters: ReportFilters; skus: { id: string; name: string; code: string }[]; locations: { id: string; name: string; code: string }[]; regions: { id: string; name: string; code: string }[] }) {
  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <div className="grid gap-3 md:grid-cols-4">
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="dateFrom" type="date" defaultValue={filters.dateFrom ?? ""} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="dateTo" type="date" defaultValue={filters.dateTo ?? ""} />
        <Select name="regionId" value={filters.regionId ?? ""} label="All regions" options={regions} />
        <Select name="locationId" value={filters.locationId ?? ""} label="All locations" options={locations} />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="role" defaultValue={filters.role ?? ""}>
          <option value="">All roles</option>
          {["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "RSO", "MSO", "SERVICE_CENTRE_STAFF", "FINANCE_SAP_REVIEWER", "AUDITOR", "CUSTOMER"].map((role) => <option value={role} key={role}>{formatReportLabel(role)}</option>)}
        </select>
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="customerCategory" defaultValue={filters.customerCategory ?? ""}>
          <option value="">All customer categories</option>
          {["DOMESTIC", "COMMERCIAL", "INDUSTRIAL"].map((category) => <option value={category} key={category}>{formatReportLabel(category)}</option>)}
        </select>
        <Select name="skuId" value={filters.skuId ?? ""} label="All SKUs" options={skus} />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="status" defaultValue={filters.status ?? ""}>
          <option value="">All statuses</option>
          {["FILLED", "EMPTY", "EMPTY_IN_TRANSIT", "FILLED_IN_TRANSIT", "FILLED_AT_WAREHOUSE", "DAMAGED", "IN_TRANSIT", "RESERVED", "UNDER_MAINTENANCE", "WITH_CUSTOMER", "DELIVERED", "FAILED", "APPROVED", "SUBMITTED", "OPEN", "QUARANTINED"].map((status) => <option value={status} key={status}>{formatReportLabel(status)}</option>)}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Apply filters</button>
        <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/reports">Reset</Link>
      </div>
    </form>
  );
}

function Select({ name, value, label, options }: { name: string; value: string; label: string; options: { id: string; code: string; name: string }[] }) {
  return <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} defaultValue={value}><option value="">{label}</option>{options.map((option) => <option value={option.id} key={option.id}>{option.code} - {option.name}</option>)}</select>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value}</p></div>;
}

function ReportPanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel"><h2 className="text-base font-semibold text-slate-950">{title}</h2><div className="mt-4">{children}</div></section>;
}

function BarList({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <div className="space-y-3">{rows.length ? rows.map((row) => <div key={row.label}><div className="mb-1 flex justify-between text-sm"><span className="text-slate-600">{row.label}</span><span className="font-semibold text-slate-950">{row.value}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.max(6, (row.value / max) * 100)}%` }} /></div></div>) : <p className="text-sm text-slate-500">No records found.</p>}</div>;
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr>{headers.map((header) => <th className="px-3 py-2" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td className="px-3 py-2 text-slate-600" key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>) : <tr><td className="px-3 py-4 text-slate-500" colSpan={headers.length}>No records found.</td></tr>}</tbody></table></div>;
}
