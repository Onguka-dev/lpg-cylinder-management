import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MaintenanceCaseActions } from "@/components/maintenance-case-actions";
import { getCurrentSession } from "@/lib/auth";
import { canManageSafety, canViewSafety, formatSafetyLabel } from "@/lib/safety";
import { prisma } from "@/lib/prisma";

export default async function MaintenanceCaseDetailPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewSafety(session.user.role)) redirect("/unauthorized");
  const item = await prisma.maintenanceCase.findUnique({
    where: { id: params.id },
    include: { cylinder: { include: { sku: true, currentLocation: true } }, createdBy: true, inspectedBy: true, approvedBy: true }
  });
  if (!item) notFound();
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">{formatSafetyLabel(item.status)}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{item.caseNumber}</h1>
          <p className="mt-3 text-sm text-slate-600">{item.cylinder.serialNumber} - {item.cylinder.sku.name} - {item.cylinder.currentLocation.name}</p>
        </div>
        <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/safety">Back</Link>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Detail label="Reason" value={item.reason} />
        <Detail label="Inspection Result" value={item.inspectionResult ? formatSafetyLabel(item.inspectionResult) : "Not recorded"} />
        <Detail label="Inspection Notes" value={item.inspectionNotes ?? "None"} />
        <Detail label="Unsafe" value={item.cylinder.unsafeStatus ? "Yes" : "No"} />
        <Detail label="Quarantined" value={item.cylinder.quarantinedStatus ? "Yes" : "No"} />
        <Detail label="Maintenance" value={formatSafetyLabel(item.cylinder.maintenanceStatus)} />
        <Detail label="Certificate Upload" value={item.certificateUploadPlaceholder ?? "Placeholder"} />
        <Detail label="Document Upload" value={item.documentUploadPlaceholder ?? "Placeholder"} />
        <Detail label="Scrap/Write-Off" value={item.scrapWriteOffPlaceholder ?? "Placeholder only"} />
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Maintenance Actions</h2>
        <div className="mt-4"><MaintenanceCaseActions caseId={item.id} canManage={canManageSafety(session.user.role)} /></div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-sm font-medium text-slate-950">{value}</p></div>;
}
