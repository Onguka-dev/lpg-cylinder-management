import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePlantTransfers, canViewPlantTransfers, formatPlantWorkflowLabel } from "@/lib/plant-refill-workflow";

export default async function PlantTransfersPage({ searchParams }: { searchParams?: { q?: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewPlantTransfers(session.user.role)) redirect("/unauthorized");

  const query = searchParams?.q?.trim() ?? "";
  const transfers = await prisma.plantTransfer.findMany({
    where: query
      ? { OR: [{ reference: { contains: query, mode: "insensitive" } }, { vehicle: { contains: query, mode: "insensitive" } }, { driver: { contains: query, mode: "insensitive" } }] }
      : undefined,
    include: { sourceLocation: true, plantLocation: true, returnDestination: true, _count: { select: { lines: true, varianceCases: true, refillBatches: true } } },
    orderBy: { updatedAt: "desc" },
    take: 150
  }).catch(() => []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Plant refill workflow</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Wandiege to Sabuni Road Transfers</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Dispatch empty cylinders to the refilling plant, receive by scan, record refill quality checks, and return filled cylinders to Wandiege.
          </p>
        </div>
        {canManagePlantTransfers(session.user.role) ? <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/inventory/plant-transfers/new">New Plant Transfer</Link> : null}
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" defaultValue={query} placeholder="Search reference, vehicle, or driver" />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Search</button>
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Vehicle / Seal</th>
                <th className="px-4 py-3">Lines</th>
                <th className="px-4 py-3">Variance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!transfers.length ? <tr><td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={7}>No plant transfers yet.</td></tr> : null}
              {transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{transfer.reference}</td>
                  <td className="px-4 py-3 text-slate-500">{transfer.sourceLocation.name} to {transfer.plantLocation.name}</td>
                  <td className="px-4 py-3 text-slate-700">{transfer.vehicle} / {transfer.sealNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{transfer._count.lines}</td>
                  <td className="px-4 py-3 text-slate-700">{transfer._count.varianceCases}</td>
                  <td className="px-4 py-3 text-slate-700">{formatPlantWorkflowLabel(transfer.status)}</td>
                  <td className="px-4 py-3"><Link className="font-medium text-brand-700" href={`/inventory/plant-transfers/${transfer.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
