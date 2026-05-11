import Link from "next/link";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { SupplierReceiptActions } from "@/components/supplier-receipt-actions";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canManageSupplierReceipts,
  canViewSupplierReceipts,
  formatSupplierReceiptCondition,
  formatSupplierReceiptStatus
} from "@/lib/supplier-receipts";

export default async function SupplierReceiptDetailPage({
  params
}: {
  params: { id: string };
}) {
  const session = await getCurrentSession();
  if (!session || !canViewSupplierReceipts(session.user.role)) redirect("/unauthorized");

  const receipt = await prisma.supplierReceipt.findUnique({
    where: { id: params.id },
    include: {
      warehouse: true,
      createdBy: true,
      reviewedBy: true,
      postedBy: true,
      lines: {
        include: { cylinder: true, inventoryMovement: true },
        orderBy: [{ cylinderSizeKg: "asc" }, { factorySerialNo: "asc" }]
      }
    }
  });

  if (!receipt) redirect("/inventory/supplier-receipts");

  const totals = receipt.lines.reduce<Record<string, number>>((current, line) => {
    const key = `${line.cylinderSizeKg}kg ${formatSupplierReceiptCondition(line.condition)}`;
    current[key] = (current[key] ?? 0) + 1;
    return current;
  }, {});
  const canManage = canManageSupplierReceipts(session.user.role);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Supplier Receipt</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{receipt.reference}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {receipt.supplierManufacturer} into {receipt.warehouse.name}. Status: {formatSupplierReceiptStatus(receipt.status)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href={`/api/inventory/supplier-receipts/${receipt.id}/export`}>
            Export CSV
          </a>
          <PrintButton />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {Object.entries(totals).map(([label, count]) => (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel" key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{count}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <dl className="grid gap-4 text-sm md:grid-cols-3">
          <Info label="Warehouse" value={receipt.warehouse.name} />
          <Info label="Purchase Order / Reference" value={receipt.purchaseOrderReference} />
          <Info label="Delivery Note" value={receipt.deliveryNote ?? "Not recorded"} />
          <Info label="Vehicle / Truck" value={receipt.vehicleTruckNumber ?? "Not recorded"} />
          <Info label="Receipt Date" value={receipt.receiptDateTime.toLocaleString("en-KE")} />
          <Info label="Received By" value={receipt.receivedByName} />
          <Info label="Attachment Placeholder" value={receipt.attachmentPlaceholder ?? "Not recorded"} />
          <Info label="Created By" value={receipt.createdBy?.email ?? "System"} />
          <Info label="Posted By" value={receipt.postedBy?.email ?? "Not posted"} />
        </dl>
        {receipt.remarks ? <p className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{receipt.remarks}</p> : null}
        {canManage ? <div className="mt-5"><SupplierReceiptActions receiptId={receipt.id} status={receipt.status} /></div> : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Factory Serial</th>
                <th className="px-4 py-3">Barcode / QR</th>
                <th className="px-4 py-3">Manufacturer</th>
                <th className="px-4 py-3">Manufacture Date</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Cylinder</th>
                <th className="px-4 py-3">Movement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipt.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 text-slate-700">{line.cylinderSizeKg}kg</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{line.factorySerialNo}</td>
                  <td className="px-4 py-3 text-slate-700">{line.barcode}</td>
                  <td className="px-4 py-3 text-slate-700">{line.manufacturer}</td>
                  <td className="px-4 py-3 text-slate-500">{line.manufactureDate ? line.manufactureDate.toISOString().slice(0, 10) : "Not recorded"}</td>
                  <td className="px-4 py-3 text-slate-700">{formatSupplierReceiptCondition(line.condition)}</td>
                  <td className="px-4 py-3">
                    {line.cylinder ? <Link className="font-medium text-brand-700" href={`/inventory/cylinders/${line.cylinder.id}`}>{line.cylinder.serialNumber}</Link> : "Pending post"}
                  </td>
                  <td className="px-4 py-3">
                    {line.inventoryMovement ? <Link className="font-medium text-brand-700" href={`/inventory/movements/${line.inventoryMovement.id}`}>{line.inventoryMovement.reference}</Link> : "Pending post"}
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900">{value}</dd>
    </div>
  );
}
