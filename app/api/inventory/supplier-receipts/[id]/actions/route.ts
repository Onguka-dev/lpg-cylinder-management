import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { safeEnqueueSapPosting } from "@/lib/sap-posting";
import { canManageSupplierReceipts } from "@/lib/supplier-receipts";
import { postSupplierReceipt, receiptSummaryMetadata } from "@/lib/supplier-receipt-posting";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();

  if (!session) return NextResponse.json({ error: "Sign in to update supplier receipts." }, { status: 401 });
  if (!canManageSupplierReceipts(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot update supplier receipts." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { action?: string } | null;
  const action = body?.action;

  if (action !== "review" && action !== "post") {
    return NextResponse.json({ error: "Choose review or post." }, { status: 400 });
  }

  try {
    const receipt = await prisma.$transaction(async (tx) => {
      if (action === "review") {
        const current = await tx.supplierReceipt.findUnique({
          where: { id: params.id },
          include: { lines: true, warehouse: true }
        });

        if (!current) throw new Error("SUPPLIER_RECEIPT_NOT_FOUND");
        if (current.status === "POSTED") throw new Error("SUPPLIER_RECEIPT_ALREADY_POSTED");

        return tx.supplierReceipt.update({
          where: { id: params.id },
          data: {
            status: "REVIEWED",
            reviewedById: session.user.id,
            reviewedAt: new Date()
          },
          include: { lines: true, warehouse: true }
        });
      }

      return postSupplierReceipt(tx as never, params.id, session.user.id);
    });

    await writeAuditLog({
      action: action === "post" ? "SUPPLIER_RECEIPT_POSTED" : "SUPPLIER_RECEIPT_REVIEWED",
      category: "INVENTORY",
      details: `${receipt.reference} supplier receipt ${action === "post" ? "posted" : "reviewed"}.`,
      entityType: "SupplierReceipt",
      entityId: receipt.id,
      session,
      request,
      metadata: receiptSummaryMetadata(receipt)
    }).catch(() => null);

    if (action === "post") {
      await safeEnqueueSapPosting(prisma, {
        sourceModule: "SUPPLIER_RECEIPT",
        sourceRecordId: receipt.id,
        sourceReference: receipt.reference,
        action: "POST_SUPPLIER_RECEIPT",
        plantLocationId: receipt.warehouseId,
        storageLocationId: receipt.warehouseId,
        payload: receiptSummaryMetadata(receipt),
        createdById: session.user.id
      });
    }

    return NextResponse.json({ receipt });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SUPPLIER_RECEIPT_NOT_FOUND") return NextResponse.json({ error: "Supplier receipt not found." }, { status: 404 });
      if (error.message === "SUPPLIER_RECEIPT_ALREADY_POSTED") return NextResponse.json({ error: "This supplier receipt is already posted." }, { status: 409 });
      if (error.message.startsWith("Duplicate") || error.message.includes("No active SKU")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    throw error;
  }
}
