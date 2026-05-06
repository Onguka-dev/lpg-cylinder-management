import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ReconciliationActions } from "@/components/reconciliation-actions";
import { getCurrentSession } from "@/lib/auth";
import { formatMoney } from "@/lib/billing";
import {
  canAdminOverrideReconciliation,
  canCreateReconciliations,
  canReviewReconciliations,
  canViewReconciliations,
  formatReconciliationLabel
} from "@/lib/reconciliations";
import { prisma } from "@/lib/prisma";

export default async function ReconciliationDetailPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewReconciliations(session.user.role)) redirect("/unauthorized");

  const reconciliation = await prisma.dailyReconciliation.findUnique({
    where: { id: params.id },
    include: { owner: { include: { role: true } }, location: true, createdBy: true, reviewedBy: true }
  });
  if (!reconciliation) notFound();
  if (["RSO", "MSO"].includes(session.user.role) && reconciliation.ownerId !== session.user.id) redirect("/unauthorized");

  const canSubmit = canCreateReconciliations(session.user.role) && (["ADMIN", "WAREHOUSE_MANAGER"].includes(session.user.role) || reconciliation.ownerId === session.user.id);
  const canReview = canReviewReconciliations(session.user.role);
  const canOverride = canAdminOverrideReconciliation(session.user.role);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">{formatReconciliationLabel(reconciliation.status)}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{reconciliation.reference}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {reconciliation.owner.name} - {formatReconciliationLabel(reconciliation.scope)} - {reconciliation.location?.name ?? "No location"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canSubmit && ["DRAFT", "RETURNED"].includes(reconciliation.status) ? <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href={`/reconciliations/${reconciliation.id}/edit`}>Edit</Link> : null}
          <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/reconciliations">Back</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Summary label="Date" value={reconciliation.reconciliationDate.toISOString().slice(0, 10)} />
        <Summary label="Owner Role" value={formatReconciliationLabel(reconciliation.owner.role.name)} />
        <Summary label="Review Status" value={formatReconciliationLabel(reconciliation.status)} />
        <Summary label="Locked" value={reconciliation.lockedAt ? "Yes" : "No"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Stock Accountability">
          <Metric label="Opening stock" value={String(reconciliation.openingStock)} />
          <Metric label="Goods received" value={String(reconciliation.goodsReceived)} />
          <Metric label="Sales / issues" value={String(reconciliation.salesIssues)} />
          <Metric label="Transfers" value={String(reconciliation.transfers)} />
          <Metric label="Returns" value={String(reconciliation.returns)} />
          <Metric label="Damaged cylinders" value={String(reconciliation.damagedCylinders)} />
          <Metric label="Expected closing stock" value={String(reconciliation.expectedClosingStock)} strong />
          <Metric label="Actual closing stock" value={String(reconciliation.actualClosingStock)} strong />
          <Metric label="Stock variance" value={String(reconciliation.stockVariance)} strong />
        </Panel>
        <Panel title="Payment Accountability">
          <Metric label="Cash collections" value={formatMoney(reconciliation.cashCollections)} />
          <Metric label="Mpesa collections" value={formatMoney(reconciliation.mpesaCollections)} />
          <Metric label="Card collections" value={formatMoney(reconciliation.cardCollections)} />
          <Metric label="Expected cash" value={formatMoney(reconciliation.expectedCash)} strong />
          <Metric label="Actual cash" value={formatMoney(reconciliation.actualCash)} strong />
          <Metric label="Payment variance" value={formatMoney(reconciliation.paymentVariance)} strong />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Explanations">
          <TextBlock label="Stock explanation" value={reconciliation.stockExplanation} />
          <TextBlock label="Payment explanation" value={reconciliation.paymentExplanation} />
          <TextBlock label="Admin override reason" value={reconciliation.adminOverrideReason} />
        </Panel>
        <Panel title="Supervisor Review">
          <Metric label="Created by" value={reconciliation.createdBy?.name ?? "System"} />
          <Metric label="Reviewed by" value={reconciliation.reviewedBy?.name ?? "Not reviewed"} />
          <Metric label="Submitted at" value={reconciliation.submittedAt?.toLocaleString() ?? "Not submitted"} />
          <Metric label="Approved at" value={reconciliation.approvedAt?.toLocaleString() ?? "Not approved"} />
          <Metric label="Returned at" value={reconciliation.returnedAt?.toLocaleString() ?? "Not returned"} />
          <TextBlock label="Supervisor notes" value={reconciliation.supervisorNotes} />
        </Panel>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Review Actions</h2>
        <div className="mt-4">
          <ReconciliationActions
            reconciliationId={reconciliation.id}
            status={reconciliation.status}
            canSubmit={canSubmit}
            canReview={canReview}
            canOverride={canOverride}
            actualClosingStock={reconciliation.actualClosingStock}
            actualCash={String(reconciliation.actualCash)}
          />
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel"><h2 className="text-base font-semibold text-slate-950">{title}</h2><div className="mt-4 divide-y divide-slate-100">{children}</div></section>;
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-slate-500">{label}</span><span className={strong ? "font-semibold text-slate-950" : "text-slate-700"}>{value}</span></div>;
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return <div className="py-3 text-sm"><p className="font-medium text-slate-700">{label}</p><p className="mt-1 text-slate-500">{value || "None recorded."}</p></div>;
}
