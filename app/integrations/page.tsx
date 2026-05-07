import Link from "next/link";
import { redirect } from "next/navigation";
import { IntegrationLogForm } from "@/components/integration-log-form";
import { IntegrationRetryButton } from "@/components/integration-retry-button";
import { getCurrentSession } from "@/lib/auth";
import {
  canTriggerIntegrations,
  canViewIntegrations,
  formatIntegrationProvider,
  formatIntegrationStatus
} from "@/lib/integrations";
import { prisma } from "@/lib/prisma";

export default async function IntegrationsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const session = await getCurrentSession();
  if (!session || !canViewIntegrations(session.user.role)) redirect("/unauthorized");

  const providerType = searchParams?.providerType;
  const status = searchParams?.status;
  const [settings, logs, totals] = await Promise.all([
    prisma.integrationSetting.findMany({ orderBy: { providerType: "asc" } }),
    prisma.integrationLog.findMany({
      where: {
        ...(providerType ? { providerType: providerType as never } : {}),
        ...(status ? { requestStatus: status as never } : {})
      },
      include: { setting: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.integrationLog.groupBy({ by: ["requestStatus"], _count: { _all: true } })
  ]);
  const countFor = (value: string) => totals.find((row) => row.requestStatus === value)?._count._all ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">Stage 16</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Integration Logs</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Mock adapters for SAP/accounting, payment callbacks, SMS/email, barcode/RFID input, and maps/GPS placeholders. Failed requests queue for retry and never block core transactions.
            </p>
          </div>
          <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/settings/integrations">Settings</Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Summary label="Success" value={String(countFor("SUCCESS"))} />
        <Summary label="Queued" value={String(countFor("QUEUED"))} />
        <Summary label="Retry Queued" value={String(countFor("RETRY_QUEUED"))} />
        <Summary label="Failed" value={String(countFor("FAILED"))} />
      </section>

      {canTriggerIntegrations(session.user.role) ? <IntegrationLogForm /> : null}

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="grid gap-3 md:grid-cols-3">
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="providerType" defaultValue={providerType ?? ""}>
            <option value="">All providers</option>
            {settings.map((setting) => <option value={setting.providerType} key={setting.id}>{formatIntegrationProvider(setting.providerType)}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {["QUEUED", "SUCCESS", "FAILED", "RETRY_QUEUED"].map((item) => <option value={item} key={item}>{formatIntegrationStatus(item)}</option>)}
          </select>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Apply filters</button>
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{["Reference", "Provider", "Action", "Request", "Response", "Retries", "Related", "Error", "Action"].map((header) => <th className="px-4 py-3" key={header}>{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length ? logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 font-medium text-slate-950">{log.reference}</td>
                  <td className="px-4 py-3 text-slate-600">{formatIntegrationProvider(log.providerType)}</td>
                  <td className="px-4 py-3 text-slate-600">{log.action.toLowerCase().replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 text-slate-600">{formatIntegrationStatus(log.requestStatus)}</td>
                  <td className="px-4 py-3 text-slate-600">{log.responseStatus ? formatIntegrationStatus(log.responseStatus) : "Pending"}</td>
                  <td className="px-4 py-3 text-slate-600">{log.retryCount}</td>
                  <td className="px-4 py-3 text-slate-600">{log.relatedRecord ?? "None"}</td>
                  <td className="px-4 py-3 text-slate-600">{log.errorMessage ?? "None"}</td>
                  <td className="px-4 py-3">{canTriggerIntegrations(session.user.role) && log.requestStatus !== "SUCCESS" ? <IntegrationRetryButton id={log.id} /> : null}</td>
                </tr>
              )) : <tr><td className="px-4 py-6 text-slate-500" colSpan={9}>No integration logs found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value}</p></div>;
}
