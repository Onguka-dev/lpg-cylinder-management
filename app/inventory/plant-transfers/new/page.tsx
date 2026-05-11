import { redirect } from "next/navigation";
import { PlantTransferForm } from "@/components/plant-transfer-form";
import { getCurrentSession } from "@/lib/auth";
import { canManagePlantTransfers } from "@/lib/plant-refill-workflow";

export default async function NewPlantTransferPage() {
  const session = await getCurrentSession();
  if (!session || !canManagePlantTransfers(session.user.role)) redirect("/unauthorized");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Transfer to plant</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Dispatch Empty Cylinders to Sabuni Road</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Only empty cylinders currently located at Wandiege Main Warehouse can be dispatched into this controlled in-transit workflow.
        </p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <PlantTransferForm />
      </section>
    </div>
  );
}
