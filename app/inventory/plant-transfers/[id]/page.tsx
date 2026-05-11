import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PlantTransferActions } from "@/components/plant-transfer-actions";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePlantTransfers, canViewPlantTransfers, formatPlantWorkflowLabel } from "@/lib/plant-refill-workflow";

export default async function PlantTransferDetailPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewPlantTransfers(session.user.role)) redirect("/unauthorized");

  const transfer = await prisma.plantTransfer.findUnique({
    where: { id: params.id },
    include: {
      sourceLocation: true,
      plantLocation: true,
      returnDestination: true,
      lines: { include: { cylinder: { include: { sku: true, currentLocation: true } } }, orderBy: { createdAt: "asc" } },
      refillBatches: { include: { lines: true }, orderBy: { createdAt: "desc" } },
      varianceCases: { include: { cylinder: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!transfer) redirect("/inventory/plant-transfers");

  const receivedLineIds = transfer.lines.filter((line) => line.status === "RECEIVED_AT_PLANT").map((line) => line.id);
  const refilledCodes = transfer.lines
    .filter((line) => line.cylinder.status === "FILLED_IN_TRANSIT")
    .map((line) => line.cylinder.barcode ?? line.cylinder.serialNumber);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Plant Transfer</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{transfer.reference}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {transfer.sourceLocation.name} to {transfer.plantLocation.name}, returning to {transfer.returnDestination.name}. Status: {formatPlantWorkflowLabel(transfer.status)}.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Summary label="Cylinders" value={String(transfer.lines.length)} />
        <Summary label="Received at Plant" value={String(transfer.lines.filter((line) => line.status === "RECEIVED_AT_PLANT" || line.status === "REFILLED" || line.status === "RETURNED_TO_WAREHOUSE").length)} />
        <Summary label="Refill Batches" value={String(transfer.refillBatches.length)} />
        <Summary label="Variance Cases" value={String(transfer.varianceCases.length)} />
      </section>

      {canManagePlantTransfers(session.user.role) ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <PlantTransferActions transferId={transfer.id} receivedLineIds={receivedLineIds} refilledCodes={refilledCodes} status={transfer.status} />
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Cylinder</th>
                <th className="px-4 py-3">Barcode</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Line Status</th>
                <th className="px-4 py-3">Cylinder Status</th>
                <th className="px-4 py-3">Current Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfer.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{line.cylinder.serialNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{line.cylinder.barcode ?? "No barcode"}</td>
                  <td className="px-4 py-3 text-slate-700">{line.cylinder.sku.name}</td>
                  <td className="px-4 py-3 text-slate-700">{formatPlantWorkflowLabel(line.status)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatPlantWorkflowLabel(line.cylinder.status)}</td>
                  <td className="px-4 py-3 text-slate-700">{line.cylinder.currentLocation.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Refill Batches">
          <Simple rows={transfer.refillBatches.map((batch) => [batch.reference, formatPlantWorkflowLabel(batch.status), formatPlantWorkflowLabel(batch.qualityInspectionStatus), String(batch.lines.length)])} headers={["Reference", "Status", "Quality", "Lines"]} />
        </Panel>
        <Panel title="Variance Cases">
          <Simple rows={transfer.varianceCases.map((variance) => [variance.reference, formatPlantWorkflowLabel(variance.type), formatPlantWorkflowLabel(variance.status), variance.cylinder?.serialNumber ?? "No cylinder", variance.details])} headers={["Reference", "Type", "Status", "Cylinder", "Details"]} />
        </Panel>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel"><h2 className="text-base font-semibold text-slate-950">{title}</h2><div className="mt-4">{children}</div></section>;
}

function Simple({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr>{headers.map((header) => <th className="px-3 py-2" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td className="px-3 py-2 text-slate-600" key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>) : <tr><td className="px-3 py-4 text-slate-500" colSpan={headers.length}>No records found.</td></tr>}</tbody></table></div>;
}
