import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  CreditCard,
  MessageSquareWarning,
  PackagePlus,
  Plus,
  ReceiptText,
  RefreshCw,
  Smartphone,
  UserPlus
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_LOCALE } from "@/lib/currency";
import { getCurrentSession } from "@/lib/auth";
import { getAssignedMasterLocationId } from "@/lib/inventory-movement-access";
import { prisma } from "@/lib/prisma";

export default async function RetailSalesPage() {
  const session = await getCurrentSession();
  const assignedLocationId =
    session?.user.role === "RSO" || session?.user.role === "MSO" || session?.user.role === "SERVICE_CENTRE_STAFF"
      ? await getAssignedMasterLocationId(session.user.id).catch(() => null)
      : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    assignedLocation,
    todayRefills,
    newCustomers,
    todaysSales,
    stockByStatus,
    pendingTransfers,
    complaints,
    skus
  ] = await Promise.all([
    assignedLocationId ? prisma.masterDataRecord.findUnique({ where: { id: assignedLocationId } }).catch(() => null) : null,
    prisma.refillOrder.count({
      where: {
        createdAt: { gte: today },
        ...(assignedLocationId ? { locationId: assignedLocationId } : {})
      }
    }).catch(() => 0),
    prisma.customer.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
    prisma.refillOrder.aggregate({
      where: {
        createdAt: { gte: today },
        ...(assignedLocationId ? { locationId: assignedLocationId } : {})
      },
      _sum: { totalAmount: true }
    }).catch(() => ({ _sum: { totalAmount: 0 } })),
    prisma.cylinder.groupBy({
      by: ["skuId", "status"],
      where: assignedLocationId ? { currentLocationId: assignedLocationId } : undefined,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } }
    }).catch(() => []),
    prisma.inventoryMovement.count({
      where: {
        status: { in: ["REQUESTED", "APPROVED", "DISPATCHED", "VARIANCE_LOGGED"] },
        ...(assignedLocationId
          ? { OR: [{ sourceLocationId: assignedLocationId }, { destinationLocationId: assignedLocationId }] }
          : {})
      }
    }).catch(() => 0),
    prisma.customerComplaint.count({
      where: {
        status: { in: ["SUBMITTED", "IN_REVIEW", "ESCALATED"] },
        ...(assignedLocationId ? { locationId: assignedLocationId } : {})
      }
    }).catch(() => 0),
    prisma.masterDataRecord.findMany({
      where: { type: "SKU_MASTER", isActive: true },
      orderBy: { name: "asc" }
    }).catch(() => [])
  ]);

  const salesAmount = Number(todaysSales._sum.totalAmount ?? 0);
  const stockOnHand = stockByStatus.reduce((sum, row) => sum + row._count.id, 0);
  const filledStock = stockByStatus.filter((row) => row.status === "FILLED").reduce((sum, row) => sum + row._count.id, 0);
  const emptyStock = stockByStatus.filter((row) => row.status === "EMPTY").reduce((sum, row) => sum + row._count.id, 0);

  const quickActions = [
    { label: "New Refill", href: "/retail-sales/refills/new", icon: ReceiptText, primary: true },
    { label: "New Customer", href: "/customers/new", icon: UserPlus },
    { label: "Stock Transfer", href: "/inventory/movements/new", icon: RefreshCw },
    { label: "Goods Receipt", href: "/warehouse/incoming", icon: ArrowDownToLine },
    { label: "Customer Complaint", href: "/retail-sales/complaints/new", icon: MessageSquareWarning },
    { label: "Escalate Issue", href: "/retail-sales/complaints/new", icon: AlertTriangle }
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-24 sm:space-y-6 sm:pb-0">
      <PageHeader
        eyebrow="Retail Point Sales"
        title="Retail sales workspace"
        description={`POS workspace for ${assignedLocation?.name ?? "assigned retail point"}. Walk-in refills, customer registration, payment capture and stock requests stay connected to existing workflows.`}
        actions={<StatusBadge tone="success">Online</StatusBadge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ReceiptText} label="Today's Refills" value={todayRefills.toLocaleString()} detail="Closed walk-in refill transactions" tone="brand" />
        <MetricCard icon={UserPlus} label="New Customers" value={newCustomers.toLocaleString()} detail="Registered today" tone="success" />
        <MetricCard icon={CreditCard} label="Sales Value" value={formatMoney(salesAmount)} detail="Today's retail refill sales" tone="info" />
        <MetricCard icon={PackagePlus} label="Stock On Hand" value={stockOnHand.toLocaleString()} detail={`${filledStock} filled / ${emptyStock} empty`} tone={filledStock <= 5 ? "warning" : "success"} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CompactStat label="Pending transfers" value={pendingTransfers} tone={pendingTransfers ? "warning" : "success"} />
        <CompactStat label="Complaints" value={complaints} tone={complaints ? "danger" : "success"} />
        <CompactStat label="Filled stock" value={filledStock} tone={filledStock <= 5 ? "warning" : "success"} />
        <CompactStat label="Empty returns" value={emptyStock} tone="info" />
      </section>

      <SectionCard title="Quick actions" description="Large touch targets for common RSO counter tasks.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                className={action.primary
                  ? "rounded-2xl bg-brand-600 p-4 text-white shadow-panel"
                  : "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800 shadow-sm hover:border-brand-200"}
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

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Inventory overview" description="Outlet stock by SKU with filled and empty visibility.">
          <div className="space-y-3">
            {skus.map((sku) => {
              const filled = stockByStatus.find((row) => row.skuId === sku.id && row.status === "FILLED")?._count.id ?? 0;
              const empty = stockByStatus.find((row) => row.skuId === sku.id && row.status === "EMPTY")?._count.id ?? 0;
              return (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={sku.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{sku.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{sku.code}</p>
                    </div>
                    <StatusBadge tone={filled <= 5 ? "warning" : "success"}>{filled <= 5 ? "Low stock" : "OK"}</StatusBadge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-slate-500">Filled</p>
                      <p className="mt-1 text-2xl font-bold text-slate-950">{filled}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-slate-500">Empty</p>
                      <p className="mt-1 text-2xl font-bold text-slate-950">{empty}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Payment readiness" description="Counter payment options for refill checkout.">
          <div className="space-y-3">
            {["Cash", "Mobile money / Mpesa placeholder", "Card placeholder"].map((method) => (
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4" key={method}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Smartphone size={18} aria-hidden="true" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">{method}</p>
                </div>
                <StatusBadge tone="success">Ready</StatusBadge>
              </div>
            ))}
            <Link className="block rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-4 text-sm font-bold text-brand-800" href="/retail-sales/refills">
              View refill invoices and receipts
            </Link>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

function CompactStat({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "danger" | "info" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <StatusBadge tone={tone}>{value.toLocaleString()}</StatusBadge>
      </div>
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
