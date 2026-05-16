import { redirect } from "next/navigation";
import { EmptyReturnTransferForm } from "@/components/empty-return-transfer-form";
import { getCurrentSession } from "@/lib/auth";
import { canDispatchEmptyReturns } from "@/lib/reverse-logistics";
import { sellingPointDestinationCodes } from "@/lib/selling-point-distribution";
import { getReverseLogisticsLocations } from "@/lib/reverse-logistics-posting";
import { prisma } from "@/lib/prisma";

export default async function NewEmptyReturnTransferPage() {
  const session = await getCurrentSession();
  if (!session || !canDispatchEmptyReturns(session.user.role)) redirect("/unauthorized");
  const [{ warehouses }, sources] = await Promise.all([
    getReverseLogisticsLocations(prisma),
    prisma.masterDataRecord.findMany({ where: { code: { in: [...sellingPointDestinationCodes] }, isActive: true }, orderBy: { name: "asc" } })
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Reverse logistics</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Dispatch empty returns to warehouse</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Scan good-condition empties at the selling point and dispatch them to the regional warehouse for refill planning.</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <EmptyReturnTransferForm
          sources={sources.map((source) => ({ id: source.id, code: source.code, name: source.name }))}
          warehouses={warehouses.map((warehouse) => ({ id: warehouse.id, code: warehouse.code, name: warehouse.name }))}
          isAdmin={session.user.role === "ADMIN"}
        />
      </section>
    </div>
  );
}
