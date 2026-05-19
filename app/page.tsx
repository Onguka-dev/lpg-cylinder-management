import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CalendarDays,
  CircleDot,
  Gauge,
  MapPin,
  PackageCheck,
  Search,
  ShoppingCart,
  Store,
  Truck,
  Warehouse,
  Wrench
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { ClientReadyEmptyStates, FeaturePlaceholderPanel, RecentActivityFeed, TaskAlertPanel } from "@/components/operations-insight-panels";
import { PageHeader } from "@/components/page-header";
import { RoleQuickActions } from "@/components/role-quick-actions";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { TrendChip } from "@/components/trend-chip";
import { getCurrentSession } from "@/lib/auth";
import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_LOCALE } from "@/lib/currency";
import { getOperationsActivityFeed, getOperationsTaskAlerts } from "@/lib/operations-experience";
import { roleLabel } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const ENABLE_METER_PLACEHOLDER = false;

type DashboardSearchParams = {
  dateRange?: string;
  region?: string;
  warehouse?: string;
  retailPoint?: string;
  sku?: string;
};

export default async function HomePage({
  searchParams
}: {
  searchParams?: DashboardSearchParams;
}) {
  const session = await getCurrentSession();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalCylinders,
    cylinderStatusGroups,
    cylinderLocationGroups,
    totalCustomers,
    warehouses,
    retailOutlets,
    vehicles,
    regions,
    skus,
    lowStockThresholds,
    maintenanceQueue,
    inTransitCylinders,
    damagedOrBlocked,
    movementTypeGroups,
    refillSalesByLocation,
    fieldSalesByVehicle,
    taskAlerts,
    recentActivity
  ] = await Promise.all([
    prisma.cylinder.count().catch(() => 0),
    prisma.cylinder.groupBy({ by: ["status"], _count: { id: true } }).catch(() => []),
    prisma.cylinder.groupBy({ by: ["currentLocationId"], _count: { id: true } }).catch(() => []),
    prisma.customer.count().catch(() => 0),
    prisma.masterDataRecord.findMany({ where: { type: "WAREHOUSE", isActive: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.masterDataRecord.findMany({ where: { type: "RETAIL_OUTLET", isActive: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.masterDataRecord.findMany({ where: { type: "VEHICLE", isActive: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.masterDataRecord.findMany({ where: { type: "REGION", isActive: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.masterDataRecord.findMany({ where: { type: "SKU_MASTER", isActive: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.masterDataRecord.count({ where: { type: "STOCK_THRESHOLD", isActive: true } }).catch(() => 0),
    prisma.maintenanceCase.count({ where: { status: { in: ["OPEN", "INSPECTION_RECORDED", "QUARANTINED"] } } }).catch(() => 0),
    prisma.cylinder.count({ where: { status: "IN_TRANSIT" } }).catch(() => 0),
    prisma.cylinder.count({ where: { OR: [{ status: "DAMAGED" }, { unsafeStatus: true }, { quarantinedStatus: true }] } }).catch(() => 0),
    prisma.inventoryMovement.groupBy({
      by: ["type"],
      where: { createdAt: { gte: startOfMonth } },
      _sum: { requestedQuantity: true }
    }).catch(() => []),
    prisma.refillOrder.groupBy({
      by: ["locationId"],
      where: { status: "CLOSED", createdAt: { gte: startOfMonth } },
      _count: { id: true },
      _sum: { totalAmount: true }
    }).catch(() => []),
    prisma.fieldSale.groupBy({
      by: ["vehicleId", "status"],
      _count: { id: true }
    }).catch(() => []),
    getOperationsTaskAlerts(),
    getOperationsActivityFeed(8)
  ]);

  const totalAssets = totalCylinders;
  const capacityBase = Math.max(totalCylinders, warehouses.length * 100);
  const warehouseUtilization = capacityBase ? Math.round((totalCylinders / capacityBase) * 100) : 0;
  const inboundThisMonth = sumMovementTypes(movementTypeGroups, [
    "OPENING_BALANCE",
    "RECEIPT",
    "RETURN_FROM_CUSTOMER",
    "RETURN_FROM_VEHICLE"
  ]);
  const outboundThisMonth = sumMovementTypes(movementTypeGroups, [
    "ISSUE",
    "TRANSFER",
    "DAMAGED_QUARANTINE",
    "MAINTENANCE_TRANSFER"
  ]);
  const locationNameById = new Map(
    [...warehouses, ...retailOutlets, ...vehicles, ...regions].map((item) => [item.id, item.name])
  );
  const topLocationsByAssets = cylinderLocationGroups
    .map((group) => ({
      label: locationNameById.get(group.currentLocationId) ?? "Unassigned location",
      value: group._count.id
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const statusRows = cylinderStatusGroups
    .map((group) => ({ label: formatLabel(group.status), value: group._count.id }))
    .sort((a, b) => b.value - a.value);
  const topRetailPoints = refillSalesByLocation
    .map((sale) => ({
      label: locationNameById.get(sale.locationId) ?? "Retail point",
      count: sale._count.id,
      amount: Number(sale._sum.totalAmount ?? 0)
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const vehicleRows = fieldSalesByVehicle
    .map((item) => ({
      label: locationNameById.get(item.vehicleId) ?? "Vehicle",
      status: formatLabel(item.status),
      value: item._count.id
    }))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Wells Gas operations view"
        description={`${roleLabel(session?.user.role ?? "ADMIN")} context for cylinder assets, warehouses, retail points, vehicles, movements, and safety signals.`}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge tone="brand">Executive view</StatusBadge>
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 shadow-panel">
              <CalendarDays size={15} aria-hidden="true" />
              {new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date())}
            </span>
          </div>
        }
      />

      <RoleQuickActions role={session?.user.role ?? "ADMIN"} />

      <DashboardFilters
        searchParams={searchParams}
        regions={regions}
        warehouses={warehouses}
        retailOutlets={retailOutlets}
        skus={skus}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Boxes} label="Total Assets" value={formatNumber(totalAssets)} detail="Tracked LPG assets" tone="brand" />
        <MetricCard icon={PackageCheck} label="Total Cylinders" value={formatNumber(totalCylinders)} detail={`${formatNumber(totalCustomers)} registered customers`} tone="success" />
        {ENABLE_METER_PLACEHOLDER ? (
          <MetricCard icon={Gauge} label="Total Meters" value="0" detail="Feature flag placeholder" tone="neutral" />
        ) : null}
        <MetricCard icon={Store} label="Retail Points" value={formatNumber(retailOutlets.length)} detail="Active outlets" tone="info" />
        <MetricCard icon={Warehouse} label="Warehouses" value={formatNumber(warehouses.length)} detail="Active warehouses" tone="brand" />
        <MetricCard icon={Truck} label="Vehicles" value={formatNumber(vehicles.length)} detail="Active fleet records" tone="info" />
        <MetricCard icon={Gauge} label="Warehouse Utilization" value={`${warehouseUtilization}%`} detail="Based on tracked cylinder capacity" tone="success" />
        <MetricCard icon={AlertTriangle} label="Low Stock Items" value={formatNumber(lowStockThresholds)} detail="Configured threshold controls" tone={lowStockThresholds ? "warning" : "neutral"} />
        <MetricCard icon={ArrowUpFromLine} label="Assets In Transit" value={formatNumber(inTransitCylinders)} detail="Cylinder status: in transit" tone={inTransitCylinders ? "warning" : "neutral"} />
        <MetricCard icon={Wrench} label="Maintenance Queue" value={formatNumber(maintenanceQueue)} detail={`${formatNumber(damagedOrBlocked)} blocked or damaged`} tone={maintenanceQueue || damagedOrBlocked ? "danger" : "neutral"} />
      </section>

      <TaskAlertPanel alerts={taskAlerts} />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Assets Overview By Type" description="Uses live cylinder records; meter assets are hidden until that module is enabled.">
          <div className="space-y-4">
            <ProgressRow label="Cylinders" value={totalCylinders} total={Math.max(totalAssets, 1)} tone="bg-brand-600" />
            {ENABLE_METER_PLACEHOLDER ? <ProgressRow label="Meters" value={0} total={Math.max(totalAssets, 1)} tone="bg-info-600" /> : null}
            {totalAssets === 0 ? (
              <EmptyState title="No assets found" description="Create cylinders or opening balances to populate the asset overview." />
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Assets By Zone / Region" description="Grouped by current location where cylinders are assigned.">
          {topLocationsByAssets.length ? (
            <RankedBars rows={topLocationsByAssets} />
          ) : (
            <EmptyState icon={MapPin} title="No location asset data yet" description="Assign cylinders to warehouses, vehicles, or outlets to populate this widget." />
          )}
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Vehicles By Type / Status" description="Vehicle sales activity and field status signal.">
          {vehicleRows.length ? (
            <div className="space-y-3">
              {vehicleRows.map((row) => (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3" key={`${row.label}-${row.status}`}>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                    <p className="text-xs text-slate-500">{row.value} recorded field sale(s)</p>
                  </div>
                  <StatusBadge tone="success">{row.status}</StatusBadge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Truck} title="No vehicle activity yet" description="Field sales from vehicle stock will populate this widget." />
          )}
        </SectionCard>

        <SectionCard title="Inbound vs Outbound This Month" description="Based on inventory movement request quantities.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <MovementTile icon={ArrowDownToLine} label="Inbound" value={inboundThisMonth} tone="success" />
            <MovementTile icon={ArrowUpFromLine} label="Outbound" value={outboundThisMonth} tone="warning" />
          </div>
          {!inboundThisMonth && !outboundThisMonth ? (
            <EmptyState className="mt-4" title="No movement activity this month" description="Receipts, issues, transfers, returns, and adjustments will appear here." />
          ) : null}
        </SectionCard>

        <SectionCard title="Low Stock Status" description="Configured threshold controls and current exception posture.">
          <div className="space-y-3">
            <ReviewMetric label="Threshold controls" value={lowStockThresholds} tone={lowStockThresholds ? "warning" : "neutral"} />
            <ReviewMetric label="Damaged / blocked" value={damagedOrBlocked} tone={damagedOrBlocked ? "danger" : "success"} />
            <ReviewMetric label="Maintenance queue" value={maintenanceQueue} tone={maintenanceQueue ? "warning" : "success"} />
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Retail Point Overview" description="Outlet readiness by master data state.">
          <div className="grid grid-cols-3 gap-3">
            <MiniMetric label="Active" value={retailOutlets.length} tone="success" />
            <MiniMetric label="Inactive" value={0} tone="neutral" />
            <MiniMetric label="Pending" value={0} tone="info" />
          </div>
        </SectionCard>

        <SectionCard title="Top Retail Points By Sales" description="Closed refill transactions this month.">
          {topRetailPoints.length ? (
            <div className="space-y-3">
              {topRetailPoints.map((point) => (
                <div className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center" key={point.label}>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{point.label}</p>
                    <p className="text-xs text-slate-500">{point.count} refill transaction(s)</p>
                  </div>
                  <TrendChip value={formatCurrency(point.amount)} direction="up" label="sales" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={ShoppingCart} title="No retail sales this month" description="Closed retail refill transactions will populate top outlet rankings." />
          )}
        </SectionCard>
      </section>

      <SectionCard title="Warehouse Performance By Zone" description="Current warehouse records with assigned cylinder counts.">
        {warehouses.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Warehouse / Zone</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Assets</th>
                  <th className="px-4 py-3">Utilization</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warehouses.map((warehouse) => {
                  const assets = cylinderLocationGroups.find((group) => group.currentLocationId === warehouse.id)?._count.id ?? 0;
                  const utilization = Math.min(100, Math.round((assets / Math.max(assets, 100)) * 100));

                  return (
                    <tr key={warehouse.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{warehouse.name}</td>
                      <td className="px-4 py-3 text-slate-600">{warehouse.code}</td>
                      <td className="px-4 py-3 text-slate-600">{formatNumber(assets)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-brand-600" style={{ width: `${utilization}%` }} />
                          </div>
                          <span>{utilization}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge tone="success">Active</StatusBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Warehouse} title="No warehouse records configured" description="Add warehouse master data to populate performance rows." />
        )}
      </SectionCard>

      <SectionCard title="Cylinder Status Mix" description="Live distribution by cylinder status.">
        {statusRows.length ? <RankedBars rows={statusRows} /> : <EmptyState icon={CircleDot} title="No cylinder status records yet" />}
      </SectionCard>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <RecentActivityFeed activities={recentActivity} />
        <div className="space-y-4">
          <ClientReadyEmptyStates />
          <FeaturePlaceholderPanel />
        </div>
      </section>
    </div>
  );
}

function DashboardFilters({
  searchParams,
  regions,
  warehouses,
  retailOutlets,
  skus
}: {
  searchParams?: DashboardSearchParams;
  regions: Array<{ id: string; name: string }>;
  warehouses: Array<{ id: string; name: string }>;
  retailOutlets: Array<{ id: string; name: string }>;
  skus: Array<{ id: string; name: string }>;
}) {
  return (
    <SectionCard>
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <FilterSelect name="dateRange" label="Date range" value={searchParams?.dateRange} options={[
          ["this-month", "This month"],
          ["last-30-days", "Last 30 days"],
          ["quarter", "This quarter"]
        ]} />
        <FilterSelect name="region" label="Region" value={searchParams?.region} options={regions.map((item) => [item.id, item.name])} />
        <FilterSelect name="warehouse" label="Warehouse" value={searchParams?.warehouse} options={warehouses.map((item) => [item.id, item.name])} />
        <FilterSelect name="retailPoint" label="Retail point" value={searchParams?.retailPoint} options={retailOutlets.map((item) => [item.id, item.name])} />
        <FilterSelect name="sku" label="SKU" value={searchParams?.sku} options={skus.map((item) => [item.id, item.name])} />
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-panel hover:bg-brand-700" type="submit">
          <Search size={16} aria-hidden="true" />
          Apply
        </button>
      </form>
    </SectionCard>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100" name={name} defaultValue={value ?? ""}>
        <option value="">All</option>
        {options.map(([optionValue, optionLabel]) => (
          <option value={optionValue} key={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function RankedBars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700">{row.label}</span>
            <span className="font-semibold text-slate-950">{formatNumber(row.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const percent = Math.round((value / total) * 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-slate-500">{formatNumber(value)} / {formatNumber(total)}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100">
        <div className={`h-3 rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function MovementTile({ icon: Icon, label, value, tone }: { icon: typeof ArrowDownToLine; label: string; value: number; tone: "success" | "warning" }) {
  return (
    <div className="rounded-brand border border-slate-100 bg-slate-50 p-4">
      <Icon className={tone === "success" ? "text-success-700" : "text-warning-700"} size={22} aria-hidden="true" />
      <p className="mt-3 text-2xl font-bold text-slate-950">{formatNumber(value)}</p>
      <p className="mt-1 text-sm font-semibold text-slate-600">{label}</p>
    </div>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: number; tone: "success" | "neutral" | "info" }) {
  return (
    <div className="rounded-brand border border-slate-100 bg-slate-50 p-4 text-center">
      <p className="text-2xl font-bold text-slate-950">{formatNumber(value)}</p>
      <div className="mt-2"><StatusBadge tone={tone}>{label}</StatusBadge></div>
    </div>
  );
}

function ReviewMetric({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "danger" | "neutral" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <StatusBadge tone={tone}>{formatNumber(value)}</StatusBadge>
    </div>
  );
}

function sumMovementTypes(
  rows: Array<{ type: string; _sum: { requestedQuantity: number | null } }>,
  types: string[]
) {
  return rows
    .filter((row) => types.includes(row.type))
    .reduce((total, row) => total + Number(row._sum.requestedQuantity ?? 0), 0);
}

function formatLabel(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-KE").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(DEFAULT_CURRENCY_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(value);
}
