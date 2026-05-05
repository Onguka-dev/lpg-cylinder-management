import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { canManageInventory, formatCylinderStatus } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function CylindersPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const session = await getCurrentSession();
  const query = searchParams?.q?.trim() ?? "";
  const canManage = session ? canManageInventory(session.user.role) : false;
  const cylinders = await prisma.cylinder.findMany({
    where: query
      ? {
          OR: [
            { serialNumber: { contains: query, mode: "insensitive" } },
            { barcode: { contains: query, mode: "insensitive" } },
            { sku: { name: { contains: query, mode: "insensitive" } } },
            { currentLocation: { name: { contains: query, mode: "insensitive" } } }
          ]
        }
      : undefined,
    include: { sku: true, currentLocation: true },
    orderBy: { updatedAt: "desc" },
    take: 150
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Inventory</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Cylinder Records</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Cylinder master records with serial number, barcode/RFID placeholder,
            SKU/size, dates, location, status, and audit history.
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/inventory/opening-balances/new">
              Opening Balance
            </Link>
            <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/inventory/cylinders/new">
              New Cylinder
            </Link>
          </div>
        ) : null}
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <label className="text-sm font-medium text-slate-700">
          Search cylinders
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" defaultValue={query} placeholder="Search serial, barcode, SKU, or location" />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
              Search
            </button>
          </div>
        </label>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Serial</th>
                <th className="px-4 py-3">Barcode/RFID</th>
                <th className="px-4 py-3">SKU/Size</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Inspection Due</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cylinders.map((cylinder) => (
                <tr key={cylinder.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{cylinder.serialNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{cylinder.barcode ?? "None"}</td>
                  <td className="px-4 py-3 text-slate-700">{cylinder.sku.name}</td>
                  <td className="px-4 py-3 text-slate-500">{cylinder.currentLocation.name}</td>
                  <td className="px-4 py-3 text-slate-500">{formatCylinderStatus(cylinder.status)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(cylinder.inspectionDueDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link className="font-medium text-brand-700" href={`/inventory/cylinders/${cylinder.id}`}>View</Link>
                      {canManage ? <Link className="font-medium text-slate-700" href={`/inventory/cylinders/${cylinder.id}/edit`}>Edit</Link> : null}
                    </div>
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

function formatDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "Not set";
}
