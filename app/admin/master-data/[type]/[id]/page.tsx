import Link from "next/link";
import { notFound } from "next/navigation";
import { MasterDataStatusButton } from "@/components/master-data-status-button";
import { fromSlug, getMasterDataConfig } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";

export default async function MasterDataDetailPage({
  params
}: {
  params: { type: string; id: string };
}) {
  const type = fromSlug(params.type);
  const config = type ? getMasterDataConfig(type) : null;

  if (!type || !config) {
    notFound();
  }

  const record = await prisma.masterDataRecord.findFirst({
    where: { id: params.id, type },
    include: { parent: true }
  });

  if (!record) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link className="text-sm font-medium text-brand-700" href={`/admin/master-data/${params.type}`}>
        Back to {config.pluralLabel}
      </Link>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">{config.label}</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">{record.name}</h1>
            <p className="mt-2 text-sm text-slate-500">{record.code}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              href={`/admin/master-data/${params.type}/${record.id}/edit`}
            >
              Edit
            </Link>
            <MasterDataStatusButton id={record.id} typeSlug={params.type} isActive={record.isActive} />
          </div>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <Detail label="Status" value={record.isActive ? "Active" : "Inactive"} />
          <Detail label="Related record" value={record.parent?.name ?? "None"} />
          <Detail label="Amount" value={record.amount?.toString() ?? "None"} />
          <Detail label="Rate" value={record.rate ? `${record.rate}%` : "None"} />
          <Detail label="Capacity" value={record.capacityKg ? `${record.capacityKg}kg` : "None"} />
          <Detail label="Threshold" value={record.threshold?.toString() ?? "None"} />
          <div className="sm:col-span-2">
            <Detail label="Description" value={record.description ?? "None"} />
          </div>
        </dl>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
