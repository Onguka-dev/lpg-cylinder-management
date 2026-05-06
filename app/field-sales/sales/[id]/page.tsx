import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentSession } from "@/lib/auth";
import { canViewFieldSales, formatFieldDeliveryStatus } from "@/lib/field-sales";
import { getFieldAssignment } from "@/lib/field-sales-access";
import { formatCylinderStatus } from "@/lib/inventory";
import { formatPaymentMethod } from "@/lib/refill-sales";
import { prisma } from "@/lib/prisma";

export default async function FieldSaleDetailPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewFieldSales(session.user.role)) redirect("/unauthorized");

  const sale = await prisma.fieldSale.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      sku: true,
      vehicle: true,
      route: true,
      zone: true,
      filledCylinder: true,
      emptyReturnCylinder: true,
      createdBy: true
    }
  });

  if (!sale) notFound();

  if (session.user.role === "MSO") {
    const assignment = await getFieldAssignment();
    if (assignment.vehicle?.id && sale.vehicleId !== assignment.vehicle.id) redirect("/unauthorized");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Closed field sale</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{sale.saleNumber}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Filled stock was issued from vehicle inventory and an empty cylinder was collected back onto the vehicle.
          </p>
        </div>
        <Link className="rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700" href="/field-sales/sales">
          Back to sales
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Summary label="Status" value={sale.status} />
        <Summary label="Amount" value={sale.amount.toString()} />
        <Summary label="Payment" value={formatPaymentMethod(sale.paymentMethod)} />
        <Summary label="Delivery" value={formatFieldDeliveryStatus(sale.deliveryStatus)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Customer & Assignment">
          <Detail label="Customer" value={sale.customer.name} />
          <Detail label="Phone" value={sale.customer.phone} />
          <Detail label="Vehicle" value={`${sale.vehicle.code} - ${sale.vehicle.name}`} />
          <Detail label="Route" value={sale.route ? `${sale.route.code} - ${sale.route.name}` : "Placeholder"} />
          <Detail label="Zone" value={sale.zone ? `${sale.zone.code} - ${sale.zone.name}` : "Placeholder"} />
          <Detail label="Handled By" value={sale.createdBy?.name ?? "System"} />
        </Panel>

        <Panel title="Cylinder Exchange">
          <Detail label="SKU" value={sale.sku.name} />
          <Detail label="Filled Issued" value={`${sale.filledCylinder.serialNumber} (${formatCylinderStatus(sale.filledCylinder.status)})`} />
          <Detail label="Empty Collected" value={`${sale.emptyReturnCylinder.serialNumber} (${formatCylinderStatus(sale.emptyReturnCylinder.status)})`} />
          <Detail label="Payment Ref" value={sale.paymentReference ?? "Placeholder only"} />
          <Detail label="Offline Sync" value={sale.offlineSyncPlaceholder ?? "Reserved for Stage 15"} />
        </Panel>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Discrepancy Report</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {sale.discrepancyReport ?? "No discrepancy was reported for this field sale."}
        </p>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <dl className="mt-4 grid gap-3 text-sm">{children}</dl>
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
