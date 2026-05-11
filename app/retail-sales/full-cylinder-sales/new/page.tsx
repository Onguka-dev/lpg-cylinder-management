import { redirect } from "next/navigation";
import { FullCylinderSaleForm } from "@/components/full-cylinder-sale-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageFullCylinderSales } from "@/lib/full-cylinder-sales";
import { locationMasterTypes } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function NewFullCylinderSalePage() {
  const session = await getCurrentSession();
  if (!session || !canManageFullCylinderSales(session.user.role)) redirect("/unauthorized");

  const [customers, locations] = await Promise.all([
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 100 }),
    prisma.masterDataRecord.findMany({ where: { type: { in: [...locationMasterTypes] }, isActive: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Full cylinder plus gas</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Register customer and scan full cylinder</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Register or select a customer, scan a full cylinder at the selling point, take payment, and place the cylinder into customer custody.
        </p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <FullCylinderSaleForm customers={customers} locations={locations} isAdmin={session.user.role === "ADMIN"} />
      </section>
    </div>
  );
}
