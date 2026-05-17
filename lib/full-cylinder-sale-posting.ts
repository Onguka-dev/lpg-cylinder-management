import { Prisma, type PrismaClient } from "@prisma/client";
import { normalizeCustomerInput } from "@/lib/customers";
import { assertNoOpenCustomerCustody } from "@/lib/inventory";
import { generateFullCylinderSaleReference, type FullCylinderSaleInput } from "@/lib/full-cylinder-sales";
import { normalizeScanValue } from "@/lib/scanning";
import { cylinderSaleBlockedReason } from "@/lib/safety";

type Db = PrismaClient;

export async function createFullCylinderSale(
  db: Db,
  input: FullCylinderSaleInput,
  locationId: string,
  userId?: string | null
) {
  const code = normalizeScanValue(input.cylinderCode);
  return db.$transaction(async (tx) => {
    let customerId = input.customerId || null;
    if (!customerId && input.customer) {
      const normalized = normalizeCustomerInput(input.customer);
      const existing = await tx.customer.findFirst({
        where: { OR: [{ phone: normalized.phone }, ...(normalized.email ? [{ email: normalized.email }] : []), { proofReference: normalized.proofReference }] }
      });
      customerId = existing?.id ?? (await tx.customer.create({ data: normalized })).id;
    }
    if (!customerId) throw new Error("CUSTOMER_REQUIRED");

    const cylinder = await tx.cylinder.findFirst({
      where: {
        currentLocationId: locationId,
        status: { in: ["FILLED", "FILLED_AT_SELLING_POINT"] },
        OR: [
          { barcode: { equals: code, mode: "insensitive" } },
          { serialNumber: { equals: code, mode: "insensitive" } },
          { factorySerialNo: { equals: code, mode: "insensitive" } },
          { qrCode: { equals: code, mode: "insensitive" } }
        ]
      },
      include: { sku: true, currentLocation: true }
    });
    if (!cylinder) throw new Error("FULL_CYLINDER_NOT_FOUND_AT_SELLING_POINT");
    const blockedReason = cylinderSaleBlockedReason(cylinder);
    if (blockedReason) throw new Error(blockedReason);
    assertNoOpenCustomerCustody(await tx.customerCylinderCustody.count({ where: { cylinderId: cylinder.id, returnDate: null } }));

    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new Error("CUSTOMER_NOT_FOUND");

    const cylinderAmount = new Prisma.Decimal(input.cylinderAmount ?? 0);
    const gasAmount = new Prisma.Decimal(input.gasAmount ?? 0);
    const totalAmount = cylinderAmount.add(gasAmount);
    const saleNumber = generateFullCylinderSaleReference("FCS");
    const invoiceNumber = generateFullCylinderSaleReference("INV-FCS");
    const receiptNumber = generateFullCylinderSaleReference("RCT-FCS");
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 60);

    const sale = await tx.fullCylinderSale.create({
      data: {
        saleNumber,
        customerId,
        skuId: cylinder.skuId,
        locationId,
        cylinderId: cylinder.id,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference?.trim() || null,
        cylinderAmount,
        gasAmount,
        totalAmount,
        invoiceNumber,
        receiptNumber,
        notes: input.notes?.trim() || null,
        createdById: userId
      },
      include: { customer: true, sku: true, location: true, cylinder: true }
    });

    await tx.scanEvent.create({
      data: {
        barcode: code,
        action: "SALE",
        result: "PERMITTED",
        expectedStatus: "FILLED_AT_SELLING_POINT",
        scannedStatus: cylinder.status,
        expectedLocationId: locationId,
        scannedLocationId: locationId,
        cylinderId: cylinder.id,
        userId: userId || null,
        metadata: { saleNumber, saleType: "FULL_CYLINDER_PLUS_GAS" }
      }
    });

    await tx.cylinder.update({
      where: { id: cylinder.id },
      data: { status: "WITH_CUSTOMER", notes: `Full cylinder plus gas sale ${saleNumber} to ${customer.name}` }
    });
    await tx.customerCylinderCustody.create({
      data: {
        cylinderId: cylinder.id,
        customerId,
        saleReference: saleNumber,
        issueLocationId: locationId,
        expectedReturnFollowUpDate: followUpDate,
        notes: "Full cylinder plus gas sale; cylinder remains company property in customer custody.",
        createdById: userId
      }
    });
    await tx.cylinderHistory.create({
      data: {
        cylinderId: cylinder.id,
        previousStatus: cylinder.status,
        newStatus: "WITH_CUSTOMER",
        previousLocationId: cylinder.currentLocationId,
        newLocationId: cylinder.currentLocationId,
        changedById: userId,
        reason: `Full cylinder plus gas sale ${saleNumber}`
      }
    });
    await tx.auditLog.create({
      data: {
        action: "FULL_CYLINDER_SALE_CLOSED",
        category: "INVENTORY",
        details: `${saleNumber} closed for ${customer.name}; cylinder ${cylinder.serialNumber} issued with gas.`,
        entityType: "FullCylinderSale",
        entityId: sale.id,
        userId: userId || null,
        metadata: { saleNumber, receiptNumber, totalAmount: totalAmount.toString(), cylinderBarcode: cylinder.barcode }
      }
    });

    return sale;
  });
}

export function fullCylinderSaleErrorMessage(message: string) {
  const messages: Record<string, string> = {
    CUSTOMER_REQUIRED: "Select an existing customer or register a new customer.",
    CUSTOMER_NOT_FOUND: "Selected customer was not found.",
    FULL_CYLINDER_NOT_FOUND_AT_SELLING_POINT: "Scanned full cylinder was not found at the selected selling point.",
    CYLINDER_ALREADY_IN_CUSTOMER_CUSTODY: "This cylinder already has an open customer custody record."
  };
  return messages[message] ?? (message.includes("blocked") || message.includes("unsafe") ? message : null);
}
