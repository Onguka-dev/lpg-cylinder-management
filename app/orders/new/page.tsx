import { redirect } from "next/navigation";
import { OrderForm } from "@/components/order-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageOrders } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export default async function NewOrderPage() {
  const session = await getCurrentSession();
  if (!session || !canManageOrders(session.user.role)) redirect("/unauthorized");
  const [customers, skus, zones] = await Promise.all([
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 150 }),
    prisma.masterDataRecord.findMany({ where: { type: "SKU_MASTER", isActive: true }, orderBy: { name: "asc" } }),
    prisma.masterDataRecord.findMany({ where: { type: "ZONE", isActive: true }, orderBy: { name: "asc" } })
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 7</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Create Order</h1>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <OrderForm customers={customers} skus={skus} zones={zones} />
      </section>
    </div>
  );
}
