import { redirect } from "next/navigation";
import { ReconciliationForm } from "@/components/reconciliation-form";
import { getCurrentSession } from "@/lib/auth";
import { canCreateReconciliations } from "@/lib/reconciliations";
import { prisma } from "@/lib/prisma";

export default async function NewReconciliationPage() {
  const session = await getCurrentSession();
  if (!session || !canCreateReconciliations(session.user.role)) redirect("/unauthorized");

  const users = await prisma.user.findMany({
    where: { role: { name: { in: ["RSO", "MSO", "WAREHOUSE_MANAGER"] } } },
    include: { role: true, location: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 11</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">New Close-of-Day Reconciliation</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">The system calculates expected stock and collection figures. Enter actual closing counts and cash received.</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <ReconciliationForm users={users} currentUserId={session.user.id} currentRole={session.user.role} />
      </section>
    </div>
  );
}
