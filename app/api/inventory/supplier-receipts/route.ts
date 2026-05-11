import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  canManageSupplierReceipts,
  canViewSupplierReceipts,
  normalizeSupplierReceiptInput,
  supplierReceiptSchema,
  supplierReceiptWarehouseCodes,
  validateReceiptLineDuplicates
} from "@/lib/supplier-receipts";
import {
  assertSupplierReceiptNoStoredDuplicates,
  postSupplierReceipt,
  receiptSummaryMetadata
} from "@/lib/supplier-receipt-posting";

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session) return NextResponse.json({ error: "Sign in to view supplier receipts." }, { status: 401 });
  if (!canViewSupplierReceipts(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot view supplier receipts." }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const receipts = await prisma.supplierReceipt.findMany({
    where: query
      ? {
          OR: [
            { reference: { contains: query, mode: "insensitive" } },
            { supplierManufacturer: { contains: query, mode: "insensitive" } },
            { purchaseOrderReference: { contains: query, mode: "insensitive" } },
            { warehouse: { name: { contains: query, mode: "insensitive" } } }
          ]
        }
      : undefined,
    include: { warehouse: true, createdBy: true, _count: { select: { lines: true } } },
    orderBy: { updatedAt: "desc" },
    take: 150
  });

  return NextResponse.json({ receipts });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) return NextResponse.json({ error: "Sign in to create supplier receipts." }, { status: 401 });
  if (!canManageSupplierReceipts(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot create supplier receipts." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = supplierReceiptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the supplier receipt form and try again." },
      { status: 400 }
    );
  }

  const data = normalizeSupplierReceiptInput(parsed.data);
  const duplicateInReceipt = validateReceiptLineDuplicates(data.lines);

  if (duplicateInReceipt) {
    return NextResponse.json({ error: duplicateInReceipt }, { status: 409 });
  }

  const allowedWarehouse = await prisma.masterDataRecord.findFirst({
    where: {
      id: data.warehouseId,
      type: "WAREHOUSE",
      isActive: true,
      code: { in: supplierReceiptWarehouseCodes as unknown as string[] }
    }
  });

  if (!allowedWarehouse) {
    return NextResponse.json(
      { error: "Select Wandiege Main Warehouse, Lake Gas Nairobi Warehouse, or Oilcom Nairobi Warehouse." },
      { status: 400 }
    );
  }

  try {
    await assertSupplierReceiptNoStoredDuplicates(prisma, data.lines);

    const receipt = await prisma.$transaction(async (tx) => {
      const created = await tx.supplierReceipt.create({
        data: {
          reference: data.reference,
          warehouseId: data.warehouseId,
          supplierManufacturer: data.supplierManufacturer,
          purchaseOrderReference: data.purchaseOrderReference,
          deliveryNote: data.deliveryNote,
          vehicleTruckNumber: data.vehicleTruckNumber,
          receiptDateTime: data.receiptDateTime,
          receivedByName: data.receivedByName,
          remarks: data.remarks,
          attachmentPlaceholder: data.attachmentPlaceholder,
          status: data.status === "POSTED" ? "REVIEWED" : data.status,
          createdById: session.user.id,
          reviewedById: data.status === "REVIEWED" || data.status === "POSTED" ? session.user.id : null,
          reviewedAt: data.status === "REVIEWED" || data.status === "POSTED" ? new Date() : null,
          lines: {
            create: data.lines
          }
        }
      });

      if (data.status !== "POSTED") {
        return tx.supplierReceipt.findUniqueOrThrow({
          where: { id: created.id },
          include: { lines: true, warehouse: true }
        });
      }

      return postSupplierReceipt(tx as never, created.id, session.user.id);
    });

    await writeAuditLog({
      action: data.status === "POSTED" ? "SUPPLIER_RECEIPT_POSTED" : "SUPPLIER_RECEIPT_SAVED",
      category: "INVENTORY",
      details: `${data.reference} supplier receipt ${data.status.toLowerCase()} for ${data.lines.length} cylinder(s).`,
      entityType: "SupplierReceipt",
      entityId: receipt.id,
      session,
      request,
      metadata: receiptSummaryMetadata(receipt)
    }).catch(() => null);

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Duplicate receipt reference, factory serial number, or barcode/QR code." }, { status: 409 });
    }

    throw error;
  }
}
