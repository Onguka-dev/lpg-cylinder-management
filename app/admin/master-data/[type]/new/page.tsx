import Link from "next/link";
import { notFound } from "next/navigation";
import { MasterDataForm } from "@/components/master-data-form";
import { fromSlug, getMasterDataConfig } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";

export default async function NewMasterDataRecordPage({
  params
}: {
  params: { type: string };
}) {
  const type = fromSlug(params.type);
  const config = type ? getMasterDataConfig(type) : null;

  if (!type || !config) {
    notFound();
  }

  const parentOptions = config.parentTypes?.length
    ? await prisma.masterDataRecord.findMany({
        where: { type: { in: config.parentTypes }, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, code: true, name: true }
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link className="text-sm font-medium text-brand-700" href={`/admin/master-data/${params.type}`}>
        Back to {config.pluralLabel}
      </Link>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Create Master Data</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">New {config.label}</h1>
        <div className="mt-6">
          <MasterDataForm config={config} typeSlug={params.type} parentOptions={parentOptions} />
        </div>
      </section>
    </div>
  );
}
