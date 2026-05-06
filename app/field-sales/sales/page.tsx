import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { canManageFieldSales, canViewFieldSales, formatFieldDeliveryStatus } from "@/lib/field-sales";
import { getFieldAssignment } from "@/lib/field-sales-access";
import { formatPaymentMethod } from "@/lib/refill-sales";
import { prisma } from "@/lib/prisma";

export default async function FieldSaleListPage({ searchParams }: { searchParams?: { q?: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewFieldSales(session.user.role)) redirect("/unauthorized");

  const query = searchParams?.q?.trim() ?? "";
  const assignment = await getFieldAssignment();
  const vehicleId = session.user.role === "MSO" ? assignment.vehicle?.id : undefined;
  const sales = await prisma.fieldSale.findMany({
    where: {
      AND: [
        vehicleId ? { vehicleId } : {},
        query
          ? {
              OR: [
                { saleNumber: { contains: query, mode: "insensitive" } },
                { customer: { name: { contains: query, mode: "insensitive" } } },
                { customer: { phone: { contains: query, mode: "insensitive" } } }
              ]
            }
          : {}
      ]
    },
    include: { customer: true, sku: true, vehicle: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Stage 8</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Field Sale History</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Closed MSO sales, delivery status placeholders, and discrepancy reports.</p>
        </div>
        {canManageFieldSales(session.user.role) ? <Link className="rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white" href="/field-sales/sales/new">New sale</Link> : null}
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <label className="text-sm font-medium text-slate-700">
          Search field sales
          <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="q" defaultValue={query} placeholder="Sale number, customer, or phone" />
            <button className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">Search</button>
          </div>
        </label>
      </form>

      <section className="grid gap-3">
        {sales.map((sale) => (
          <Link className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel hover:border-brand-200 hover:bg-brand-50" href={`/field-sales/sales/${sale.id}`} key={sale.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{sale.saleNumber}</p>
                <p className="mt-1 text-sm text-slate-500">{sale.customer.name} - {sale.sku.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:text-right">
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{formatPaymentMethod(sale.paymentMethod)}</span>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{formatFieldDeliveryStatus(sale.deliveryStatus)}</span>
              </div>
            </div>
          </Link>
        ))}
        {!sales.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No field sales found.</p> : null}
      </section>
    </div>
  );
}
