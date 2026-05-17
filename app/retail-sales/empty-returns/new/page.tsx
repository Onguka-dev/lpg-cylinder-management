import { redirect } from "next/navigation";
import { EmptyReturnForm } from "@/components/empty-return-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageEmptyReturns } from "@/lib/reverse-logistics";
import { sellingPointDestinationCodes } from "@/lib/selling-point-distribution";
import { prisma } from "@/lib/prisma";

export default async function NewEmptyReturnPage() {
  const session = await getCurrentSession();
  if (!session || !canManageEmptyReturns(session.user.role)) redirect("/unauthorized");
  const [customers, locations] = await Promise.all([
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 100 }),
    prisma.masterDataRecord.findMany({ where: { code: { in: [...sellingPointDestinationCodes] }, isActive: true }, orderBy: { name: "asc" } })
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Reverse logistics</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Customer empty return</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Close customer custody and classify returned empty cylinders before warehouse reverse transfer.</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <EmptyReturnForm
          customers={customers.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }))}
          locations={locations.map((location) => ({ id: location.id, code: location.code, name: location.name }))}
          isAdmin={session.user.role === "ADMIN"}
        />
      </section>
    </div>
  );
}
