import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { canManageSafety, canViewSafety, formatSafetyLabel } from "@/lib/safety";
import { prisma } from "@/lib/prisma";

export default async function SafetyPage() {
  const session = await getCurrentSession();
  if (!session || !canViewSafety(session.user.role)) redirect("/unauthorized");

  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const [cases, incidents, unsafeCount, expiredCount, hydroDueCount, inspectionDueCount] = await Promise.all([
    prisma.maintenanceCase.findMany({ include: { cylinder: { include: { sku: true, currentLocation: true } } }, orderBy: { updatedAt: "desc" }, take: 30 }),
    prisma.safetyIncident.findMany({ include: { cylinder: true, createdBy: true }, orderBy: { incidentDate: "desc" }, take: 20 }),
    prisma.cylinder.count({ where: { OR: [{ unsafeStatus: true }, { quarantinedStatus: true }, { status: { in: ["DAMAGED", "UNDER_MAINTENANCE"] } }] } }),
    prisma.cylinder.count({ where: { expiryDate: { lt: now } } }),
    prisma.cylinder.count({ where: { hydroTestDueDate: { lt: now } } }),
    prisma.cylinder.count({ where: { inspectionDueDate: { gte: now, lte: soon } } })
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Stage 12</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Safety, Maintenance & Compliance</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Track cylinder inspection, expiry, hydro-test, unsafe, quarantine, maintenance cases, incident logs, document placeholders, compliance reports, and alerts.
          </p>
        </div>
        {canManageSafety(session.user.role) ? (
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/safety/maintenance-cases/new">New case</Link>
            <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/safety/incidents/new">Log incident</Link>
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Summary label="Unsafe / Quarantined" value={String(unsafeCount)} />
        <Summary label="Expired" value={String(expiredCount)} />
        <Summary label="Hydro-Test Overdue" value={String(hydroDueCount)} />
        <Summary label="Inspection Due 30d" value={String(inspectionDueCount)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Maintenance Cases</h2>
          <div className="mt-4 grid gap-3">
            {cases.map((item) => (
              <Link className="rounded-lg border border-slate-200 p-3 text-sm hover:border-brand-200 hover:bg-brand-50" href={`/safety/maintenance-cases/${item.id}`} key={item.id}>
                <p className="font-medium text-slate-900">{item.caseNumber}</p>
                <p className="text-slate-500">{item.cylinder.serialNumber} - {formatSafetyLabel(item.status)} - {item.cylinder.currentLocation.name}</p>
              </Link>
            ))}
            {!cases.length ? <p className="text-sm text-slate-500">No maintenance cases yet.</p> : null}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Safety Incidents</h2>
          <div className="mt-4 grid gap-3">
            {incidents.map((incident) => (
              <div className="rounded-lg border border-slate-200 p-3 text-sm" key={incident.id}>
                <p className="font-medium text-slate-900">{incident.incidentNumber} - {incident.title}</p>
                <p className="text-slate-500">{formatSafetyLabel(incident.severity)} - {incident.cylinder?.serialNumber ?? "No cylinder"} - {incident.incidentDate.toISOString().slice(0, 10)}</p>
              </div>
            ))}
            {!incidents.length ? <p className="text-sm text-slate-500">No safety incidents yet.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value}</p></div>;
}
