import Link from "next/link";
import { notFound } from "next/navigation";
import { MasterDataForm } from "@/components/master-data-form";
import { fromSlug, getMasterDataConfig } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";

export default async function EditMasterDataRecordPage({
  params
}: {
  params: { type: string; id: string };
}) {
  const type = fromSlug(params.type);
  const config = type ? getMasterDataConfig(type) : null;

  if (!type || !config) {
    notFound();
  }

  const [record, parentOptions] = await Promise.all([
    prisma.masterDataRecord.findFirst({
      where: { id: params.id, type }
    }),
    config.parentTypes?.length
      ? prisma.masterDataRecord.findMany({
          where: { type: { in: config.parentTypes }, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, code: true, name: true }
        })
      : []
  ]);

  if (!record) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link className="text-sm font-medium text-brand-700" href={`/admin/master-data/${params.type}/${record.id}`}>
        Back to detail
      </Link>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Edit Master Data</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{record.name}</h1>
        <div className="mt-6">
          <MasterDataForm
            config={config}
            typeSlug={params.type}
            parentOptions={parentOptions}
            record={{
              id: record.id,
              code: record.code,
              name: record.name,
              description: record.description,
              amount: record.amount?.toString(),
              rate: record.rate?.toString(),
              capacityKg: record.capacityKg,
              threshold: record.threshold,
              parentId: record.parentId,
              isActive: record.isActive
            }}
          />
        </div>
      </section>
    </div>
  );
}
