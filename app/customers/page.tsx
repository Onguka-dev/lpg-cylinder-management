import Link from "next/link";
import { redirect } from "next/navigation";
import { RefillFollowUpReminderButton } from "@/components/refill-follow-up-reminder-button";
import { getCurrentSession } from "@/lib/auth";
import { canManageCustomers, canViewCustomers } from "@/lib/customers";
import { canCreateRefillFollowUpReminders, customerCustodyFilters, formatCustomerCustodyFilter, normalizeCustomerCustodyFilter } from "@/lib/customer-custody-intelligence";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage({
  searchParams
}: {
  searchParams?: { q?: string; filter?: string };
}) {
  const session = await getCurrentSession();
  if (!session || !canViewCustomers(session.user.role)) redirect("/unauthorized");
  const query = searchParams?.q?.trim() ?? "";
  const filter = normalizeCustomerCustodyFilter(searchParams?.filter);
  const now = new Date();
  const followUpWindowEnd = new Date(now);
  followUpWindowEnd.setDate(followUpWindowEnd.getDate() + 7);
  const highFrequencyCustomerIds = filter === "HIGH_FREQUENCY" ? await highFrequencyCustomerIdsForWindow() : null;
  const customers = await prisma.customer.findMany({
    where: {
      AND: [
        query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { proofReference: { contains: query, mode: "insensitive" } }
              ]
            }
          : {},
        filter === "OVERDUE_CYLINDERS"
          ? { cylinderCustodies: { some: { returnDate: null, expectedReturnFollowUpDate: { lt: now } } } }
          : {},
        filter === "INACTIVE_WITH_CYLINDERS"
          ? { status: { not: "ACTIVE" }, cylinderCustodies: { some: { returnDate: null } } }
          : {},
        filter === "DUE_REFILL_FOLLOW_UP"
          ? { cylinderCustodies: { some: { returnDate: null, expectedReturnFollowUpDate: { gte: now, lte: followUpWindowEnd } } } }
          : {},
        filter === "HIGH_FREQUENCY"
          ? { id: { in: highFrequencyCustomerIds ?? [] } }
          : {}
      ]
    },
    include: {
      _count: { select: { cylinderCustodies: true, refillOrders: true, fullCylinderSales: true } },
      cylinderCustodies: { where: { returnDate: null }, select: { id: true, expectedReturnFollowUpDate: true }, take: 5 }
    },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  const canManage = canManageCustomers(session.user.role);
  const canCreateReminders = canCreateRefillFollowUpReminders(session.user.role) && (filter === "DUE_REFILL_FOLLOW_UP" || filter === "OVERDUE_CYLINDERS");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Stage 3</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Customer Management</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Register, search, edit, and view customer profiles with cylinder custody follow-up and refill activity signals.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {canManage ? (
            <Link
              className="inline-flex justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              href="/customers/new"
            >
              Register Customer
            </Link>
          ) : null}
          {canCreateReminders ? <RefillFollowUpReminderButton filter={filter} /> : null}
        </div>
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="grid gap-3 md:grid-cols-[1fr_260px_auto]">
          <label className="text-sm font-medium text-slate-700">
          Search customers
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              name="q"
              defaultValue={query}
              placeholder="Search by name, phone, email, or ID/passport"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Filter
            <select className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="filter" defaultValue={filter}>
              {customerCustodyFilters.map((item) => <option value={item} key={item}>{formatCustomerCustodyFilter(item)}</option>)}
            </select>
          </label>
          <button className="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
            Apply
          </button>
        </div>
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
                <th className="px-4 py-3">Custody</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{customer.name}</td>
                  <td className="px-4 py-3 text-slate-700">{customer.phone}</td>
                  <td className="px-4 py-3 text-slate-700">{customer.email ?? customer.proofReference}</td>
                  <td className="px-4 py-3 text-slate-500">{formatEnum(customer.category)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatEnum(customer.status)}</td>
                  <td className="px-4 py-3 text-slate-500">{customer.cylinderCustodies.length} active / {customer._count.refillOrders + customer._count.fullCylinderSales} sales-refills</td>
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

async function highFrequencyCustomerIdsForWindow() {
  const start = new Date();
  start.setDate(start.getDate() - 90);
  const [refills, fullSales] = await Promise.all([
    prisma.refillOrder.groupBy({ by: ["customerId"], where: { createdAt: { gte: start } }, _count: { _all: true } }),
    prisma.fullCylinderSale.groupBy({ by: ["customerId"], where: { createdAt: { gte: start } }, _count: { _all: true } })
  ]);
  const counts = new Map<string, number>();
  for (const row of refills) counts.set(row.customerId, (counts.get(row.customerId) ?? 0) + row._count._all);
  for (const row of fullSales) counts.set(row.customerId, (counts.get(row.customerId) ?? 0) + row._count._all);
  return Array.from(counts.entries()).filter(([, count]) => count >= 3).map(([customerId]) => customerId);
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
