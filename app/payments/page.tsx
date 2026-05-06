import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { canManageBilling, canViewBilling, formatBillingLabel, formatMoney } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export default async function PaymentsPage({ searchParams }: { searchParams?: { q?: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewBilling(session.user.role)) redirect("/unauthorized");

  const query = searchParams?.q?.trim() ?? "";
  const invoices = await prisma.invoice.findMany({
    where: query
      ? {
          OR: [
            { invoiceNumber: { contains: query, mode: "insensitive" } },
            { customer: { name: { contains: query, mode: "insensitive" } } },
            { customer: { phone: { contains: query, mode: "insensitive" } } },
            { customerOrder: { orderNumber: { contains: query, mode: "insensitive" } } },
            { refillOrder: { orderNumber: { contains: query, mode: "insensitive" } } }
          ]
        }
      : undefined,
    include: { customer: true, customerOrder: true, refillOrder: true, payments: true },
    orderBy: { updatedAt: "desc" },
    take: 150
  });
  const totals = invoices.reduce((acc, invoice) => ({
    total: acc.total + Number(invoice.totalAmount),
    paid: acc.paid + Number(invoice.amountPaid),
    balance: acc.balance + Number(invoice.balanceAmount)
  }), { total: 0, paid: 0, balance: 0 });

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Stage 10</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Billing & Payments</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Generate invoices from delivered orders and closed retail sales, record partial payments,
            track balances, receipt numbers, credit checks, and refund placeholders.
          </p>
        </div>
        {canManageBilling(session.user.role) ? <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/payments/invoices/new">New invoice</Link> : null}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Summary label="Invoice Total" value={formatMoney(totals.total)} />
        <Summary label="Amount Paid" value={formatMoney(totals.paid)} />
        <Summary label="Outstanding Dues" value={formatMoney(totals.balance)} />
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <label className="text-sm font-medium text-slate-700">
          Search invoices
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" defaultValue={query} placeholder="Invoice, order, customer, phone" />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Search</button>
          </div>
        </label>
      </form>

      <section className="grid gap-3">
        {invoices.map((invoice) => (
          <Link className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel hover:border-brand-200 hover:bg-brand-50" href={`/payments/invoices/${invoice.id}`} key={invoice.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{invoice.invoiceNumber}</p>
                <p className="mt-1 text-sm text-slate-500">{invoice.customer.name} - {formatBillingLabel(invoice.sourceType)}</p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3 md:text-right">
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{formatBillingLabel(invoice.status)}</span>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{formatMoney(invoice.totalAmount)}</span>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">Bal {formatMoney(invoice.balanceAmount)}</span>
              </div>
            </div>
          </Link>
        ))}
        {!invoices.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No invoices found.</p> : null}
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value}</p></div>;
}
