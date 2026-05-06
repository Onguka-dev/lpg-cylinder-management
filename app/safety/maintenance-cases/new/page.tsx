import { redirect } from "next/navigation";
import { MaintenanceCaseForm } from "@/components/maintenance-case-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageSafety } from "@/lib/safety";
import { prisma } from "@/lib/prisma";

export default async function NewMaintenanceCasePage() {
  const session = await getCurrentSession();
  if (!session || !canManageSafety(session.user.role)) redirect("/unauthorized");
  const cylinders = await prisma.cylinder.findMany({ include: { sku: true, currentLocation: true }, orderBy: { updatedAt: "desc" }, take: 200 });
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 12</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Create Maintenance Case</h1>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel"><MaintenanceCaseForm cylinders={cylinders} /></section>
    </div>
  );
}
