import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { canViewNonCodedCylinderIntake, formatNonCodedLabel, nonCodedCylinderIntakeStatuses } from "@/lib/non-coded-intakes";
import { prisma } from "@/lib/prisma";

export default async function NonCodedIntakesPage({ searchParams }: { searchParams?: { q?: string; status?: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewNonCodedCylinderIntake(session.user.role)) redirect("/unauthorized");

  const query = searchParams?.q?.trim();
  const status = searchParams?.status?.trim();
  const intakes = await prisma.nonCodedCylinderIntake.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(query
        ? {
            OR: [
              { intakeNumber: { contains: query, mode: "insensitive" } },
              { visibleSerialNumber: { contains: query, mode: "insensitive" } },
              { customer: { name: { contains: query, mode: "insensitive" } } },
              { customer: { phone: { contains: query, mode: "insensitive" } } },
              { customer: { email: { contains: query, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: { customer: true, intakeLocation: true, linkedCylinder: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const counts = await prisma.nonCodedCylinderIntake.groupBy({
    by: ["status"],
    _count: { _all: true }
  });
  const countByStatus = new Map(counts.map((row) => [row.status, row._count._all]));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">Barcode tagging control</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Non-coded cylinder intake queue</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Returned cylinders without QR/barcode remain pending review until warehouse/admin links, tags, approves, rejects, or escalates them.</p>
          </div>
          <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/retail-sales/empty-returns/new">Log return</Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {nonCodedCylinderIntakeStatuses.slice(0, 4).map((item) => (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={item}>
            <p className="text-xs font-semibold uppercase text-slate-500">{formatNonCodedLabel(item)}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{countByStatus.get(item) ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/inventory/non-coded-intakes">
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" placeholder="Search intake, serial, customer, phone" defaultValue={query ?? ""} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {nonCodedCylinderIntakeStatuses.map((item) => <option value={item} key={item}>{formatNonCodedLabel(item)}</option>)}
          </select>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Filter</button>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr><th className="px-4 py-3">Intake</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Serial / Size</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Condition</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {intakes.map((intake) => (
                <tr key={intake.id}>
                  <td className="px-4 py-3"><Link className="font-semibold text-brand-700 hover:underline" href={`/inventory/non-coded-intakes/${intake.id}`}>{intake.intakeNumber}</Link></td>
                  <td className="px-4 py-3">{intake.customer.name}<br /><span className="text-xs text-slate-500">{intake.customer.phone}</span></td>
                  <td className="px-4 py-3">{intake.visibleSerialNumber}<br /><span className="text-xs text-slate-500">{intake.cylinderSizeKg}kg</span></td>
                  <td className="px-4 py-3">{intake.intakeLocation.name}</td>
                  <td className="px-4 py-3">{formatNonCodedLabel(intake.condition)}</td>
                  <td className="px-4 py-3">{formatNonCodedLabel(intake.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!intakes.length ? <p className="py-8 text-center text-sm text-slate-500">No non-coded intakes found.</p> : null}
        </div>
      </section>
    </div>
  );
}
