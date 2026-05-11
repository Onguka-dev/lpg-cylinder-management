import { SellingPointDispatchForm } from "@/components/selling-point-dispatch-form";
import { prisma } from "@/lib/prisma";
import { getSellingPointLocations } from "@/lib/selling-point-distribution-posting";

export default async function NewSellingPointDispatchPage() {
  const { destinations } = await getSellingPointLocations(prisma);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Dispatch workflow</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">New selling point dispatch</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Scan filled-at-warehouse cylinders at Wandiege and hold them in transit until the destination confirms receipt.
        </p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <SellingPointDispatchForm destinations={destinations.map((destination) => ({ id: destination.id, code: destination.code, name: destination.name }))} />
      </section>
    </div>
  );
}
