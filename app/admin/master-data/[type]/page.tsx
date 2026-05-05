import Link from "next/link";
import { notFound } from "next/navigation";
import { fromSlug, getMasterDataConfig } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";

export default async function MasterDataTypePage({
  params
}: {
  params: { type: string };
}) {
  const type = fromSlug(params.type);
  const config = type ? getMasterDataConfig(type) : null;

  if (!type || !config) {
    notFound();
  }

  const records = await prisma.masterDataRecord.findMany({
    where: { type },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { parent: true }
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Master Data</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{config.pluralLabel}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{config.description}</p>
        </div>
        <Link
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          href={`/admin/master-data/${params.type}/new`}
        >
          Create {config.label}
        </Link>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Related</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{record.code}</td>
                  <td className="px-4 py-3 text-slate-700">{record.name}</td>
                  <td className="px-4 py-3 text-slate-500">{record.parent?.name ?? "None"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatRecordValue(record)}</td>
                  <td className="px-4 py-3">
                    <span className={record.isActive ? "text-green-700" : "text-slate-500"}>
                      {record.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link className="font-medium text-brand-700" href={`/admin/master-data/${params.type}/${record.id}`}>
                        View
                      </Link>
                      <Link className="font-medium text-slate-700" href={`/admin/master-data/${params.type}/${record.id}/edit`}>
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatRecordValue(record: {
  amount: unknown;
  rate: unknown;
  capacityKg: number | null;
  threshold: number | null;
}) {
  if (record.amount) return `Amount ${record.amount}`;
  if (record.rate) return `${record.rate}%`;
  if (record.capacityKg) return `${record.capacityKg}kg`;
  if (record.threshold !== null) return `Threshold ${record.threshold}`;
  return "None";
}
