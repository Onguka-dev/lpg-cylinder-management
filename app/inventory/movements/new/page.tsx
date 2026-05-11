import { redirect } from "next/navigation";
import { InventoryMovementForm } from "@/components/inventory-movement-form";
import { getCurrentSession } from "@/lib/auth";
import { getAssignedMasterLocationId } from "@/lib/inventory-movement-access";
import { canRequestInventoryMovements } from "@/lib/inventory-movements";
import { locationMasterTypes } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function NewInventoryMovementPage() {
  const session = await getCurrentSession();

  if (!session || !canRequestInventoryMovements(session.user.role)) {
    redirect("/unauthorized");
  }

  const [skus, locations] = await Promise.all([
    prisma.masterDataRecord.findMany({
      where: { type: "SKU_MASTER", isActive: true },
      orderBy: { name: "asc" }
    }),
    prisma.masterDataRecord.findMany({
      where: { type: { in: [...locationMasterTypes] }, isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    })
  ]);
  const assignedLocationId =
    session.user.role === "RSO" || session.user.role === "MSO" || session.user.role === "SERVICE_CENTRE_STAFF"
      ? await getAssignedMasterLocationId(session.user.id)
      : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 5</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Request Inventory Movement</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Create a movement request for approval. RSO/MSO users are restricted
          to movements touching their assigned location.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <InventoryMovementForm
          skus={skus}
          locations={locations}
          assignedLocationId={assignedLocationId}
          restrictToAssignedLocation={session.user.role === "RSO" || session.user.role === "MSO" || session.user.role === "SERVICE_CENTRE_STAFF"}
        />
      </section>
    </div>
  );
}
