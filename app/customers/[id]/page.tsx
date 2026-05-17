import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { canManageCustomers } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

export default async function CustomerProfilePage({
  params
}: {
  params: { id: string };
}) {
  const [session, customer] = await Promise.all([
    getCurrentSession(),
    prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        invoices: { include: { payments: true }, orderBy: { updatedAt: "desc" }, take: 8 },
        billingPayments: { include: { invoice: true }, orderBy: { createdAt: "desc" }, take: 8 },
        cylinderCustodies: {
          include: { cylinder: { include: { sku: true, currentLocation: true } }, issueLocation: true, returnLocation: true },
          orderBy: { issueDate: "desc" },
          take: 12
        },
        refillOrders: { include: { sku: true, filledCylinder: true, emptyReturnCylinder: true, location: true }, orderBy: { createdAt: "desc" }, take: 8 },
        nonCodedCylinderIntakes: { include: { intakeLocation: true, linkedCylinder: true }, orderBy: { createdAt: "desc" }, take: 8 },
        fullCylinderSales: { include: { sku: true, cylinder: true, location: true }, orderBy: { createdAt: "desc" }, take: 8 }
      }
    })
  ]);

  if (!customer) {
    notFound();
  }

  const canManage = session ? canManageCustomers(session.user.role) : false;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link className="text-sm font-medium text-brand-700" href="/customers">
        Back to customers
      </Link>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">Customer Profile</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">{customer.name}</h1>
            <p className="mt-2 text-sm text-slate-500">{customer.phone}</p>
          </div>
          {canManage ? (
            <Link
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              href={`/customers/${customer.id}/edit`}
            >
              Edit Customer
            </Link>
          ) : null}
        </div>

        <dl className="mt-8 grid gap-4 md:grid-cols-3">
          <Detail label="Proof Reference" value={customer.proofReference} />
          <Detail label="Email" value={customer.email ?? "Not recorded"} />
          <Detail label="KRA PIN" value={customer.kraPin ?? "Not recorded"} />
          <Detail label="Category" value={formatEnum(customer.category)} />
          <Detail label="Status" value={formatEnum(customer.status)} />
          <Detail label="Address" value={customer.address} />
          <Detail label="Geolocation" value={formatGeo(customer.latitude, customer.longitude)} />
          <Detail label="Credit Limit" value={customer.creditLimit?.toString() ?? "None"} />
          <Detail label="Document Placeholder" value={customer.documentPlaceholder ?? "Not recorded"} />
          <div className="md:col-span-3">
            <Detail label="Notes" value={customer.notes ?? "None"} />
          </div>
        </dl>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Cylinder Custody</h2>
          <div className="mt-4 grid gap-3">
            {customer.cylinderCustodies.map((custody) => (
              <div className="rounded-lg border border-slate-200 p-3 text-sm" key={custody.id}>
                <span className="font-medium text-slate-900">{custody.cylinder.barcode ?? custody.cylinder.serialNumber}</span>
                <span className="mt-1 block text-slate-500">
                  {custody.cylinder.sku?.name ?? `${custody.cylinder.cylinderSizeKg ?? ""}kg`} issued at {custody.issueLocation?.name ?? "Unknown location"}; {custody.returnDate ? `returned to ${custody.returnLocation?.name ?? "recorded location"}` : "currently with customer"}
                </span>
              </div>
            ))}
            {!customer.cylinderCustodies.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No custody records yet.</p> : null}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Refill and Sale History</h2>
          <div className="mt-4 grid gap-3">
            {customer.refillOrders.map((order) => (
              <Link className="rounded-lg border border-slate-200 p-3 text-sm hover:border-brand-200 hover:bg-brand-50" href={`/retail-sales/refills/${order.id}`} key={order.id}>
                <span className="font-medium text-slate-900">{order.orderNumber}</span>
                <span className="mt-1 block text-slate-500">{order.sku.name} refill at {order.location.name}; outgoing {order.filledCylinder.barcode ?? order.filledCylinder.serialNumber}</span>
              </Link>
            ))}
            {customer.fullCylinderSales.map((sale) => (
              <Link className="rounded-lg border border-slate-200 p-3 text-sm hover:border-brand-200 hover:bg-brand-50" href={`/retail-sales/full-cylinder-sales/${sale.id}`} key={sale.id}>
                <span className="font-medium text-slate-900">{sale.saleNumber}</span>
                <span className="mt-1 block text-slate-500">{sale.sku.name} full cylinder at {sale.location.name}; outgoing {sale.cylinder.barcode ?? sale.cylinder.serialNumber}</span>
              </Link>
            ))}
            {!customer.refillOrders.length && !customer.fullCylinderSales.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No refill or full cylinder sales yet.</p> : null}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Payment History</h2>
          <div className="mt-4 grid gap-3">
            {customer.billingPayments.map((payment) => (
              <Link className="rounded-lg border border-slate-200 p-3 text-sm hover:border-brand-200 hover:bg-brand-50" href={`/payments/invoices/${payment.invoiceId}`} key={payment.id}>
                <span className="font-medium text-slate-900">{payment.receiptNumber}</span>
                <span className="mt-1 block text-slate-500">{payment.amount.toString()} via {formatEnum(payment.method)} for {payment.invoice.invoiceNumber}</span>
              </Link>
            ))}
            {!customer.billingPayments.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No payments recorded yet.</p> : null}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Non-Coded Return Intakes</h2>
          <div className="mt-4 grid gap-3">
            {customer.nonCodedCylinderIntakes.map((intake) => (
              <Link className="rounded-lg border border-slate-200 p-3 text-sm hover:border-brand-200 hover:bg-brand-50" href={`/inventory/non-coded-intakes/${intake.id}`} key={intake.id}>
                <span className="font-medium text-slate-900">{intake.intakeNumber}</span>
                <span className="mt-1 block text-slate-500">{intake.visibleSerialNumber} ({intake.cylinderSizeKg}kg) at {intake.intakeLocation.name}; {formatEnum(intake.status)}</span>
              </Link>
            ))}
            {!customer.nonCodedCylinderIntakes.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No non-coded returns recorded.</p> : null}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Invoices</h2>
          <div className="mt-4 grid gap-3">
            {customer.invoices.map((invoice) => (
              <Link className="rounded-lg border border-slate-200 p-3 text-sm hover:border-brand-200 hover:bg-brand-50" href={`/payments/invoices/${invoice.id}`} key={invoice.id}>
                <span className="font-medium text-slate-900">{invoice.invoiceNumber}</span>
                <span className="mt-1 block text-slate-500">{formatEnum(invoice.status)} - Balance {invoice.balanceAmount.toString()}</span>
              </Link>
            ))}
            {!customer.invoices.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No invoices recorded yet.</p> : null}
          </div>
        </div>
        {["Complaints", "Service History"].map((title) => (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel" key={title}>
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Placeholder only. This workflow is not implemented in Stage 10.</p>
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No records yet.</div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatGeo(latitude: unknown, longitude: unknown) {
  if (!latitude || !longitude) {
    return "Placeholder not set";
  }

  return `${latitude}, ${longitude}`;
}
