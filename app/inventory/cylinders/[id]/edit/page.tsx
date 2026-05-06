import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CylinderForm } from "@/components/cylinder-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageInventory, locationMasterTypes } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function EditCylinderPage({
  params
}: {
  params: { id: string };
}) {
  const session = await getCurrentSession();

  if (!session || !canManageInventory(session.user.role)) {
    redirect("/unauthorized");
  }

  const [cylinder, skus, locations] = await Promise.all([
    prisma.cylinder.findUnique({ where: { id: params.id } }),
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

  if (!cylinder) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link className="text-sm font-medium text-brand-700" href={`/inventory/cylinders/${cylinder.id}`}>Back to cylinder</Link>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Edit Cylinder</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{cylinder.serialNumber}</h1>
        <div className="mt-6">
          <CylinderForm
            skus={skus}
            locations={locations}
            cylinder={{
              id: cylinder.id,
              serialNumber: cylinder.serialNumber,
              barcode: cylinder.barcode,
              skuId: cylinder.skuId,
              manufactureDate: cylinder.manufactureDate?.toISOString().slice(0, 10),
              inspectionDueDate: cylinder.inspectionDueDate?.toISOString().slice(0, 10),
              expiryDate: cylinder.expiryDate?.toISOString().slice(0, 10),
              hydroTestDueDate: cylinder.hydroTestDueDate?.toISOString().slice(0, 10),
              unsafeStatus: cylinder.unsafeStatus,
              quarantinedStatus: cylinder.quarantinedStatus,
              maintenanceStatus: cylinder.maintenanceStatus,
              currentLocationId: cylinder.currentLocationId,
              status: cylinder.status,
              notes: cylinder.notes
            }}
          />
        </div>
      </section>
    </div>
  );
}
