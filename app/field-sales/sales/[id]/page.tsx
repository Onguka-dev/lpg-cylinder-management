import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Camera, FileSignature, MapPin, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_LOCALE } from "@/lib/currency";
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
    <div className="mx-auto max-w-6xl space-y-5 pb-24 sm:pb-0">
      <PageHeader
        eyebrow="Delivery / Sale Summary"
        title={sale.saleNumber}
        description="Filled stock was issued from vehicle inventory and an empty cylinder was collected back onto the vehicle."
        actions={<Link className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-bold text-slate-700" href="/field-sales/sales">Back to sales</Link>}
      />

      <section className="grid gap-3 sm:grid-cols-4">
        <Summary label="Status" value={sale.status} />
        <Summary label="Amount" value={formatMoney(Number(sale.amount))} />
        <Summary label="Payment" value={formatPaymentMethod(sale.paymentMethod)} />
        <Summary label="Delivery" value={formatFieldDeliveryStatus(sale.deliveryStatus)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Customer details">
          <Detail label="Customer" value={sale.customer.name} />
          <Detail label="Phone" value={sale.customer.phone} />
          <Detail label="Order number" value={sale.saleNumber} />
          <Detail label="Delivered by" value={sale.createdBy?.name ?? "System"} />
        </SectionCard>

        <SectionCard title="Assignment">
          <Detail label="Vehicle" value={`${sale.vehicle.code} - ${sale.vehicle.name}`} />
          <Detail label="Route" value={sale.route ? `${sale.route.code} - ${sale.route.name}` : "Placeholder"} />
          <Detail label="Zone" value={sale.zone ? `${sale.zone.code} - ${sale.zone.name}` : "Placeholder"} />
          <Detail label="Delivery status" value={formatFieldDeliveryStatus(sale.deliveryStatus)} />
        </SectionCard>

        <SectionCard title="Item details">
          <Detail label="SKU" value={sale.sku.name} />
          <Detail label="Filled Issued" value={`${sale.filledCylinder.serialNumber} (${formatCylinderStatus(sale.filledCylinder.status)})`} />
          <Detail label="Empty Collected" value={`${sale.emptyReturnCylinder.serialNumber} (${formatCylinderStatus(sale.emptyReturnCylinder.status)})`} />
          <Detail label="Amount" value={formatMoney(Number(sale.amount))} />
        </SectionCard>

        <SectionCard title="Payment and receipt">
          <Detail label="Payment method" value={formatPaymentMethod(sale.paymentMethod)} />
          <Detail label="Payment Ref" value={sale.paymentReference ?? "Placeholder only"} />
          <Detail label="Offline Sync" value={sale.offlineSyncPlaceholder ?? "Reserved for Stage 15"} />
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white" type="button">
              <ReceiptText size={16} aria-hidden="true" />
              Generate receipt placeholder
            </button>
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Proof of delivery" description="Live POD updates are handled in Delivery Management; this field sale screen carries placeholders for the MSO mobile workflow.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PodPlaceholder label="OTP" value="Captured on delivery screen" icon={FileSignature} />
          <PodPlaceholder label="Signature" value="Placeholder" icon={FileSignature} />
          <PodPlaceholder label="Photo upload" value="Placeholder" icon={Camera} />
          <PodPlaceholder label="GPS" value="Latitude/longitude placeholder" icon={MapPin} />
        </div>
      </SectionCard>

      <SectionCard title="Discrepancy Report" actions={sale.discrepancyReport ? <StatusBadge tone="warning">Reported</StatusBadge> : <StatusBadge tone="success">Clear</StatusBadge>}>
        <p className="text-sm leading-6 text-slate-600">
          {sale.discrepancyReport ?? "No discrepancy was reported for this field sale."}
        </p>
      </SectionCard>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold text-slate-950">{value}</p>
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

function PodPlaceholder({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Camera }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <Icon className="text-brand-700" size={20} aria-hidden="true" />
      <p className="mt-3 text-sm font-bold text-slate-950">{label}</p>
      <p className="mt-1 text-sm text-slate-500">{value}</p>
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
