import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { canManageCustomers } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const session = await getCurrentSession();
  const query = searchParams?.q?.trim() ?? "";
  const customers = await prisma.customer.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
            { proofReference: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  const canManage = session ? canManageCustomers(session.user.role) : false;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Stage 3</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Customer Management</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Register, search, edit, and view customer profiles. Orders, payments,
            complaints, and service history remain placeholders on the profile.
          </p>
        </div>
        {canManage ? (
          <Link
            className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            href="/customers/new"
          >
            Register Customer
          </Link>
        ) : null}
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <label className="text-sm font-medium text-slate-700">
          Search customers
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              name="q"
              defaultValue={query}
              placeholder="Search by name, phone, or ID/passport"
            />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
              Search
            </button>
          </div>
        </label>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Proof Reference</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{customer.name}</td>
                  <td className="px-4 py-3 text-slate-700">{customer.phone}</td>
                  <td className="px-4 py-3 text-slate-700">{customer.proofReference}</td>
                  <td className="px-4 py-3 text-slate-500">{formatEnum(customer.category)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatEnum(customer.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link className="font-medium text-brand-700" href={`/customers/${customer.id}`}>
                        View
                      </Link>
                      {canManage ? (
                        <Link className="font-medium text-slate-700" href={`/customers/${customer.id}/edit`}>
                          Edit
                        </Link>
                      ) : null}
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

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
