import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewSupplierReceipts, formatSupplierReceiptCondition } from "@/lib/supplier-receipts";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();

  if (!session) return NextResponse.json({ error: "Sign in to export supplier receipts." }, { status: 401 });
  if (!canViewSupplierReceipts(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot export supplier receipts." }, { status: 403 });
  }

  const receipt = await prisma.supplierReceipt.findUnique({
    where: { id: params.id },
    include: { warehouse: true, lines: { include: { cylinder: true }, orderBy: { factorySerialNo: "asc" } } }
  });

  if (!receipt) return NextResponse.json({ error: "Supplier receipt not found." }, { status: 404 });

  const rows = [
    ["Receipt", receipt.reference],
    ["Warehouse", receipt.warehouse.name],
    ["Supplier/Manufacturer", receipt.supplierManufacturer],
    ["Purchase order/reference", receipt.purchaseOrderReference],
    ["Delivery note", receipt.deliveryNote ?? ""],
    ["Vehicle/truck", receipt.vehicleTruckNumber ?? ""],
    ["Status", receipt.status],
    [],
    ["Size Kg", "Factory Serial No", "Barcode/QR", "Manufacturer", "Manufacture Date", "Condition", "Cylinder Created"]
  ];

  receipt.lines.forEach((line) => {
    rows.push([
      String(line.cylinderSizeKg),
      line.factorySerialNo,
      line.barcode,
      line.manufacturer,
      line.manufactureDate ? line.manufactureDate.toISOString().slice(0, 10) : "",
      formatSupplierReceiptCondition(line.condition),
      line.cylinder?.serialNumber ?? ""
    ]);
  });

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${receipt.reference}-supplier-receipt.csv"`
    }
  });
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
