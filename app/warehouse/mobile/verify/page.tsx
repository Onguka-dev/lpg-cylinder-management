import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { formatCylinderStatus } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function WarehouseMobileVerifyPage({ searchParams }: { searchParams?: { q?: string } }) {
  const session = await getCurrentSession();
  if (!session || !["ADMIN", "WAREHOUSE_MANAGER"].includes(session.user.role)) redirect("/unauthorized");

  const query = searchParams?.q?.trim() ?? "";
  const asset = query
    ? await prisma.cylinder.findFirst({
        where: {
          OR: [
            { serialNumber: { equals: query, mode: "insensitive" } },
            { barcode: { equals: query, mode: "insensitive" } }
          ]
        },
        include: { sku: true, currentLocation: true },
        orderBy: { updatedAt: "desc" }
      })
    : await prisma.cylinder.findFirst({ include: { sku: true, currentLocation: true }, orderBy: { updatedAt: "desc" } });
  const isValid = Boolean(asset && !asset.unsafeStatus && !asset.quarantinedStatus && !["DAMAGED", "UNDER_MAINTENANCE"].includes(asset.status));

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <Link className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white" href="/warehouse/mobile">
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-950">Asset Verification</h1>
      </div>
      <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
        <label className="block text-sm font-bold text-slate-700">
          Barcode / serial
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 px-4 text-sm" defaultValue={query} name="q" placeholder="Scan or type serial" />
        </label>
        <button className="mt-3 w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-bold text-white" type="submit">Verify asset</button>
      </form>
      <SectionCard title="Asset details" actions={isValid ? <StatusBadge tone="success">Valid</StatusBadge> : <StatusBadge tone="danger">Invalid / review</StatusBadge>}>
        {asset ? (
          <div className="space-y-4">
            <div className={isValid ? "rounded-2xl bg-success-50 p-4 text-success-700" : "rounded-2xl bg-danger-50 p-4 text-danger-700"}>
              <div className="flex items-center gap-3">
                {isValid ? <CheckCircle2 size={22} aria-hidden="true" /> : <XCircle size={22} aria-hidden="true" />}
                <p className="font-bold">{isValid ? "Asset is valid for warehouse handling" : "Asset requires supervisor or safety review"}</p>
              </div>
            </div>
            <Detail label="Serial" value={asset.serialNumber} />
            <Detail label="Barcode" value={asset.barcode ?? "Not captured"} />
            <Detail label="Asset type" value="LPG Cylinder" />
            <Detail label="Capacity" value={asset.sku.capacityKg ? `${asset.sku.capacityKg}kg` : asset.sku.name} />
            <Detail label="SKU" value={asset.sku.name} />
            <Detail label="Status" value={formatCylinderStatus(asset.status)} />
            <Detail label="Location" value={asset.currentLocation.name} />
            <Detail label="Last filling date" value="Placeholder from future filling history" />
            <Detail label="Last inspection date" value={asset.inspectionDueDate?.toISOString().slice(0, 10) ?? "Not captured"} />
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No asset found for this code.</p>
        )}
      </SectionCard>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-950">{value}</span>
    </div>
  );
}
