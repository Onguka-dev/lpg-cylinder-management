import { Prisma, PrismaClient } from "@prisma/client";
import { isDamagedNonCodedCondition, type NonCodedCylinderIntakeInput, type NonCodedIntakeReviewInput } from "@/lib/non-coded-intakes";
import { normalizeScanValue } from "@/lib/scanning";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function generateNonCodedIntakeNumber() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
    String(now.getMilliseconds()).padStart(3, "0")
  ].join("");

  return `NCI-${stamp}`;
}

export async function findCustomerForNonCodedIntake(db: DbClient, input: Pick<NonCodedCylinderIntakeInput, "customerId" | "customerQuery">) {
  if (input.customerId) {
    const customer = await db.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new Error("NON_CODED_CUSTOMER_NOT_FOUND");
    return customer;
  }

  const query = input.customerQuery?.trim();
  if (!query) throw new Error("NON_CODED_CUSTOMER_REQUIRED");

  const customer = await db.customer.findFirst({
    where: {
      OR: [
        { phone: { equals: query, mode: "insensitive" } },
        { email: { equals: query, mode: "insensitive" } },
        { proofReference: { equals: query, mode: "insensitive" } },
        { kraPin: { equals: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } }
      ]
    },
    orderBy: { name: "asc" }
  });
  if (!customer) throw new Error("NON_CODED_CUSTOMER_NOT_FOUND");
  return customer;
}

export async function createNonCodedCylinderIntake(
  db: DbClient,
  input: NonCodedCylinderIntakeInput,
  intakeLocationId: string,
  createdById: string,
  options: { createPlaceholderCylinder?: boolean; refillOrderNumber?: string } = {}
) {
  const [customer, location, sku] = await Promise.all([
    findCustomerForNonCodedIntake(db, input),
    db.masterDataRecord.findUnique({ where: { id: intakeLocationId } }),
    db.masterDataRecord.findFirst({ where: { type: "SKU_MASTER", capacityKg: input.cylinderSizeKg, isActive: true }, orderBy: { code: "asc" } })
  ]);

  if (!location) throw new Error("NON_CODED_LOCATION_NOT_FOUND");
  if (!sku) throw new Error("NON_CODED_SKU_NOT_FOUND");

  const existingOpen = await db.nonCodedCylinderIntake.findFirst({
    where: {
      visibleSerialNumber: { equals: input.visibleSerialNumber.trim(), mode: "insensitive" },
      status: { in: ["PENDING_REVIEW", "TAGGING_PENDING", "ESCALATED"] }
    }
  });
  if (existingOpen) throw new Error("NON_CODED_INTAKE_DUPLICATE_PENDING");

  const intakeNumber = generateNonCodedIntakeNumber();
  const placeholderCylinder = options.createPlaceholderCylinder
    ? await db.cylinder.create({
        data: {
          serialNumber: `NC-PENDING-${intakeNumber}`,
          cylinderSizeKg: input.cylinderSizeKg,
          manufacturer: input.manufacturer?.trim() || null,
          skuId: sku.id,
          currentLocationId: intakeLocationId,
          status: "QUARANTINED",
          activeStatus: false,
          blockedReason: "Pending non-coded cylinder review and barcode tagging",
          companyOwned: true,
          notes: options.refillOrderNumber
            ? `Temporary non-coded return placeholder for refill ${options.refillOrderNumber}.`
            : "Temporary non-coded return placeholder."
        }
      })
    : null;

  const intake = await db.nonCodedCylinderIntake.create({
    data: {
      intakeNumber,
      customerId: customer.id,
      visibleSerialNumber: input.visibleSerialNumber.trim().toUpperCase(),
      cylinderSizeKg: input.cylinderSizeKg,
      manufacturer: input.manufacturer?.trim() || null,
      condition: input.condition,
      photoPlaceholder: input.photoPlaceholder?.trim() || null,
      intakeLocationId,
      staffRemarks: input.staffRemarks?.trim() || null,
      linkedCylinderId: placeholderCylinder?.id ?? null,
      createdById
    },
    include: { customer: true, intakeLocation: true, linkedCylinder: true }
  });

  if (placeholderCylinder) {
    await db.cylinderHistory.create({
      data: {
        cylinderId: placeholderCylinder.id,
        previousStatus: null,
        newStatus: "QUARANTINED",
        previousLocationId: null,
        newLocationId: intakeLocationId,
        changedById: createdById,
        reason: `Non-coded return intake ${intake.intakeNumber} created pending review`
      }
    });
  }

  await db.auditLog.create({
    data: {
      action: "NON_CODED_CYLINDER_INTAKE_CREATED",
      details: `${intake.intakeNumber} logged for ${customer.name} at ${location.name}; pending warehouse/admin review.`,
      entityType: "NonCodedCylinderIntake",
      entityId: intake.id,
      userId: createdById,
      metadata: { condition: input.condition, cylinderSizeKg: input.cylinderSizeKg, hasPlaceholderCylinder: Boolean(placeholderCylinder) }
    }
  });

  return intake;
}

