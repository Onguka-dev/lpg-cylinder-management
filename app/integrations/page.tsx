import Link from "next/link";
import { redirect } from "next/navigation";
import { IntegrationLogForm } from "@/components/integration-log-form";
import { IntegrationRetryButton } from "@/components/integration-retry-button";
import { SapQueueRetryButton } from "@/components/sap-queue-retry-button";
import { getCurrentSession } from "@/lib/auth";
import {
  canTriggerIntegrations,
  canViewIntegrations,
  formatIntegrationProvider,
  formatIntegrationStatus
} from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { sapPostingStatuses } from "@/lib/sap-posting";

export default async function IntegrationsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const session = await getCurrentSession();
  if (!session || !canViewIntegrations(session.user.role)) redirect("/unauthorized");

  const providerType = searchParams?.providerType;
  const status = searchParams?.status;
  const sapStatus = sapPostingStatuses.includes(searchParams?.sapStatus as never) ? searchParams?.sapStatus : undefined;
  const [settings, logs, totals, sapQueue, sapTotals] = await Promise.all([
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
    prisma.integrationLog.groupBy({ by: ["requestStatus"], _count: { _all: true } }),
    prisma.sapPostingQueue.findMany({
      where: { ...(sapStatus ? { status: sapStatus as never } : {}) },
      include: { integrationLog: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.sapPostingQueue.groupBy({ by: ["status"], _count: { _all: true } })
  ]);
  const countFor = (value: string) => totals.find((row) => row.requestStatus === value)?._count._all ?? 0;
  const sapCountFor = (value: string) => sapTotals.find((row) => row.status === value)?._count._all ?? 0;

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

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">SAP Reconciliation</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Operational receipts, movements, sales, and returns are queued only after validation, then posted through the safe SAP mock adapter. Mock failures stay in the queue for retry without blocking core work.
            </p>
          </div>
          <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/api/reports/export?type=sap-reconciliation-report">Export SAP CSV</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {sapPostingStatuses.map((item) => <Summary label={formatIntegrationStatus(item)} value={String(sapCountFor(item))} key={item} />)}
        </div>
        <form className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input type="hidden" name="providerType" value={providerType ?? ""} />
          <input type="hidden" name="status" value={status ?? ""} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="sapStatus" defaultValue={sapStatus ?? ""}>
            <option value="">All SAP queue statuses</option>
            {sapPostingStatuses.map((item) => <option value={item} key={item}>{formatIntegrationStatus(item)}</option>)}
          </select>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Filter SAP queue</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{["Source", "Reference", "Status", "SAP Doc", "Customer", "Material", "Plant", "Storage", "Amount", "Created", "Error", "Action"].map((header) => <th className="px-4 py-3" key={header}>{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sapQueue.length ? sapQueue.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-600">{item.sourceModule.toLowerCase().replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 font-medium text-slate-950">{item.sourceReference}</td>
                  <td className="px-4 py-3 text-slate-600">{formatIntegrationStatus(item.status)}</td>
                  <td className="px-4 py-3 text-slate-600">{item.sapDocumentNo ?? "Pending"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.sapCustomerCode ?? "Unmapped"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.sapMaterialCode ?? "Unmapped"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.sapPlantCode ?? "Unmapped"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.sapStorageLocationCode ?? "Unmapped"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.amount ? `${item.currency} ${item.amount.toString()}` : "None"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-600">{item.mismatchReason ?? item.errorMessage ?? "None"}</td>
                  <td className="px-4 py-3">{canTriggerIntegrations(session.user.role) && item.status !== "POSTED" ? <SapQueueRetryButton id={item.id} /> : null}</td>
                </tr>
              )) : <tr><td className="px-4 py-6 text-slate-500" colSpan={12}>No SAP queue records found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

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
