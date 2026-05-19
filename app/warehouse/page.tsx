import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  Boxes,
  ClipboardList,
  Factory,
  Gauge,
  PackageCheck,
  ShieldAlert,
  Truck,
  Warehouse,
  Wrench
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { RoleQuickActions } from "@/components/role-quick-actions";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { formatCylinderStatus } from "@/lib/inventory";
import { formatMovementStatus, formatMovementType } from "@/lib/inventory-movements";
import { prisma } from "@/lib/prisma";

export default async function WarehousePage({
  searchParams
}: {
  searchParams?: {
    date?: string;
    warehouse?: string;
    assetType?: string;
    sku?: string;
    status?: string;
  };
}) {
  const filters = {
    date: searchParams?.date ?? "",
    warehouse: searchParams?.warehouse ?? "",
    assetType: searchParams?.assetType ?? "",
    sku: searchParams?.sku ?? "",
    status: searchParams?.status ?? ""
  };

  const [
    totalAssets,
    totalCylinders,
    inTransit,
    lowStockThreshold,
    maintenanceQueue,
    warehouses,
    skus,
    vehicles,
    activeDeliveries,
    pendingMovements,
    recentActivities,
    cylindersByStatus,
    cylindersBySku
  ] = await Promise.all([
    prisma.cylinder.count(),
    prisma.cylinder.count(),
    prisma.cylinder.count({ where: { status: "IN_TRANSIT" } }),
    prisma.masterDataRecord.findFirst({
      where: { type: "STOCK_THRESHOLD", isActive: true, threshold: { not: null } },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.maintenanceCase.count({ where: { status: { in: ["OPEN", "INSPECTION_RECORDED", "QUARANTINED"] } } }),
    prisma.masterDataRecord.findMany({
      where: { type: "WAREHOUSE", isActive: true },
      orderBy: { name: "asc" },
      take: 20
    }),
    prisma.masterDataRecord.findMany({
      where: { type: "SKU_MASTER", isActive: true },
      orderBy: { name: "asc" },
      take: 30
    }),
    prisma.masterDataRecord.findMany({
      where: { type: "VEHICLE", isActive: true },
      orderBy: { name: "asc" },
      take: 12
    }),
    prisma.delivery.count({ where: { status: { in: ["ASSIGNED", "LOADING_CONFIRMED", "CUSTOMER_ARRIVAL"] } } }),
    prisma.inventoryMovement.findMany({
      where: { status: { in: ["REQUESTED", "APPROVED", "DISPATCHED", "VARIANCE_LOGGED"] } },
      include: { sku: true, sourceLocation: true, destinationLocation: true },
      orderBy: { updatedAt: "desc" },
      take: 8
    }),
    prisma.inventoryMovementHistory.findMany({
      include: { changedBy: true, movement: { include: { sku: true } } },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.cylinder.groupBy({
      by: ["status"],
      _count: { _all: true },
      orderBy: { _count: { status: "desc" } }
    }),
    prisma.cylinder.groupBy({
      by: ["skuId"],
      _count: { _all: true },
      orderBy: { _count: { skuId: "desc" } },
      take: 8
    })
  ]);

  const threshold = lowStockThreshold?.threshold ?? 10;
  const lowStockItems = cylindersBySku.filter((line) => line._count._all <= threshold).length;
  const configuredCapacity = warehouses.reduce((sum, item) => sum + (item.threshold ?? 0), 0);
  const capacityBasis = configuredCapacity > 0 ? configuredCapacity : Math.max(totalCylinders + threshold, 1);
  const utilization = Math.min(100, Math.round((totalCylinders / capacityBasis) * 100));
  const activeWarehouse = filters.warehouse
    ? warehouses.find((warehouse) => warehouse.id === filters.warehouse)
    : warehouses[0];

  const zoneCards = [
    {
      title: "Zone A Incoming",
      description: "Plant, market and system-import receiving desk.",
      href: "/warehouse/incoming",
      icon: ArrowDownToLine,
      status: pendingMovements.filter((movement) => movement.type === "RECEIPT").length ? "Action needed" : "Ready",
      metric: pendingMovements.filter((movement) => movement.type === "RECEIPT").length,
      detail: "open receipt movement(s)"
    },
    {
      title: "Zone B Storage",
      description: "Filled, empty and reserved cylinder holding area.",
      href: "/inventory/stock-balances",
      icon: Boxes,
      status: utilization >= 85 ? "Capacity watch" : "Stable",
      metric: utilization,
      detail: "warehouse utilization"
    },
    {
      title: "Zone C Dispatch / Loading Bay",
      description: "Approved movements, delivery loading and outbound checks.",
      href: "/inventory/movements",
      icon: Truck,
      status: activeDeliveries ? "Active" : "Clear",
      metric: activeDeliveries,
      detail: "active delivery assignment(s)"
    },
    {
      title: "Zone D Maintenance",
      description: "Damaged, unsafe, quarantined and maintenance cases.",
      href: "/safety",
      icon: Wrench,
      status: maintenanceQueue ? "Review" : "Clear",
      metric: maintenanceQueue,
      detail: "open maintenance case(s)"
    }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Warehouse Management"
        title="Wells Gas Warehouse Overview"
        description="Live operational view for receiving, storage, loading, transfer control, safety holds and stock health."
        actions={
          <>
            <Link className="rounded-brand border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-brand-200" href="/warehouse/mobile">
              Mobile workspace
            </Link>
            <Link className="rounded-brand bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700" href="/warehouse/incoming">
              Open Zone A
            </Link>
          </>
        }
      />

      <form className="grid gap-3 rounded-brand border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-5">
        <FilterInput label="Date" name="date" type="date" value={filters.date} />
        <FilterSelect label="Warehouse" name="warehouse" value={filters.warehouse} options={warehouses.map((item) => ({ label: item.name, value: item.id }))} />
        <FilterSelect label="Asset type" name="assetType" value={filters.assetType} options={[{ label: "Cylinders", value: "cylinders" }, { label: "Vehicles", value: "vehicles" }]} />
        <FilterSelect label="SKU" name="sku" value={filters.sku} options={skus.map((item) => ({ label: item.name, value: item.id }))} />
        <FilterSelect
          label="Status"
          name="status"
          value={filters.status}
          options={cylindersByStatus.map((item) => ({ label: formatCylinderStatus(item.status), value: item.status }))}
        />
      </form>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={PackageCheck} label="Total Assets" value={totalAssets.toLocaleString()} detail="Tracked Wells Gas assets" tone="brand" />
        <MetricCard icon={Gauge} label="Warehouse Capacity" value={`${utilization}%`} detail={configuredCapacity ? "Configured from warehouse thresholds" : "Add warehouse thresholds for exact capacity"} tone={utilization >= 85 ? "warning" : "success"} />
        <MetricCard icon={Truck} label="Assets in Transit" value={inTransit.toLocaleString()} detail="Cylinders currently moving" tone="info" />
        <MetricCard icon={AlertTriangle} label="Low Stock Alerts" value={lowStockItems.toLocaleString()} detail={`Threshold: ${threshold} per SKU`} tone={lowStockItems ? "warning" : "success"} />
        <MetricCard icon={Wrench} label="Maintenance Queue" value={maintenanceQueue.toLocaleString()} detail="Open safety and repair cases" tone={maintenanceQueue ? "danger" : "success"} />
      </section>

      <RoleQuickActions role="WAREHOUSE_MANAGER" />

      <section className="grid gap-4 lg:grid-cols-4">
        {zoneCards.map((zone) => {
          const Icon = zone.icon;
          return (
            <article className="rounded-brand border border-slate-200 bg-white p-5 shadow-panel" key={zone.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-950">{zone.title}</p>
                  <p className="mt-2 text-sm leading-5 text-slate-500">{zone.description}</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-brand bg-brand-50 text-brand-700">
                  <Icon size={22} aria-hidden="true" />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold text-slate-950">{zone.metric}</p>
                  <p className="text-xs text-slate-500">{zone.detail}</p>
                </div>
                <StatusBadge tone={zone.status === "Clear" || zone.status === "Ready" || zone.status === "Stable" ? "success" : "warning"}>
                  {zone.status}
                </StatusBadge>
              </div>
              <Link className="mt-5 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-900" href={zone.href}>
                View Zone
              </Link>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Asset Distribution" description="Cylinder mix by current status.">
          <div className="space-y-3">
            {cylindersByStatus.length ? cylindersByStatus.map((item) => (
              <ProgressRow key={item.status} label={formatCylinderStatus(item.status)} value={item._count._all} total={totalCylinders} />
            )) : <EmptyState title="No asset data yet" description="Create opening balances or receipt movements to populate warehouse distribution." />}
          </div>
        </SectionCard>

        <SectionCard title="Recent Activities" description="Latest movement audit events.">
          <div className="space-y-3">
            {recentActivities.length ? recentActivities.map((activity) => (
              <div className="rounded-brand border border-slate-100 bg-slate-50 px-4 py-3 text-sm" key={activity.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900">{activity.action}</p>
                  <span className="text-xs text-slate-500">{activity.createdAt.toISOString().slice(0, 10)}</span>
                </div>
                <p className="mt-1 text-slate-600">{activity.movement.reference} - {activity.movement.sku.name}</p>
              </div>
            )) : <EmptyState title="No recent movement activity" description="Movement workflow actions will appear here." />}
          </div>
        </SectionCard>

        <SectionCard title="Stock Health" description="SKU quantities compared with the active stock threshold.">
          <div className="space-y-3">
            {cylindersBySku.length ? cylindersBySku.map((item) => {
              const sku = skus.find((record) => record.id === item.skuId);
              return (
                <div className="flex items-center justify-between gap-4 rounded-brand border border-slate-100 bg-slate-50 px-4 py-3 text-sm" key={item.skuId}>
                  <div>
                    <p className="font-semibold text-slate-900">{sku?.name ?? "SKU"}</p>
                    <p className="text-slate-500">{item._count._all} cylinder(s)</p>
                  </div>
                  <StatusBadge tone={item._count._all <= threshold ? "warning" : "success"}>
                    {item._count._all <= threshold ? "Low stock" : "Healthy"}
                  </StatusBadge>
                </div>
              );
            }) : <EmptyState title="No stock health data" description="SKU balances appear after receipt or opening balance activity." />}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Vehicle Status" description="Vehicles configured in master data.">
          <div className="space-y-3">
            {vehicles.length ? vehicles.map((vehicle) => (
              <div className="flex items-center justify-between gap-4 rounded-brand border border-slate-100 bg-slate-50 px-4 py-3 text-sm" key={vehicle.id}>
                <div>
                  <p className="font-semibold text-slate-900">{vehicle.name}</p>
                  <p className="text-slate-500">{vehicle.code}</p>
                </div>
                <StatusBadge tone="success">Available</StatusBadge>
              </div>
            )) : <EmptyState title="No vehicles configured" description="Add vehicles in master data to activate fleet status." />}
          </div>
        </SectionCard>

        <SectionCard title="Pending Tasks" description="Open approvals, dispatches and variance reviews.">
          <div className="space-y-3">
            {pendingMovements.length ? pendingMovements.map((movement) => (
              <Link className="block rounded-brand border border-slate-100 bg-slate-50 px-4 py-3 text-sm hover:border-brand-200" href={`/inventory/movements/${movement.id}`} key={movement.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900">{movement.reference}</p>
                  <StatusBadge tone={movement.status === "VARIANCE_LOGGED" ? "warning" : "info"}>{formatMovementStatus(movement.status)}</StatusBadge>
                </div>
                <p className="mt-1 text-slate-500">
                  {formatMovementType(movement.type)} - {movement.sku.name}
                </p>
              </Link>
            )) : <EmptyState title="No pending warehouse tasks" description="Requested and dispatched movements will appear here." />}
          </div>
        </SectionCard>

        <SectionCard title="Alerts" description={`Warehouse context: ${activeWarehouse?.name ?? "All warehouses"}.`}>
          <div className="space-y-3">
            <AlertRow icon={ShieldAlert} label="Safety holds" value={maintenanceQueue} tone={maintenanceQueue ? "danger" : "success"} />
            <AlertRow icon={AlertTriangle} label="Low stock SKUs" value={lowStockItems} tone={lowStockItems ? "warning" : "success"} />
            <AlertRow icon={ClipboardList} label="Open movements" value={pendingMovements.length} tone={pendingMovements.length ? "info" : "success"} />
            <AlertRow icon={Factory} label="Inbound receipt queue" value={zoneCards[0].metric} tone={zoneCards[0].metric ? "warning" : "success"} />
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

function FilterInput({ label, name, type, value }: { label: string; name: string; type: string; value: string }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" defaultValue={value} name={name} type={type} />
    </label>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" defaultValue={value} name={name}>
        <option value="">All</option>
        {options.map((option) => (
          <option value={option.value} key={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function ProgressRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-slate-500">{value.toLocaleString()}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-brand-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function AlertRow({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  tone: "success" | "warning" | "danger" | "info";
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-brand border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
      <div className="flex items-center gap-3">
        <Icon className="text-brand-700" size={18} aria-hidden="true" />
        <span className="font-semibold text-slate-800">{label}</span>
      </div>
      <StatusBadge tone={tone}>{value.toLocaleString()}</StatusBadge>
    </div>
  );
}
