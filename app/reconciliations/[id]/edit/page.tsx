import { notFound, redirect } from "next/navigation";
import { ReconciliationForm } from "@/components/reconciliation-form";
import { getCurrentSession } from "@/lib/auth";
import { canCreateReconciliations } from "@/lib/reconciliations";
import { prisma } from "@/lib/prisma";

export default async function EditReconciliationPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session || !canCreateReconciliations(session.user.role)) redirect("/unauthorized");

  const reconciliation = await prisma.dailyReconciliation.findUnique({ where: { id: params.id } });
  if (!reconciliation) notFound();
  if (["RSO", "MSO"].includes(session.user.role) && reconciliation.ownerId !== session.user.id) redirect("/unauthorized");
  if (!["DRAFT", "RETURNED"].includes(reconciliation.status)) redirect(`/reconciliations/${reconciliation.id}`);

  const users = await prisma.user.findMany({
    where: { role: { name: { in: ["RSO", "MSO", "WAREHOUSE_MANAGER"] } } },
    include: { role: true, location: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 11</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Edit Reconciliation</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Draft and returned reconciliations can be corrected before approval. Approved records stay locked except by Admin override.</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <ReconciliationForm reconciliation={reconciliation} users={users} currentUserId={session.user.id} currentRole={session.user.role} />
      </section>
    </div>
  );
}
