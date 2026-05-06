import { redirect } from "next/navigation";
import { InvoiceForm } from "@/components/invoice-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageBilling } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export default async function NewInvoicePage() {
  const session = await getCurrentSession();
  if (!session || !canManageBilling(session.user.role)) redirect("/unauthorized");

  const [orders, refills] = await Promise.all([
    prisma.customerOrder.findMany({
      where: { status: { in: ["DELIVERED", "CLOSED"] }, invoice: null },
      include: { customer: true },
      orderBy: { updatedAt: "desc" },
      take: 100
    }),
    prisma.refillOrder.findMany({
      where: { status: "CLOSED", invoice: null },
      include: { customer: true },
      orderBy: { updatedAt: "desc" },
      take: 100
    })
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 10</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Generate Invoice</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Generate invoices from delivered orders or confirmed retail sales. Live payment gateway integration remains a placeholder.
        </p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <InvoiceForm
          orders={orders.map((order) => ({ id: order.id, label: `${order.orderNumber} - ${order.customer.name}` }))}
          refills={refills.map((refill) => ({ id: refill.id, label: `${refill.orderNumber} - ${refill.customer.name}` }))}
        />
      </section>
    </div>
  );
}
