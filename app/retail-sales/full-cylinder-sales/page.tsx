import Link from "next/link";
import { redirect } from "next/navigation";
import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_LOCALE } from "@/lib/currency";
import { getCurrentSession } from "@/lib/auth";
import { canManageFullCylinderSales, canViewFullCylinderSales } from "@/lib/full-cylinder-sales";
import { getSalesLocationForSession } from "@/lib/refill-sales-access";
import { prisma } from "@/lib/prisma";

export default async function FullCylinderSalesPage() {
  const session = await getCurrentSession();
  if (!session || !canViewFullCylinderSales(session.user.role)) redirect("/unauthorized");
  const locationId = session && ["RSO", "MSO", "SERVICE_CENTRE_STAFF"].includes(session.user.role)
    ? await getSalesLocationForSession(session).catch(() => null)
    : null;
  const sales = await prisma.fullCylinderSale.findMany({
    where: locationId ? { locationId } : {},
    include: { customer: true, sku: true, location: true, cylinder: true },
    orderBy: { createdAt: "desc" },
    take: 100
  }).catch(() => []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">Retail Sales</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Full cylinder plus gas sales</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Completed full cylinder sales with customer custody and scan audit.</p>
          </div>
          {canManageFullCylinderSales(session.user.role) ? (
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/retail-sales/pos">Open POS</Link>
              <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/retail-sales/full-cylinder-sales/new">New sale</Link>
            </div>
          ) : null}
        </div>
      </section>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Sale</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Cylinder</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-4 py-3 font-semibold text-brand-700">
                  <Link href={`/retail-sales/full-cylinder-sales/${sale.id}`}>{sale.saleNumber}</Link>
                </td>
                <td className="px-4 py-3">{sale.customer.name}</td>
                <td className="px-4 py-3">{sale.cylinder.barcode ?? sale.cylinder.serialNumber}</td>
                <td className="px-4 py-3">{sale.location.name}</td>
                <td className="px-4 py-3 text-right">{formatMoney(Number(sale.totalAmount))}</td>
              </tr>
            ))}
            {!sales.length ? <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No full cylinder sales yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(DEFAULT_CURRENCY_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(value);
}
