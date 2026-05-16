import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyReturnReceiveActions } from "@/components/empty-return-receive-actions";
import { parseConditionLabel } from "@/lib/reverse-logistics";
import { prisma } from "@/lib/prisma";

export default async function EmptyReturnTransferDetailPage({ params }: { params: { id: string } }) {
  const movement = await prisma.inventoryMovement.findUnique({
    where: { id: params.id },
    include: {
      sku: true,
      sourceLocation: true,
      destinationLocation: true,
      cylinders: { include: { cylinder: true }, orderBy: { createdAt: "asc" } },
      historyEntries: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!movement) notFound();
  const codes = movement.cylinders.map((line) => line.cylinder.barcode ?? line.cylinder.serialNumber);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <Link className="text-sm font-semibold text-brand-700 hover:underline" href="/inventory/empty-return-transfers">Back to empty return transfers</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">{parseConditionLabel(movement.status)}</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">{movement.reference}</h1>
            <p className="mt-2 text-sm text-slate-600">{movement.sourceLocation?.name ?? "Selling point"} to {movement.destinationLocation?.name ?? "warehouse"}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p><span className="font-semibold">Dispatched:</span> {movement.dispatchedQuantity ?? 0}</p>
            <p><span className="font-semibold">Received:</span> {movement.receivedQuantity ?? 0}</p>
            <p><span className="font-semibold">Variance:</span> {movement.varianceQuantity ?? 0}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Info title="SKU" value={movement.sku.name} />
        <Info title="Vehicle" value={movement.vehicle ?? "-"} />
        <Info title="Driver / Sales Rep" value={movement.driverSalesRep ?? "-"} />
        <Info title="Route" value={movement.route ?? "-"} />
        <Info title="Dispatch Officer" value={movement.dispatchOfficerName ?? "-"} />
        <Info title="Receiving Officer" value={movement.receivingOfficerName ?? "-"} />
      </section>

      <EmptyReturnReceiveActions movementId={movement.id} defaultCodes={codes} status={movement.status} />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Returned empty scan list</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Barcode</th><th className="px-3 py-2">Serial</th><th className="px-3 py-2">Size</th><th className="px-3 py-2">Current Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {movement.cylinders.map((line) => <tr key={line.id}><td className="px-3 py-2 font-mono">{line.cylinder.barcode ?? "-"}</td><td className="px-3 py-2">{line.cylinder.serialNumber}</td><td className="px-3 py-2">{line.cylinder.cylinderSizeKg ?? "-"}kg</td><td className="px-3 py-2">{parseConditionLabel(line.cylinder.status)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Movement history</h2>
        <div className="mt-3 space-y-3">
          {movement.historyEntries.map((entry) => <div className="rounded-lg border border-slate-100 p-3 text-sm" key={entry.id}><p className="font-semibold text-slate-900">{entry.action}</p><p className="mt-1 text-slate-600">{entry.details}</p><p className="mt-1 text-xs text-slate-500">{entry.createdAt.toLocaleString("en-KE")}</p></div>)}
        </div>
      </section>
    </div>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-xs font-semibold uppercase text-slate-500">{title}</p><p className="mt-1 text-sm font-semibold text-slate-950">{value}</p></div>;
}
