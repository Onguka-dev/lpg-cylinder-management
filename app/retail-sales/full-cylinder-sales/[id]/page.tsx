import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_LOCALE } from "@/lib/currency";
import { canViewFullCylinderSales } from "@/lib/full-cylinder-sales";
import { formatPaymentMethod } from "@/lib/refill-sales";
import { prisma } from "@/lib/prisma";

export default async function FullCylinderSaleReceiptPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewFullCylinderSales(session.user.role)) redirect("/unauthorized");

  const sale = await prisma.fullCylinderSale.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      sku: true,
      location: true,
      cylinder: true,
      createdBy: true
    }
  });

  if (!sale) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link className="text-sm font-medium text-brand-700" href="/retail-sales/full-cylinder-sales">
        Back to full cylinder sales
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">Receipt</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">{sale.receiptNumber}</h1>
            <p className="mt-2 text-sm text-slate-500">{sale.saleNumber} / {sale.invoiceNumber}</p>
          </div>
          <div className="rounded-lg bg-brand-50 px-4 py-3 text-right">
            <p className="text-xs font-semibold text-brand-700">Total paid</p>
            <p className="text-2xl font-bold text-brand-950">{formatMoney(Number(sale.totalAmount))}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          <Detail label="Sale Type" value="Full Cylinder + Gas" />
          <Detail label="Customer" value={`${sale.customer.name} - ${sale.customer.phone}`} />
          <Detail label="ID/Passport" value={sale.customer.proofReference} />
          <Detail label="KRA PIN" value={sale.customer.kraPin ?? "Not recorded"} />
          <Detail label="Cylinder Size" value={sale.sku.name} />
          <Detail label="Outgoing Barcode" value={sale.cylinder.barcode ?? sale.cylinder.serialNumber} />
          <Detail label="Returned Empty Barcode" value="Not applicable" />
          <Detail label="Payment Mode" value={formatPaymentMethod(sale.paymentMethod)} />
          <Detail label="Payment Reference" value={sale.paymentReference ?? "Not recorded"} />
          <Detail label="Sales Point" value={`${sale.location.code} - ${sale.location.name}`} />
          <Detail label="Responsible User" value={sale.createdBy?.name ?? "Not recorded"} />
          <Detail label="Receipt Date" value={sale.createdAt.toLocaleString("en-KE")} />
        </dl>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 break-words text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(DEFAULT_CURRENCY_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    maximumFractionDigits: 0
  }).format(value);
}
