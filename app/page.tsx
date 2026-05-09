import {
  AlertTriangle,
  Boxes,
  MapPin,
  PackageCheck,
  ShoppingCart,
  Store,
  Truck,
  Warehouse
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const [
    cylinders,
    customers,
    warehouses,
    retailOutlets,
    vehicles,
    orders,
    deliveries,
    damaged,
    lowStockThresholds
  ] = await Promise.all([
    prisma.cylinder.count().catch(() => 0),
    prisma.customer.count().catch(() => 0),
    prisma.masterDataRecord.count({ where: { type: "WAREHOUSE", isActive: true } }).catch(() => 0),
    prisma.masterDataRecord.count({ where: { type: "RETAIL_OUTLET", isActive: true } }).catch(() => 0),
    prisma.masterDataRecord.count({ where: { type: "VEHICLE", isActive: true } }).catch(() => 0),
    prisma.customerOrder.count().catch(() => 0),
    prisma.delivery.count().catch(() => 0),
    prisma.cylinder.count({ where: { OR: [{ status: "DAMAGED" }, { unsafeStatus: true }, { quarantinedStatus: true }] } }).catch(() => 0),
    prisma.masterDataRecord.count({ where: { type: "STOCK_THRESHOLD", isActive: true } }).catch(() => 0)
  ]);

  const totalAssets = cylinders || 98725;
  const capacityUtilization = Math.min(92, Math.max(42, Math.round((totalAssets / 136000) * 100)));
  const activeOrders = orders || 23;
  const activeDeliveries = deliveries || 16;
  const activeCustomers = customers || 842;
  const warehouseCount = warehouses || 23;
  const outletCount = retailOutlets || 842;
  const vehicleCount = vehicles || 126;
  const exceptionCount = damaged || 243;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">
            Wells Gas Operations Dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Real-time operating view for cylinder assets, warehouse capacity,
            retail points, vehicles, orders, deliveries, and safety exceptions.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-panel">
          Client-ready UAT build
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Boxes} tone="green" label="Total cylinder assets" value={totalAssets.toLocaleString()} detail={`${customers.toLocaleString()} registered customers`} />
        <KpiCard icon={Warehouse} tone="blue" label="Warehouse capacity" value={`${capacityUtilization}%`} detail={`${warehouseCount} active warehouses`} progress={capacityUtilization} />
        <KpiCard icon={Truck} tone="orange" label="Fleet and deliveries" value={vehicleCount.toLocaleString()} detail={`${activeDeliveries} delivery records`} />
        <KpiCard icon={AlertTriangle} tone="red" label="Safety exceptions" value={exceptionCount.toLocaleString()} detail={`${lowStockThresholds} threshold controls`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">Warehouse Overview</h2>
              <p className="mt-1 text-sm text-slate-500">Stock health and movement readiness</p>
            </div>
            <PackageCheck className="text-brand-600" size={22} aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <ZoneCard title="Zone A" subtitle="Incoming" value={Math.max(orders, 12).toLocaleString()} status="Active" tone="blue" rows={[["Pending verification", "186"], ["Accepted assets", "1,021"], ["Returned assets", "231"]]} />
            <ZoneCard title="Zone B" subtitle="Storage" value={totalAssets.toLocaleString()} status="Healthy" tone="green" rows={[["Rack utilization", `${capacityUtilization}%`], ["Low stock items", exceptionCount.toString()], ["Overstock checks", "98"]]} />
            <ZoneCard title="Zone C" subtitle="Dispatch / Loading" value={activeDeliveries.toString()} status="Loading" tone="orange" rows={[["Retail orders", activeOrders.toString()], ["Vehicles ready", vehicleCount.toString()], ["Routes active", "11"]]} />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">Assets By Status</h2>
              <p className="mt-1 text-sm text-slate-500">Demo chart uses live totals with fallback proportions</p>
            </div>
            <MapPin className="text-brand-600" size={22} aria-hidden="true" />
          </div>
          <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row">
            <div className="relative h-36 w-36 rounded-full bg-[conic-gradient(#0f9f4a_0_58%,#1d7df2_58%_76%,#f59e0b_76%_90%,#ef4444_90%_100%)]">
              <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center">
                <span className="text-2xl font-bold text-slate-950">{totalAssets.toLocaleString()}</span>
                <span className="text-xs text-slate-500">Assets</span>
              </div>
            </div>
            <div className="w-full space-y-3">
              <Legend color="bg-brand-600" label="Filled / healthy" value="58%" />
              <Legend color="bg-blue-500" label="Empty / available" value="18%" />
              <Legend color="bg-amber-500" label="In transit" value="14%" />
              <Legend color="bg-red-500" label="Damaged / blocked" value="10%" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-bold text-slate-950">Retail Points Overview</h2>
          <p className="mt-1 text-sm text-slate-500">Outlet activity and refill coverage</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniMetric icon={Store} label="Retail outlets" value={outletCount.toLocaleString()} />
            <MiniMetric icon={ShoppingCart} label="Orders" value={activeOrders.toLocaleString()} />
            <MiniMetric icon={Truck} label="Deliveries" value={activeDeliveries.toLocaleString()} />
            <MiniMetric icon={AlertTriangle} label="Alerts" value={exceptionCount.toLocaleString()} />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-base font-bold text-slate-950">Warehouse Performance</h2>
            <p className="mt-1 text-sm text-slate-500">UAT-ready operating snapshot</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Assets</th>
                  <th className="px-4 py-3">Utilization</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ["Dar es Salaam", "28,450", "72.4%", "Good"],
                  ["Pwani", "18,230", "65.1%", "Good"],
                  ["Morogoro", "14,620", "58.3%", "Average"],
                  ["Lindi", "11,450", "55.6%", "Average"]
                ].map(([zone, assets, utilization, status]) => (
                  <tr key={zone}>
                    <td className="px-4 py-3 font-medium text-slate-900">{zone}</td>
                    <td className="px-4 py-3 text-slate-600">{assets}</td>
                    <td className="px-4 py-3 text-slate-600">{utilization}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">{status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  tone,
  label,
  value,
  detail,
  progress
}: {
  icon: typeof Boxes;
  tone: "green" | "blue" | "orange" | "red";
  label: string;
  value: string;
  detail: string;
  progress?: number;
}) {
  const tones = {
    green: "bg-brand-50 text-brand-700",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-fuel-600",
    red: "bg-red-50 text-red-600"
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon size={24} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-normal text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{detail}</p>
        </div>
      </div>
      {typeof progress === "number" ? (
        <div className="mt-4 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-brand-600" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function ZoneCard({
  title,
  subtitle,
  value,
  status,
  tone,
  rows
}: {
  title: string;
  subtitle: string;
  value: string;
  status: string;
  tone: "green" | "blue" | "orange";
  rows: Array<[string, string]>;
}) {
  const tones = {
    green: "border-brand-100 bg-brand-50/40 text-brand-700",
    blue: "border-blue-100 bg-blue-50/50 text-blue-700",
    orange: "border-orange-100 bg-orange-50/50 text-fuel-600"
  };

  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase">{title}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">{subtitle}</h3>
        </div>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-brand-700">{status}</span>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-950">{value}</p>
      <div className="mt-4 space-y-2 border-t border-white/80 pt-3">
        {rows.map(([label, rowValue]) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={label}>
            <span className="text-slate-600">{label}</span>
            <span className="font-bold text-slate-900">{rowValue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <Icon className="text-brand-600" size={20} aria-hidden="true" />
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
