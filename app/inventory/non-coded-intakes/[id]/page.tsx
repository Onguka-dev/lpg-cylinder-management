import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NonCodedIntakeReviewActions } from "@/components/non-coded-intake-review-actions";
import { getCurrentSession } from "@/lib/auth";
import { canReviewNonCodedCylinderIntake, canViewNonCodedCylinderIntake, formatNonCodedLabel } from "@/lib/non-coded-intakes";
import { prisma } from "@/lib/prisma";

export default async function NonCodedIntakeDetailPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewNonCodedCylinderIntake(session.user.role)) redirect("/unauthorized");

  const intake = await prisma.nonCodedCylinderIntake.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      intakeLocation: true,
      linkedCylinder: { include: { currentLocation: true, sku: true } },
      refillOrder: true,
      createdBy: true,
      reviewedBy: true
    }
  });
  if (!intake) notFound();

  const canReview = canReviewNonCodedCylinderIntake(session.user.role) && ["PENDING_REVIEW", "TAGGING_PENDING", "ESCALATED"].includes(intake.status);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <Link className="text-sm font-semibold text-brand-700 hover:underline" href="/inventory/non-coded-intakes">Back to non-coded intakes</Link>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">Non-coded return</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">{intake.intakeNumber}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Status: {formatNonCodedLabel(intake.status)}</p>
          </div>
          <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href={`/api/reports/export?type=non-coded-tagging-queue&status=${intake.status}`}>Export queue CSV</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Customer and intake</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Detail label="Customer" value={`${intake.customer.name} - ${intake.customer.phone}`} />
            <Detail label="Visible serial" value={intake.visibleSerialNumber} />
            <Detail label="Cylinder size" value={`${intake.cylinderSizeKg}kg`} />
            <Detail label="Brand / manufacturer" value={intake.manufacturer ?? "-"} />
            <Detail label="Condition" value={formatNonCodedLabel(intake.condition)} />
            <Detail label="Intake location" value={intake.intakeLocation.name} />
            <Detail label="Photo placeholder" value={intake.photoPlaceholder ?? "-"} />
            <Detail label="Staff remarks" value={intake.staffRemarks ?? "-"} />
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Review and tagging</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Detail label="Linked cylinder" value={intake.linkedCylinder ? `${intake.linkedCylinder.serialNumber} (${intake.linkedCylinder.status})` : "Not linked"} />
            <Detail label="Approved barcode" value={intake.approvedBarcode ?? "-"} />
            <Detail label="Approved QR" value={intake.approvedQrCode ?? "-"} />
            <Detail label="Refill order" value={intake.refillOrder?.orderNumber ?? "-"} />
            <Detail label="Created by" value={intake.createdBy?.name ?? "System"} />
            <Detail label="Reviewed by" value={intake.reviewedBy?.name ?? "-"} />
            <Detail label="Review notes" value={intake.reviewNotes ?? "-"} />
          </dl>
        </div>
      </section>

      {canReview ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Warehouse/Admin review</h2>
          <div className="mt-4">
            <NonCodedIntakeReviewActions intakeId={intake.id} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}
