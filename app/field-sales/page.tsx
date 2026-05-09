import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ClipboardCheck,
  CreditCard,
  MapPinned,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Truck,
  UserPlus
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_LOCALE } from "@/lib/currency";
import { canManageFieldSales, canViewFieldSales, formatFieldDeliveryStatus } from "@/lib/field-sales";
import { getFieldAssignment } from "@/lib/field-sales-access";
import { formatCylinderStatus } from "@/lib/inventory";
import { formatPaymentMethod } from "@/lib/refill-sales";
import { prisma } from "@/lib/prisma";

export default async function FieldSalesPage() {
  const session = await getCurrentSession();

  if (!session || !canViewFieldSales(session.user.role)) {
    redirect("/unauthorized");
  }

  const assignment = await getFieldAssignment();
  const vehicleId = assignment.vehicle?.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [stock, customers, orders, recentSales, todaySales, offlineQueue] = await Promise.all([
    vehicleId
      ? prisma.cylinder.groupBy({
          by: ["skuId", "status"],
          where: { currentLocationId: vehicleId },
          _count: { id: true }
        })
      : [],
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.customerOrder.findMany({
      where: { channel: "MSO", status: { in: ["PENDING", "CONFIRMED", "ASSIGNED", "DISPATCHED"] } },
      include: { customer: true, deliveryZone: true, items: { include: { sku: true } } },
      orderBy: [{ isPriority: "desc" }, { expectedDeliveryDate: "asc" }],
      take: 8
    }),
    prisma.fieldSale.findMany({
      where: vehicleId && session.user.role === "MSO" ? { vehicleId } : {},
      include: { customer: true, sku: true },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.fieldSale.aggregate({
      where: {
        createdAt: { gte: today },
        ...(vehicleId && session.user.role === "MSO" ? { vehicleId } : {})
      },
      _count: { id: true },
      _sum: { amount: true }
    }),
    prisma.offlineSyncItem.count({
      where: {
        status: { in: ["QUEUED", "FAILED", "CONFLICT"] },
        ...(session.user.role === "MSO" ? { createdById: session.user.id } : {})
      }
    })
  ]);

  const skuIds = Array.from(new Set(stock.map((row) => row.skuId)));
  const skus = await prisma.masterDataRecord.findMany({ where: { id: { in: skuIds } } });
  const skuNameById = new Map(skus.map((sku) => [sku.id, sku.name]));
  const filledStock = stock.filter((row) => row.status === "FILLED").reduce((sum, row) => sum + row._count.id, 0);
  const emptyReturns = stock.filter((row) => row.status === "EMPTY").reduce((sum, row) => sum + row._count.id, 0);
  const paymentsCollected = Number(todaySales._sum.amount ?? 0);
  const canCreate = canManageFieldSales(session.user.role);

  const quickActions = [
    { label: "New Order", href: "/field-sales/sales/new", icon: ReceiptText, primary: true },
    { label: "Payment", href: "/field-sales/sales/new#payment", icon: CreditCard },
    { label: "Proof of Delivery", href: "/deliveries", icon: ClipboardCheck },
    { label: "Register Customer", href: "/customers/new", icon: UserPlus },
    { label: "Empty Return", href: "/field-sales/sales/new#empty-return", icon: RefreshCw },
    { label: "Discrepancy", href: "/field-sales/sales/new#discrepancy", icon: AlertTriangle },
    { label: "Offline Drafts", href: "/offline", icon: MapPinned }
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-24 sm:pb-0">
      <PageHeader
        eyebrow="Wells Gas / Green Wells Energies"
        title={`Good day${session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}`}
        description={`MSO ID: ${session.user.id.slice(0, 8).toUpperCase()} | ${assignment.route?.name ?? "Assigned route pending"} | ${assignment.zone?.name ?? "Assigned zone pending"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="success">Online</StatusBadge>
            <StatusBadge tone={offlineQueue ? "warning" : "success"}>{offlineQueue} pending sync</StatusBadge>
          </div>
        }
      />

      <section className="rounded-[1.5rem] bg-brand-700 p-5 text-white shadow-brand">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-100">Assigned vehicle</p>
            <h2 className="mt-1 text-2xl font-bold">{assignment.vehicle?.name ?? "No vehicle assigned"}</h2>
            <p className="mt-2 text-sm text-brand-100">{assignment.vehicle?.code ?? "Configure VEHICLE master data"} · Capacity placeholder from vehicle profile</p>
          </div>
          <Truck size={32} aria-hidden="true" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ReceiptText} label="Today's Sales" value={String(todaySales._count.id)} detail="Closed MSO transactions" tone="brand" />
        <MetricCard icon={ClipboardCheck} label="Orders" value={orders.length.toLocaleString()} detail="Pending and active assignments" tone={orders.length ? "warning" : "success"} />
        <MetricCard icon={CreditCard} label="Payments Collected" value={formatMoney(paymentsCollected)} detail="Cash/mobile/card placeholders" tone="info" />
        <MetricCard icon={RefreshCw} label="Empty Returns" value={emptyReturns.toLocaleString()} detail="Collected on vehicle" tone="success" />
      </section>

      {canCreate ? (
        <SectionCard title="Quick actions" description="Phone-sized actions for the MSO field workflow.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  className={action.primary
                    ? "rounded-2xl bg-brand-600 p-4 text-white shadow-panel"
                    : "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800 hover:border-brand-200"}
                  href={action.href}
                  key={action.label}
                >
                  <Icon size={22} aria-hidden="true" />
                  <p className="mt-3 text-sm font-bold leading-5">{action.label}</p>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <SectionCard title="Assigned vehicle inventory" description="Current stock by SKU and cylinder status.">
          <div className="grid gap-3 sm:grid-cols-2">
            {stock.length ? stock.map((row) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={`${row.skuId}-${row.status}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{skuNameById.get(row.skuId) ?? "Unknown SKU"}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatCylinderStatus(row.status)}</p>
                  </div>
                  <StatusBadge tone={row.status === "FILLED" ? "success" : "info"}>{row._count.id}</StatusBadge>
                </div>
                <Link className="mt-4 inline-flex text-sm font-bold text-brand-700" href="/inventory/cylinders">
                  View stock details
                </Link>
              </div>
            )) : (
              <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No assigned vehicle stock found.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Orders, payments & inventory" description="Operational tabs presented as focused mobile lists.">
          <div className="grid gap-3">
            <TabSummary label="Pending orders" value={orders.filter((order) => order.status === "PENDING" || order.status === "CONFIRMED").length} />
            <TabSummary label="In progress" value={orders.filter((order) => order.status === "ASSIGNED" || order.status === "DISPATCHED").length} />
            <TabSummary label="Completed sales" value={recentSales.filter((sale) => sale.status === "CLOSED").length} />
            <TabSummary label="Cancelled orders" value={orders.filter((order) => order.status === "CANCELLED").length} />
            <TabSummary label="Payment history" value={recentSales.length} />
            <TabSummary label="Stock summary" value={stock.length} />
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Assigned Customers">
          <div className="grid gap-3">
            {customers.map((customer) => (
              <Link className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm hover:border-brand-200" href={`/customers/${customer.id}`} key={customer.id}>
                <span className="font-bold text-slate-900">{customer.name}</span>
                <span className="mt-1 block text-slate-500">{customer.phone}</span>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Assigned Orders">
          <div className="grid gap-3">
            {orders.length ? orders.map((order) => (
              <Link className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm hover:border-brand-200" href={`/orders/${order.id}`} key={order.id}>
                <span className="font-bold text-slate-900">{order.orderNumber}</span>
                <span className="mt-1 block text-slate-500">{order.customer.name} · {order.status}</span>
              </Link>
            )) : <p className="text-sm text-slate-500">No MSO-assigned orders yet.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Recent Sales">
          <div className="grid gap-3">
            {recentSales.length ? recentSales.map((sale) => (
              <Link className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm hover:border-brand-200" href={`/field-sales/sales/${sale.id}`} key={sale.id}>
                <span className="font-bold text-slate-900">{sale.saleNumber}</span>
                <span className="mt-1 block text-slate-500">{sale.customer.name} · {sale.sku.name} · {formatPaymentMethod(sale.paymentMethod)}</span>
              </Link>
            )) : <p className="text-sm text-slate-500">No field sales have been closed yet.</p>}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

function TabSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="text-lg font-bold text-slate-950">{value}</span>
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
