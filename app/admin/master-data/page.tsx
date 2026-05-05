import Link from "next/link";
import { masterDataConfigs, toSlug } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";

export default async function MasterDataPage() {
  const counts = await prisma.masterDataRecord.groupBy({
    by: ["type", "isActive"],
    _count: { id: true }
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 2</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Master Data Configuration</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Admin-only setup records for SKUs, pricing, taxes, operating locations,
          vehicles, and stock thresholds. These records are selectable foundations
          for later modules; sales and inventory movement workflows are not built here.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {masterDataConfigs.map((config) => {
          const total = counts
            .filter((count) => count.type === config.type)
            .reduce((sum, count) => sum + count._count.id, 0);
          const active = counts
            .filter((count) => count.type === config.type && count.isActive)
            .reduce((sum, count) => sum + count._count.id, 0);

          return (
            <Link
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel hover:border-brand-200 hover:bg-brand-50"
              href={`/admin/master-data/${toSlug(config.type)}`}
              key={config.type}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">{config.pluralLabel}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{config.description}</p>
                </div>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                  {active}/{total}
                </span>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
