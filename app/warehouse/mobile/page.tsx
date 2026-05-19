import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, Barcode, BarChart3, ClipboardCheck, PackageX, ReceiptText, RefreshCw, Search, Truck, Warehouse } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { formatMovementStatus, formatMovementType } from "@/lib/inventory-movements";
import { prisma } from "@/lib/prisma";

export default async function WarehouseMobileHomePage() {
  const session = await getCurrentSession();
  if (!session || !["ADMIN", "WAREHOUSE_MANAGER"].includes(session.user.role)) redirect("/unauthorized");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [warehouse, receivedToday, pendingVerification, trucksLoading, assetsRejected, incoming, offlineQueue] = await Promise.all([
    prisma.masterDataRecord.findFirst({ where: { type: "WAREHOUSE", isActive: true }, orderBy: { name: "asc" } }),
    prisma.inventoryMovement.aggregate({
      where: { type: "RECEIPT", createdAt: { gte: today } },
      _sum: { requestedQuantity: true }
    }),
    prisma.inventoryMovement.count({ where: { type: "RECEIPT", status: { in: ["REQUESTED", "APPROVED", "DISPATCHED", "VARIANCE_LOGGED"] } } }),
    prisma.delivery.count({ where: { status: { in: ["ASSIGNED", "LOADING_CONFIRMED"] } } }),
    prisma.cylinder.count({ where: { status: { in: ["DAMAGED", "UNDER_MAINTENANCE"] } } }),
    prisma.inventoryMovement.findMany({
      where: { type: "RECEIPT" },
      include: { sku: true, sourceLocation: true, destinationLocation: true },
      orderBy: { updatedAt: "desc" },
      take: 8
    }),
    prisma.offlineSyncItem.count({ where: { status: { in: ["QUEUED", "FAILED", "CONFLICT"] } } })
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      <section className="rounded-[1.75rem] bg-brand-700 p-5 text-white shadow-brand">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-100">Warehouse operations workspace</p>
            <h1 className="mt-2 text-2xl font-bold">Warehouse Mobile</h1>
            <p className="mt-2 text-sm text-brand-100">{warehouse?.name ?? "Assigned warehouse"} · Online · {offlineQueue} pending sync</p>
          </div>
          <Warehouse size={34} aria-hidden="true" />
        </div>
      </section>

      <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-panel">
        <Search className="text-slate-400" size={18} aria-hidden="true" />
        <input className="w-full bg-transparent text-sm outline-none" placeholder="Search GRN, truck, supplier or serial" type="search" />
      </label>

      <section className="grid gap-3 sm:grid-cols-2">
        <MetricCard icon={ArrowDownToLine} label="Cylinders Received" value={String(receivedToday._sum.requestedQuantity ?? 0)} detail="Today" tone="brand" />
        <MetricCard icon={ClipboardCheck} label="Pending Verification" value={String(pendingVerification)} detail="Open receipt batches" tone={pendingVerification ? "warning" : "success"} />
        <MetricCard icon={Truck} label="Trucks Loading" value={String(trucksLoading)} detail="Dispatch/loading bay" tone="info" />
        <MetricCard icon={PackageX} label="Assets Rejected" value={String(assetsRejected)} detail="Damaged or maintenance status" tone={assetsRejected ? "danger" : "success"} />
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MobileAction href="/warehouse/mobile/incoming" icon={ArrowDownToLine} label="Receive Cylinders" />
        <MobileAction href="/inventory/selling-point-dispatches/new" icon={ArrowUpFromLine} label="Dispatch Cylinders" />
        <MobileAction href="/warehouse/mobile/scan" icon={Barcode} label="Scan Batch" />
        <MobileAction href="/retail-sales/pos" icon={ReceiptText} label="Scan Sale" />
        <MobileAction href="/retail-sales/empty-returns/new" icon={RefreshCw} label="Log Empty Return" />
        <MobileAction href="/retail-sales/empty-returns/new?mode=no-code" icon={PackageX} label="Non-Coded Return" />
        <MobileAction href="/reconciliations/new" icon={ClipboardCheck} label="Stock Count" />
        <MobileAction href="/reports" icon={BarChart3} label="Reports" />
      </section>

      <SectionCard title="Return / incoming list" description="Receipt movements remain the source of truth.">
        <div className="space-y-3">
          {incoming.length ? incoming.map((movement) => (
            <Link className="block rounded-2xl border border-slate-200 bg-slate-50 p-4" href={`/inventory/movements/${movement.id}`} key={movement.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-950">{movement.reference}</p>
                  <p className="mt-1 text-sm text-slate-500">{formatMovementType(movement.type)} · {movement.sku.name}</p>
                </div>
                <StatusBadge tone={movement.status === "COMPLETED" ? "success" : "warning"}>{formatMovementStatus(movement.status)}</StatusBadge>
              </div>
              <p className="mt-3 text-sm text-slate-500">Assets: {movement.requestedQuantity} · Received {movement.updatedAt.toISOString().slice(11, 16)}</p>
            </Link>
          )) : <EmptyState title="No incoming movements" description="Receipt batches will appear here when cylinders are ready for warehouse action." />}
        </div>
      </SectionCard>
    </div>
  );
}

function MobileAction({ href, icon: Icon, label }: { href: string; icon: typeof Warehouse; label: string }) {
  return (
    <Link aria-label={label} className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-panel outline-none ring-brand-200 focus:ring-2" href={href}>
      <Icon className="mx-auto text-brand-700" size={20} aria-hidden="true" />
      <p className="mt-2 text-xs font-bold text-slate-700">{label}</p>
    </Link>
  );
}
