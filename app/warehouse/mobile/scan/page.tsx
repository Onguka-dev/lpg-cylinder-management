import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { WarehouseMobileScan } from "@/components/warehouse-mobile-scan";
import { getCurrentSession } from "@/lib/auth";
import { formatCylinderStatus } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function WarehouseMobileScanPage() {
  const session = await getCurrentSession();
  if (!session || !["ADMIN", "WAREHOUSE_MANAGER"].includes(session.user.role)) redirect("/unauthorized");

  const assets = await prisma.cylinder.findMany({
    include: { sku: true, currentLocation: true },
    orderBy: { updatedAt: "desc" },
    take: 250
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <Link className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white" href="/warehouse/mobile">
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-950">Scan & Verify</h1>
      </div>
      <WarehouseMobileScan
        assets={assets.map((asset) => ({
          serialNumber: asset.serialNumber,
          barcode: asset.barcode,
          skuName: asset.sku.name,
          status: formatCylinderStatus(asset.status),
          locationName: asset.currentLocation.name
        }))}
      />
    </div>
  );
}
