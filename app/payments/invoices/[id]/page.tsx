import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BillingPaymentForm } from "@/components/billing-payment-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageBilling, canViewBilling, formatBillingLabel, formatMoney } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewBilling(session.user.role)) redirect("/unauthorized");

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      customerOrder: true,
      refillOrder: true,
      lines: true,
      payments: { include: { recordedBy: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!invoice) notFound();
  const canManage = canManageBilling(session.user.role);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">{formatBillingLabel(invoice.status)}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{invoice.invoiceNumber}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {invoice.customer.name} - {formatBillingLabel(invoice.sourceType)}
          </p>
        </div>
        <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/payments">Back</Link>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Summary label="Total" value={formatMoney(invoice.totalAmount)} />
        <Summary label="Amount Paid" value={formatMoney(invoice.amountPaid)} />
        <Summary label="Balance" value={formatMoney(invoice.balanceAmount)} />
        <Summary label="Credit Check" value={invoice.creditLimitExceeded ? "Exceeded" : "Passed"} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Invoice Lines</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Description</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Total</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{invoice.lines.map((line) => <tr key={line.id}><td className="px-3 py-2 font-medium">{line.description}</td><td className="px-3 py-2">{line.quantity}</td><td className="px-3 py-2">{formatMoney(line.unitAmount)}</td><td className="px-3 py-2">{formatMoney(line.lineTotal)}</td></tr>)}</tbody>
            </table>
          </div>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <Detail label="Subtotal" value={formatMoney(invoice.subtotalAmount)} />
            <Detail label="Tax" value={formatMoney(invoice.taxAmount)} />
            <Detail label="Delivery Fee" value={formatMoney(invoice.deliveryFeeAmount)} />
            <Detail label="Discount" value={formatMoney(invoice.discountAmount)} />
            <Detail label="Promotion" value={invoice.promotionPlaceholder ?? "Placeholder only"} />
            <Detail label="Refund" value={invoice.refundPlaceholder ?? "Placeholder only"} />
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Record Payment</h2>
          <div className="mt-4">
            {canManage && Number(invoice.balanceAmount) > 0 ? (
              <BillingPaymentForm invoiceId={invoice.id} balance={invoice.balanceAmount.toString()} />
            ) : (
              <p className="text-sm text-slate-500">No payment action is available.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Receipt History</h2>
        <div className="mt-4 grid gap-3">
          {invoice.payments.map((payment) => (
            <div className="rounded-lg border border-slate-200 p-4 text-sm" key={payment.id}>
              <p className="font-semibold text-slate-950">{payment.receiptNumber}</p>
              <p className="mt-1 text-slate-600">{formatMoney(payment.amount)} via {formatBillingLabel(payment.method)}. Reference: {payment.reference ?? "Placeholder"}</p>
              <p className="mt-1 text-xs text-slate-500">Recorded by {payment.recordedBy?.name ?? "System"}</p>
            </div>
          ))}
          {!invoice.payments.length ? <p className="text-sm text-slate-500">No payments recorded yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 break-words text-lg font-semibold text-slate-950">{value}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-2 text-sm font-medium text-slate-900">{value}</dd></div>;
}