export async function reviewNonCodedCylinderIntake(
  db: DbClient,
  intakeId: string,
  input: NonCodedIntakeReviewInput,
  reviewedById: string
) {
  const intake = await db.nonCodedCylinderIntake.findUnique({
    where: { id: intakeId },
    include: { customer: true, intakeLocation: true, linkedCylinder: true }
  });
  if (!intake) throw new Error("NON_CODED_INTAKE_NOT_FOUND");
  if (["REJECTED", "TAGGED_APPROVED", "APPROVED_LINKED", "APPROVED_NEW_CYLINDER"].includes(intake.status)) {
    throw new Error("NON_CODED_INTAKE_ALREADY_CLOSED");
  }

  if (input.action === "REJECT" || input.action === "ESCALATE") {
    const status = input.action === "REJECT" ? "REJECTED" : "ESCALATED";
    return db.nonCodedCylinderIntake.update({
      where: { id: intake.id },
      data: {
        status,
        reviewNotes: input.reviewNotes?.trim() || null,
        reviewedById,
        reviewedAt: new Date()
      },
      include: { customer: true, intakeLocation: true, linkedCylinder: true }
    });
  }

  if (input.action === "LINK_EXISTING") {
    const code = normalizeScanValue(input.cylinderCode ?? "");
    const existingCylinder = await db.cylinder.findFirst({
      where: {
        OR: [
          { barcode: { equals: code, mode: "insensitive" } },
          { serialNumber: { equals: code, mode: "insensitive" } },
          { factorySerialNo: { equals: code, mode: "insensitive" } },
          { qrCode: { equals: code, mode: "insensitive" } }
        ]
      }
    });
    if (!existingCylinder) throw new Error("NON_CODED_LINK_CYLINDER_NOT_FOUND");

    return db.nonCodedCylinderIntake.update({
      where: { id: intake.id },
      data: {
        status: "APPROVED_LINKED",
        linkedCylinderId: existingCylinder.id,
        approvedBarcode: existingCylinder.barcode,
        approvedQrCode: existingCylinder.qrCode,
        reviewNotes: input.reviewNotes?.trim() || null,
        reviewedById,
        reviewedAt: new Date()
      },
      include: { customer: true, intakeLocation: true, linkedCylinder: true }
    });
  }

  if (input.newBarcode) {
    const barcode = normalizeScanValue(input.newBarcode);
    const duplicate = await db.cylinder.findFirst({
      where: {
        id: intake.linkedCylinderId ? { not: intake.linkedCylinderId } : undefined,
        OR: [
          { barcode: { equals: barcode, mode: "insensitive" } },
          { qrCode: { equals: barcode, mode: "insensitive" } }
        ]
      }
    });
    if (duplicate) throw new Error("NON_CODED_BARCODE_DUPLICATE");
  }

  if (input.newQrCode) {
    const qrCode = normalizeScanValue(input.newQrCode);
    const duplicate = await db.cylinder.findFirst({
      where: {
        id: intake.linkedCylinderId ? { not: intake.linkedCylinderId } : undefined,
        OR: [
          { barcode: { equals: qrCode, mode: "insensitive" } },
          { qrCode: { equals: qrCode, mode: "insensitive" } }
        ]
      }
    });
    if (duplicate) throw new Error("NON_CODED_QR_DUPLICATE");
  }

  const sku = await db.masterDataRecord.findFirst({
    where: { type: "SKU_MASTER", capacityKg: intake.cylinderSizeKg, isActive: true },
    orderBy: { code: "asc" }
  });
  if (!sku) throw new Error("NON_CODED_SKU_NOT_FOUND");

  if (input.action === "CREATE_PENDING_CYLINDER") {
    const cylinder = intake.linkedCylinder ?? await db.cylinder.create({
      data: {
        serialNumber: `NC-PENDING-${intake.intakeNumber}`,
        cylinderSizeKg: intake.cylinderSizeKg,
        manufacturer: intake.manufacturer,
        skuId: sku.id,
        currentLocationId: intake.intakeLocationId,
        status: "QUARANTINED",
        activeStatus: false,
        blockedReason: "Pending barcode riveting/tagging approval",
        companyOwned: true,
        notes: `Created from non-coded intake ${intake.intakeNumber}; awaiting barcode tagging.`
      }
    });

    return db.nonCodedCylinderIntake.update({
      where: { id: intake.id },
      data: {
        status: "TAGGING_PENDING",
        linkedCylinderId: cylinder.id,
        reviewNotes: input.reviewNotes?.trim() || "Pending barcode riveting/tagging.",
        reviewedById,
        reviewedAt: new Date()
      },
      include: { customer: true, intakeLocation: true, linkedCylinder: true }
    });
  }

  const barcode = input.newBarcode ? normalizeScanValue(input.newBarcode) : null;
  const qrCode = input.newQrCode ? normalizeScanValue(input.newQrCode) : barcode;
  const blocked = isDamagedNonCodedCondition(intake.condition);
  const status = blocked ? "QUARANTINED" : "EMPTY_AT_SELLING_POINT";
  const serialConflict = await db.cylinder.findFirst({
    where: {
      id: intake.linkedCylinderId ? { not: intake.linkedCylinderId } : undefined,
      OR: [
        { serialNumber: { equals: intake.visibleSerialNumber, mode: "insensitive" } },
        { factorySerialNo: { equals: intake.visibleSerialNumber, mode: "insensitive" } }
      ]
    }
  });

  const cylinder = intake.linkedCylinder
    ? await db.cylinder.update({
        where: { id: intake.linkedCylinder.id },
        data: {
          serialNumber: serialConflict ? intake.linkedCylinder.serialNumber : intake.visibleSerialNumber,
          factorySerialNo: serialConflict ? intake.linkedCylinder.factorySerialNo : intake.visibleSerialNumber,
          barcode,
          qrCode,
          manufacturer: intake.manufacturer,
          cylinderSizeKg: intake.cylinderSizeKg,
          skuId: sku.id,
          currentLocationId: intake.intakeLocationId,
          status,
          activeStatus: !blocked,
          unsafeStatus: blocked,
          quarantinedStatus: blocked,
          blockedReason: blocked ? `Non-coded return condition: ${intake.condition}` : null,
          companyOwned: true,
          notes: `Tagged and approved from non-coded intake ${intake.intakeNumber}.`
        }
      })
    : await db.cylinder.create({
        data: {
          serialNumber: serialConflict ? `NC-TAGGED-${intake.intakeNumber}` : intake.visibleSerialNumber,
          factorySerialNo: serialConflict ? null : intake.visibleSerialNumber,
          barcode,
          qrCode,
          manufacturer: intake.manufacturer,
          cylinderSizeKg: intake.cylinderSizeKg,
          skuId: sku.id,
          currentLocationId: intake.intakeLocationId,
          status,
          activeStatus: !blocked,
          unsafeStatus: blocked,
          quarantinedStatus: blocked,
          blockedReason: blocked ? `Non-coded return condition: ${intake.condition}` : null,
          companyOwned: true,
          notes: `Tagged and approved from non-coded intake ${intake.intakeNumber}.`
        }
      });

  await db.cylinderHistory.create({
    data: {
      cylinderId: cylinder.id,
      previousStatus: intake.linkedCylinder?.status ?? null,
      newStatus: status,
      previousLocationId: intake.linkedCylinder?.currentLocationId ?? null,
      newLocationId: intake.intakeLocationId,
      changedById: reviewedById,
      reason: `Non-coded intake ${intake.intakeNumber} tagged and approved`
    }
  });

  return db.nonCodedCylinderIntake.update({
    where: { id: intake.id },
    data: {
      status: blocked ? "APPROVED_NEW_CYLINDER" : "TAGGED_APPROVED",
      linkedCylinderId: cylinder.id,
      approvedBarcode: barcode,
      approvedQrCode: qrCode,
      reviewNotes: input.reviewNotes?.trim() || null,
      reviewedById,
      reviewedAt: new Date()
    },
    include: { customer: true, intakeLocation: true, linkedCylinder: true }
  });
}

export function nonCodedIntakeErrorMessage(message: string) {
  const messages: Record<string, string> = {
    NON_CODED_CUSTOMER_REQUIRED: "Search or select the customer before registering a non-coded return.",
    NON_CODED_CUSTOMER_NOT_FOUND: "Customer was not found. Register or select the customer first.",
    NON_CODED_LOCATION_NOT_FOUND: "The intake location was not found.",
    NON_CODED_SKU_NOT_FOUND: "No active SKU exists for this cylinder size.",
    NON_CODED_INTAKE_DUPLICATE_PENDING: "This visible serial number already has a pending non-coded intake.",
    NON_CODED_INTAKE_NOT_FOUND: "Non-coded intake was not found.",
    NON_CODED_INTAKE_ALREADY_CLOSED: "This non-coded intake has already been closed.",
    NON_CODED_LINK_CYLINDER_NOT_FOUND: "No existing cylinder was found for that barcode, QR code, or serial number.",
    NON_CODED_BARCODE_DUPLICATE: "That barcode is already assigned to another cylinder.",
    NON_CODED_QR_DUPLICATE: "That QR code is already assigned to another cylinder."
  };

  return messages[message];
}
