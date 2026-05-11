import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canManageSupplierReceipts,
  canViewSupplierReceipts,
  formatSupplierReceiptStatus
} from "@/lib/supplier-receipts";

export default async function SupplierReceiptsPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const session = await getCurrentSession();
  if (!session || !canViewSupplierReceipts(session.user.role)) redirect("/unauthorized");

  const query = searchParams?.q?.trim() ?? "";
  const receipts = await prisma.supplierReceipt.findMany({
    where: query
      ? {
          OR: [
            { reference: { contains: query, mode: "insensitive" } },
            { supplierManufacturer: { contains: query, mode: "insensitive" } },
            { purchaseOrderReference: { contains: query, mode: "insensitive" } },
            { warehouse: { name: { contains: query, mode: "insensitive" } } }
          ]
        }
      : undefined,
    include: { warehouse: true, createdBy: true, _count: { select: { lines: true } } },
    orderBy: { updatedAt: "desc" },
    take: 150
  }).catch(() => []);
  const canManage = canManageSupplierReceipts(session.user.role);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Stage 5</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Supplier Receipts</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Receive purchased cylinders into Wandiege Main Warehouse, Lake Gas Nairobi Warehouse, or Oilcom Nairobi Warehouse.
            Drafts and reviewed receipts do not affect stock until posted.
          </p>
        </div>
        {canManage ? (
          <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/inventory/supplier-receipts/new">
            New Supplier Receipt
          </Link>
        ) : null}
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <label className="text-sm font-medium text-slate-700">
          Search supplier receipts
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" defaultValue={query} placeholder="Search reference, supplier, PO, or warehouse" />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Search</button>
          </div>
        </label>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">PO / Delivery</th>
                <th className="px-4 py-3">Lines</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!receipts.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={7}>No supplier receipts yet.</td>
                </tr>
              ) : null}
              {receipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{receipt.reference}</td>
                  <td className="px-4 py-3 text-slate-700">{receipt.warehouse.name}</td>
                  <td className="px-4 py-3 text-slate-700">{receipt.supplierManufacturer}</td>
                  <td className="px-4 py-3 text-slate-500">{receipt.purchaseOrderReference}{receipt.deliveryNote ? ` / ${receipt.deliveryNote}` : ""}</td>
                  <td className="px-4 py-3 text-slate-700">{receipt._count.lines}</td>
                  <td className="px-4 py-3 text-slate-700">{formatSupplierReceiptStatus(receipt.status)}</td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-brand-700" href={`/inventory/supplier-receipts/${receipt.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
