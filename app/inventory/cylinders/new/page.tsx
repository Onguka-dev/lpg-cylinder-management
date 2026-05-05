import Link from "next/link";
import { redirect } from "next/navigation";
import { CylinderForm } from "@/components/cylinder-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageInventory, locationMasterTypes } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function NewCylinderPage() {
  const session = await getCurrentSession();

  if (!session || !canManageInventory(session.user.role)) {
    redirect("/unauthorized");
  }

  const [skus, locations] = await Promise.all([
    prisma.masterDataRecord.findMany({
      where: { type: "SKU_MASTER", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true }
    }),
    prisma.masterDataRecord.findMany({
      where: { type: { in: [...locationMasterTypes] }, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true }
    })
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link className="text-sm font-medium text-brand-700" href="/inventory/cylinders">Back to cylinders</Link>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Cylinder Record</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">New Cylinder</h1>
        <div className="mt-6">
          <CylinderForm skus={skus} locations={locations} />
        </div>
      </section>
    </div>
  );
}
