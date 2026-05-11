import { redirect } from "next/navigation";
import { SupplierReceiptForm } from "@/components/supplier-receipt-form";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageSupplierReceipts, supplierReceiptWarehouseCodes } from "@/lib/supplier-receipts";

export default async function NewSupplierReceiptPage() {
  const session = await getCurrentSession();
  if (!session || !canManageSupplierReceipts(session.user.role)) redirect("/unauthorized");

  const warehouses = await prisma.masterDataRecord.findMany({
    where: {
      type: "WAREHOUSE",
      isActive: true,
      code: { in: supplierReceiptWarehouseCodes as unknown as string[] }
    },
    orderBy: { name: "asc" }
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Supplier receipt</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Receive Purchased Cylinders</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Capture supplier/manufacturer receipts, validate serials and barcodes, and post received cylinders into warehouse stock.
        </p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <SupplierReceiptForm
          warehouses={warehouses.map((warehouse) => ({
            id: warehouse.id,
            code: warehouse.code,
            name: warehouse.name
          }))}
          receivedByName={session.user.name}
        />
      </section>
    </div>
  );
}
