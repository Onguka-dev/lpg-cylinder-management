import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { IncomingAssetForm } from "@/components/incoming-asset-form";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { locationMasterTypes } from "@/lib/inventory";
import { canRequestInventoryMovements } from "@/lib/inventory-movements";
import { prisma } from "@/lib/prisma";

export default async function WarehouseIncomingPage() {
  const session = await getCurrentSession();

  if (!session || !canRequestInventoryMovements(session.user.role)) {
    redirect("/unauthorized");
  }

  const [skus, locations, defaultWarehouse] = await Promise.all([
    prisma.masterDataRecord.findMany({
      where: { type: "SKU_MASTER", isActive: true },
      orderBy: { name: "asc" }
    }),
    prisma.masterDataRecord.findMany({
      where: { type: { in: [...locationMasterTypes] }, isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    }),
    prisma.masterDataRecord.findFirst({
      where: { type: "WAREHOUSE", isActive: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Warehouse Management / Zone A"
        title="Incoming Asset Receiving"
        description="Capture plant receipts, market returns, and system import placeholders while using the existing stock movement workflow as the source of truth."
        actions={
          <Link className="inline-flex items-center gap-2 rounded-brand border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200" href="/warehouse">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to warehouse
          </Link>
        }
      />

      <SectionCard
        title="Workflow guardrails"
        description="Submission creates normal receipt movement request(s). Approval and receiving stay on the existing inventory movement detail screen."
        actions={
          <>
            <StatusBadge tone="info">Movement type: Receipt</StatusBadge>
            <StatusBadge tone="success">RBAC protected</StatusBadge>
          </>
        }
      >
        <div className="flex gap-3 rounded-brand bg-brand-50 p-4 text-sm text-brand-900">
          <ClipboardCheck className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <p>
            Unsafe, rejected or failed-inspection assets are submitted with damaged or maintenance status so the existing safety and maintenance controls can take over before stock is sold or dispatched.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Zone A incoming form" description="Complete the receiving header, attach placeholder document context, and add asset line items.">
        <IncomingAssetForm skus={skus} locations={locations} defaultWarehouseId={defaultWarehouse?.id} />
      </SectionCard>
    </div>
  );
}
