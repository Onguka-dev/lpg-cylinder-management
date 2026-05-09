import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Truck } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WarehouseMobileDispatchPage() {
  const session = await getCurrentSession();
  if (!session || !["ADMIN", "WAREHOUSE_MANAGER"].includes(session.user.role)) redirect("/unauthorized");

  const deliveries = await prisma.delivery.findMany({
    include: {
      order: { include: { customer: true, items: true, deliveryZone: true } },
      vehicle: true,
      zone: true,
      route: true
    },
    orderBy: { updatedAt: "desc" },
    take: 30
  });
  const counter = (statuses: string[]) => deliveries.filter((delivery) => statuses.includes(delivery.status)).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      <Header title="Dispatch / Loading Bay" />
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Counter label="Pending" value={counter(["ASSIGNED"])} />
        <Counter label="Loading" value={counter(["LOADING_CONFIRMED"])} />
        <Counter label="Dispatched" value={counter(["CUSTOMER_ARRIVAL"])} />
        <Counter label="Delivered" value={counter(["DELIVERED"])} />
      </section>
      <SectionCard title="Dispatch cards" description="Delivery Management remains the source of truth for status changes and POD.">
        <div className="space-y-3">
          {deliveries.map((delivery) => (
            <Link className="block rounded-2xl border border-slate-200 bg-slate-50 p-4" href={`/deliveries/${delivery.id}`} key={delivery.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <Truck size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-950">{delivery.deliveryNumber}</p>
                    <p className="mt-1 text-sm text-slate-500">Truck: {delivery.vehicle?.name ?? "Not assigned"} · Driver: {delivery.driverName ?? "Pending"}</p>
                    <p className="mt-1 text-sm text-slate-500">Destination: {delivery.zone?.name ?? delivery.order.deliveryZone?.name ?? "Zone placeholder"}</p>
                  </div>
                </div>
                <StatusBadge tone={delivery.status === "DELIVERED" ? "success" : "info"}>{delivery.status.replaceAll("_", " ")}</StatusBadge>
              </div>
              <p className="mt-3 text-sm text-slate-500">Cylinders: {delivery.order.items.reduce((sum, item) => sum + item.quantity, 0)} · ETA placeholder</p>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white" href="/warehouse/mobile">
        <ArrowLeft size={18} aria-hidden="true" />
      </Link>
      <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
