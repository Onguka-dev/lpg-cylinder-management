import { redirect } from "next/navigation";
import { auditCategories, auditSeverities } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AuditLogsPage({
  searchParams
}: {
  searchParams?: { category?: string; severity?: string; q?: string };
}) {
  const session = await getCurrentSession();

  if (!session) redirect("/login?next=/audit-logs");
  if (!["ADMIN", "AUDITOR"].includes(session.user.role)) redirect("/unauthorized");

  const category = searchParams?.category;
  const severity = searchParams?.severity;
  const q = searchParams?.q?.trim();
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(category && auditCategories.includes(category as never) ? { category: category as never } : {}),
      ...(severity && auditSeverities.includes(severity as never) ? { severity: severity as never } : {}),
      ...(q ? {
        OR: [
          { action: { contains: q, mode: "insensitive" } },
          { details: { contains: q, mode: "insensitive" } },
          { entityType: { contains: q, mode: "insensitive" } },
          { entityId: { contains: q, mode: "insensitive" } }
        ]
      } : {})
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 150
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 17</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Audit Logs</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Review authentication, master data, customer, inventory, approval, order, delivery, invoice, payment, reconciliation, and compliance events.
        </p>
      </section>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-[1fr_1fr_2fr_auto]">
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="category" defaultValue={category ?? ""}>
          <option value="">All categories</option>
          {auditCategories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="severity" defaultValue={severity ?? ""}>
          <option value="">All severities</option>
          {auditSeverities.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" defaultValue={q ?? ""} placeholder="Search action, details, entity" />
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" type="submit">Filter</button>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.createdAt.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{log.category}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{log.severity}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-950">{log.action}</td>
                  <td className="px-4 py-3 text-slate-600">{log.user?.email ?? "System"}</td>
                  <td className="max-w-xl px-4 py-3 text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
