import { redirect } from "next/navigation";
import { SafetyIncidentForm } from "@/components/safety-incident-form";
import { getCurrentSession } from "@/lib/auth";
import { locationMasterTypes } from "@/lib/inventory";
import { canManageSafety } from "@/lib/safety";
import { prisma } from "@/lib/prisma";

export default async function NewSafetyIncidentPage() {
  const session = await getCurrentSession();
  if (!session || !canManageSafety(session.user.role)) redirect("/unauthorized");
  const [cylinders, locations] = await Promise.all([
    prisma.cylinder.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, serialNumber: true }, take: 200 }),
    prisma.masterDataRecord.findMany({ where: { type: { in: [...locationMasterTypes] }, isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } })
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 12</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Log Safety Incident</h1>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel"><SafetyIncidentForm cylinders={cylinders} locations={locations} /></section>
    </div>
  );
}
