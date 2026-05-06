import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { canViewBilling, formatBillingLabel, formatMoney } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const session = await getCurrentSession();
  if (!session || !canViewBilling(session.user.role)) redirect("/unauthorized");

  const now = new Date();
  const [invoices, payments, unsafeCylinders, openMaintenanceCases, safetyIncidents] = await Promise.all([
    prisma.invoice.findMany({ include: { customer: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.billingPayment.findMany({ include: { customer: true, invoice: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.cylinder.count({ where: { OR: [{ unsafeStatus: true }, { quarantinedStatus: true }, { expiryDate: { lt: now } }, { hydroTestDueDate: { lt: now } }] } }),
    prisma.maintenanceCase.count({ where: { status: { in: ["OPEN", "INSPECTION_RECORDED", "QUARANTINED"] } } }),
    prisma.safetyIncident.findMany({ include: { cylinder: true }, orderBy: { incidentDate: "desc" }, take: 8 })
  ]);
  const invoiceTotals = invoices.reduce((acc, invoice) => ({
    total: acc.total + Number(invoice.totalAmount),
    paid: acc.paid + Number(invoice.amountPaid),
    balance: acc.balance + Number(invoice.balanceAmount)
  }), { total: 0, paid: 0, balance: 0 });
  const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 12</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Reports</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Basic invoice, payment, outstanding dues, receipt, safety compliance, and maintenance alert reporting.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Summary label="Invoice Total" value={formatMoney(invoiceTotals.total)} />
        <Summary label="Paid" value={formatMoney(invoiceTotals.paid)} />
        <Summary label="Outstanding" value={formatMoney(invoiceTotals.balance)} />
        <Summary label="Receipts" value={formatMoney(paymentTotal)} />
        <Summary label="Compliance Alerts" value={String(unsafeCylinders)} />
        <Summary label="Open Maintenance" value={String(openMaintenanceCases)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Invoice Report</h2>
          <div className="mt-4 grid gap-3">
            {invoices.slice(0, 12).map((invoice) => (
              <div className="rounded-lg border border-slate-200 p-3 text-sm" key={invoice.id}>
                <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
                <p className="text-slate-500">{invoice.customer.name} - {formatBillingLabel(invoice.status)} - {formatMoney(invoice.balanceAmount)} due</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Payment Report</h2>
          <div className="mt-4 grid gap-3">
            {payments.slice(0, 12).map((payment) => (
              <div className="rounded-lg border border-slate-200 p-3 text-sm" key={payment.id}>
                <p className="font-medium text-slate-900">{payment.receiptNumber}</p>
                <p className="text-slate-500">{payment.customer.name} - {formatMoney(payment.amount)} via {formatBillingLabel(payment.method)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Compliance Report</h2>
          <div className="mt-4 grid gap-3">
            {safetyIncidents.map((incident) => (
              <div className="rounded-lg border border-slate-200 p-3 text-sm" key={incident.id}>
                <p className="font-medium text-slate-900">{incident.incidentNumber}</p>
                <p className="text-slate-500">{incident.title} - {incident.severity} - {incident.cylinder?.serialNumber ?? "No cylinder"}</p>
              </div>
            ))}
            {!safetyIncidents.length ? <p className="text-sm text-slate-500">No safety incidents logged.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value}</p></div>;
}
