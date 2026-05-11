import { redirect } from "next/navigation";
import { Boxes, PackageCheck, PackageOpen } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { getAssignedMasterLocationId } from "@/lib/inventory-movement-access";
import { prisma } from "@/lib/prisma";

export default async function RetailInventoryPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?next=/retail-inventory");
  }

  const assignedLocationId =
    session.user.role === "RSO" || session.user.role === "MSO"
      ? await getAssignedMasterLocationId(session.user.id).catch(() => null)
      : null;
  const [location, skus, stock, thresholdRecord] = await Promise.all([
    assignedLocationId ? prisma.masterDataRecord.findUnique({ where: { id: assignedLocationId } }).catch(() => null) : null,
    prisma.masterDataRecord.findMany({ where: { type: "SKU_MASTER", isActive: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.cylinder.groupBy({
      by: ["skuId", "status"],
      where: assignedLocationId ? { currentLocationId: assignedLocationId } : undefined,
      _count: { id: true }
    }).catch(() => []),
    prisma.masterDataRecord.findFirst({
      where: { type: "STOCK_THRESHOLD", isActive: true, threshold: { not: null } },
      orderBy: { updatedAt: "desc" }
    }).catch(() => null)
  ]);
  const threshold = thresholdRecord?.threshold ?? 5;
  const filledTotal = stock.filter((row) => row.status === "FILLED").reduce((sum, row) => sum + row._count.id, 0);
  const emptyTotal = stock.filter((row) => row.status === "EMPTY").reduce((sum, row) => sum + row._count.id, 0);
  const lowStockItems = skus.filter((sku) => (stock.find((row) => row.skuId === sku.id && row.status === "FILLED")?._count.id ?? 0) <= threshold).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24 sm:pb-0">
      <PageHeader
        eyebrow="Retail Point Sales"
        title="Retail Inventory"
        description={`Stock visibility for ${location?.name ?? "the selected retail point"}. Filled and empty stock stay driven by cylinder status/location records.`}
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={PackageCheck} label="Filled Stock" value={filledTotal.toLocaleString()} detail="Available for refill sales" tone={filledTotal <= threshold ? "warning" : "success"} />
        <MetricCard icon={PackageOpen} label="Empty Stock" value={emptyTotal.toLocaleString()} detail="Returned from customer exchanges" tone="info" />
        <MetricCard icon={Boxes} label="Low Stock Items" value={lowStockItems.toLocaleString()} detail={`Threshold: ${threshold}`} tone={lowStockItems ? "warning" : "success"} />
      </section>

      <SectionCard title="Stock by item" description="Mobile-friendly stock cards for counter checks.">
        <div className="grid gap-3 sm:grid-cols-2">
          {skus.map((sku) => {
            const filled = stock.find((row) => row.skuId === sku.id && row.status === "FILLED")?._count.id ?? 0;
            const empty = stock.find((row) => row.skuId === sku.id && row.status === "EMPTY")?._count.id ?? 0;
            return (
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={sku.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{sku.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{sku.code}</p>
                  </div>
                  <StatusBadge tone={filled <= threshold ? "warning" : "success"}>{filled <= threshold ? "Low" : "Healthy"}</StatusBadge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs font-semibold text-slate-500">Filled</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{filled}</p>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs font-semibold text-slate-500">Empty</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{empty}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
