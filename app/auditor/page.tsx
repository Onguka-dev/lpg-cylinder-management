import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AuditorPage() {
  const session = await getCurrentSession();

  if (!session) redirect("/login?next=/auditor");
  if (!["ADMIN", "AUDITOR"].includes(session.user.role)) redirect("/unauthorized");

  const [criticalLogs, warningLogs, failedIntegrations, openMaintenance, variances, recentLogs] = await Promise.all([
    prisma.auditLog.count({ where: { severity: "CRITICAL" } }),
    prisma.auditLog.count({ where: { severity: "WARNING" } }),
    prisma.integrationLog.count({ where: { requestStatus: { in: ["FAILED", "RETRY_QUEUED"] } } }),
    prisma.maintenanceCase.count({ where: { status: { in: ["OPEN", "INSPECTION_RECORDED", "QUARANTINED"] } } }),
    prisma.dailyReconciliation.count({ where: { OR: [{ stockVariance: { not: 0 } }, { paymentVariance: { not: 0 } }] } }),
    prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 8 })
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 17</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Auditor Dashboard</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Review logs, exceptions, compliance cases, reconciliation variances, failed integrations, and reports without operational write access.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Critical logs" value={criticalLogs} />
        <Metric label="Warnings" value={warningLogs} />
        <Metric label="Failed integrations" value={failedIntegrations} />
        <Metric label="Open compliance" value={openMaintenance} />
        <Metric label="Variances" value={variances} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">Recent Audit Activity</h2>
            <Link className="text-sm font-semibold text-brand-700" href="/audit-logs">Open logs</Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentLogs.map((log) => (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3" key={log.id}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{log.category}</span>
                  <span>{log.severity}</span>
                  <span>{log.createdAt.toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-950">{log.action}</p>
                <p className="mt-1 text-sm text-slate-600">{log.details}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Review Shortcuts</h2>
          <div className="mt-4 space-y-3 text-sm font-medium">
            <Link className="block rounded-lg bg-slate-50 px-3 py-3 text-slate-700 hover:bg-brand-50 hover:text-brand-700" href="/audit-logs?severity=WARNING">Warning logs</Link>
            <Link className="block rounded-lg bg-slate-50 px-3 py-3 text-slate-700 hover:bg-brand-50 hover:text-brand-700" href="/reports">Reports</Link>
            <Link className="block rounded-lg bg-slate-50 px-3 py-3 text-slate-700 hover:bg-brand-50 hover:text-brand-700" href="/safety">Compliance cases</Link>
            <Link className="block rounded-lg bg-slate-50 px-3 py-3 text-slate-700 hover:bg-brand-50 hover:text-brand-700" href="/integrations?status=RETRY_QUEUED">Integration exceptions</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
