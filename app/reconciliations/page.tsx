import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { formatMoney } from "@/lib/billing";
import { canCreateReconciliations, canViewReconciliations, formatReconciliationLabel } from "@/lib/reconciliations";
import { prisma } from "@/lib/prisma";

export default async function ReconciliationsPage({ searchParams }: { searchParams?: { q?: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewReconciliations(session.user.role)) redirect("/unauthorized");

  const query = searchParams?.q?.trim() ?? "";
  const ownOnly = ["RSO", "MSO"].includes(session.user.role);
  const reconciliations = await prisma.dailyReconciliation.findMany({
    where: {
      ...(ownOnly ? { ownerId: session.user.id } : {}),
      ...(query
        ? {
            OR: [
              { reference: { contains: query, mode: "insensitive" } },
              { owner: { name: { contains: query, mode: "insensitive" } } },
              { location: { name: { contains: query, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: { owner: true, location: true, reviewedBy: true },
    orderBy: [{ reconciliationDate: "desc" }, { updatedAt: "desc" }],
    take: 150
  });
  const submitted = reconciliations.filter((record) => record.status === "SUBMITTED").length;
  const approved = reconciliations.filter((record) => record.status === "APPROVED").length;
  const stockVariance = reconciliations.reduce((sum, record) => sum + record.stockVariance, 0);
  const paymentVariance = reconciliations.reduce((sum, record) => sum + Number(record.paymentVariance), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Stage 11</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Daily Reconciliation</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Close-of-day accountability for RSO, MSO, and Warehouse users covering stock movement,
            expected versus actual closing stock, payment collections, supervisor review, and Admin override.
          </p>
        </div>
        {canCreateReconciliations(session.user.role) ? <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/reconciliations/new">New reconciliation</Link> : null}
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Summary label="Submitted" value={String(submitted)} />
        <Summary label="Approved Locked" value={String(approved)} />
        <Summary label="Stock Variance" value={String(stockVariance)} />
        <Summary label="Payment Variance" value={formatMoney(paymentVariance)} />
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <label className="text-sm font-medium text-slate-700">
          Search reconciliations
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" defaultValue={query} placeholder="Reference, user, or location" />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Search</button>
          </div>
        </label>
      </form>

      <section className="grid gap-3">
        {reconciliations.map((record) => (
          <Link className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel hover:border-brand-200 hover:bg-brand-50" href={`/reconciliations/${record.id}`} key={record.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{record.reference}</p>
                <p className="mt-1 text-sm text-slate-500">{record.owner.name} - {formatReconciliationLabel(record.scope)} - {record.location?.name ?? "No location"}</p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-4 md:text-right">
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{formatReconciliationLabel(record.status)}</span>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{record.reconciliationDate.toISOString().slice(0, 10)}</span>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">Stock {record.stockVariance}</span>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">Cash {formatMoney(record.paymentVariance)}</span>
              </div>
            </div>
          </Link>
        ))}
        {!reconciliations.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No reconciliation records found.</p> : null}
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value}</p></div>;
}
