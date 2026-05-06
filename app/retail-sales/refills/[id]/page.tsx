import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { formatCylinderStatus } from "@/lib/inventory";
import { getSalesLocationForSession } from "@/lib/refill-sales-access";
import { canViewRefillSales, formatPaymentMethod } from "@/lib/refill-sales";
import { prisma } from "@/lib/prisma";

export default async function RefillOrderDetailPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();

  if (!session || !canViewRefillSales(session.user.role)) {
    redirect("/unauthorized");
  }

  const order = await prisma.refillOrder.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      sku: true,
      location: true,
      filledCylinder: true,
      emptyReturnCylinder: true,
      payment: true,
      createdBy: true
    }
  });

  if (!order) notFound();

  if (session.user.role === "RSO") {
    const assignedLocationId = await getSalesLocationForSession(session);
    if (order.locationId !== assignedLocationId) redirect("/unauthorized");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Closed refill transaction</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{order.orderNumber}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Invoice {order.invoiceNumber} and receipt {order.receiptNumber} were generated for this walk-in refill.
          </p>
        </div>
        <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/retail-sales/refills">
          Back to refills
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Summary label="Status" value={order.status} />
        <Summary label="Total" value={order.totalAmount.toString()} />
        <Summary label="Payment" value={formatPaymentMethod(order.paymentMethod)} />
        <Summary label="Outlet" value={order.location.name} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Customer & SKU</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <Detail label="Customer" value={order.customer.name} />
            <Detail label="Phone" value={order.customer.phone} />
            <Detail label="SKU" value={order.sku.name} />
            <Detail label="Handled By" value={order.createdBy?.name ?? "System"} />
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Cylinder Exchange</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <Detail label="Filled Issued" value={`${order.filledCylinder.serialNumber} (${formatCylinderStatus(order.filledCylinder.status)})`} />
            <Detail label="Empty Received" value={`${order.emptyReturnCylinder.serialNumber} (${formatCylinderStatus(order.emptyReturnCylinder.status)})`} />
            <Detail label="Delivery" value={order.deliveryPlaceholder ?? "Placeholder"} />
            <Detail label="Credit" value={order.creditPlaceholder ?? "Placeholder"} />
          </dl>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Invoice & Receipt</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Summary label="Invoice" value={order.invoiceNumber} />
          <Summary label="Receipt" value={order.receiptNumber} />
          <Summary label="Payment No." value={order.payment?.paymentNumber ?? "Not recorded"} />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Payment status: {order.payment?.status ?? "Pending"} via {formatPaymentMethod(order.payment?.method ?? order.paymentMethod)}.
          Reference: {order.payment?.reference ?? "Placeholder only"}.
        </p>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
