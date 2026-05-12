import { SellingPointDispatchForm } from "@/components/selling-point-dispatch-form";
import { getCurrentSession } from "@/lib/auth";
import { getAssignedMasterLocationId } from "@/lib/inventory-movement-access";
import { prisma } from "@/lib/prisma";
import { getLocationRegion, getSellingPointLocations } from "@/lib/selling-point-distribution-posting";

export default async function NewSellingPointDispatchPage() {
  const session = await getCurrentSession();
  const assignedLocationId = session?.user.id ? await getAssignedMasterLocationId(session.user.id).catch(() => null) : null;
  const assignedLocation = assignedLocationId
    ? await prisma.masterDataRecord.findUnique({ where: { id: assignedLocationId } }).catch(() => null)
    : null;
  const { sources, destinations } = await getSellingPointLocations(prisma, {
    preferredRegion: assignedLocation ? getLocationRegion(assignedLocation) : null
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Dispatch workflow</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">New selling point dispatch</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Scan filled-at-warehouse cylinders from the selected regional source and hold them in transit until the destination confirms receipt.
          Nairobi dispatches use Lake Gas or Oilcom as the source and remain separate from Wandiege stock.
        </p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <SellingPointDispatchForm
          sources={sources.map((source) => ({ id: source.id, code: source.code, name: source.name }))}
          destinations={destinations.map((destination) => ({ id: destination.id, code: destination.code, name: destination.name }))}
        />
      </section>
    </div>
  );
}
