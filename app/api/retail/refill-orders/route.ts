import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { normalizeCustomerInput } from "@/lib/customers";
import { assertNoOpenCustomerCustody } from "@/lib/inventory";
import { createNonCodedCylinderIntake } from "@/lib/non-coded-intake-posting";
import { prisma } from "@/lib/prisma";
import { getSalesLocationForSession, requireRefillSalesManageSession, requireRefillSalesViewSession } from "@/lib/refill-sales-access";
import { generateRetailReference, refillOrderSchema } from "@/lib/refill-sales";
import { normalizeScanValue } from "@/lib/scanning";
import { saleEligibleCylinderWhere } from "@/lib/safety";
import { createMockNotification } from "@/lib/notifications";
import { safeEnqueueSapPosting } from "@/lib/sap-posting";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  const auth = requireRefillSalesViewSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const locationId = ["RSO", "MSO", "SERVICE_CENTRE_STAFF"].includes(auth.session.user.role) ? await getSalesLocationForSession(auth.session) : null;

  const orders = await prisma.refillOrder.findMany({
    where: {
      AND: [
        locationId ? { locationId } : {},
        query
          ? {
              OR: [
                { orderNumber: { contains: query, mode: "insensitive" } },
                { invoiceNumber: { contains: query, mode: "insensitive" } },
                { receiptNumber: { contains: query, mode: "insensitive" } },
                { customer: { name: { contains: query, mode: "insensitive" } } },
                { customer: { phone: { contains: query, mode: "insensitive" } } }
              ]
            }
          : {}
      ]
    },
    include: { customer: true, sku: true, location: true, payment: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const auth = requireRefillSalesManageSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = refillOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the refill form and try again." },
      { status: 400 }
    );
  }

  const bodyRecord = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const locationId = auth.session.user.role === "ADMIN"
    ? (typeof bodyRecord.locationId === "string" ? bodyRecord.locationId : undefined)
    : await getSalesLocationForSession(auth.session);

  if (!locationId) {
    return NextResponse.json({ error: "No assigned sales location found for this sales user." }, { status: 400 });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      let customerId = parsed.data.customerId || null;

      if (!customerId && parsed.data.customer) {
        const customerInput = normalizeCustomerInput(parsed.data.customer);
        const duplicate = await tx.customer.findFirst({
          where: {
            OR: [
              { phone: customerInput.phone },
              ...(customerInput.email ? [{ email: customerInput.email }] : []),
              { proofReference: customerInput.proofReference }
            ]
          }
        });

        if (duplicate) {
          customerId = duplicate.id;
        } else {
          const customer = await tx.customer.create({ data: customerInput });
          customerId = customer.id;
        }
      }

      if (!customerId) throw new Error("CUSTOMER_REQUIRED");

      const filledCode = normalizeScanValue(parsed.data.filledCylinderCode);
      const emptyIdentifier = parsed.data.emptyReturnNoQr
        ? parsed.data.emptyReturnSerialNumber
        : parsed.data.emptyReturnCylinderCode;
      if (!emptyIdentifier) throw new Error("EMPTY_RETURN_IDENTIFIER_REQUIRED");
      const emptyCode = normalizeScanValue(emptyIdentifier);

      const [customer, sku, filledCylinder] = await Promise.all([
        tx.customer.findUnique({ where: { id: customerId } }),
        tx.masterDataRecord.findUnique({ where: { id: parsed.data.skuId } }),
        tx.cylinder.findFirst({
          where: {
            ...saleEligibleCylinderWhere(),
            status: { in: ["FILLED", "FILLED_AT_SELLING_POINT"] },
            skuId: parsed.data.skuId,
            currentLocationId: locationId,
            OR: [
              { barcode: { equals: filledCode, mode: "insensitive" } },
              { serialNumber: { equals: filledCode, mode: "insensitive" } },
              { factorySerialNo: { equals: filledCode, mode: "insensitive" } },
              { qrCode: { equals: filledCode, mode: "insensitive" } }
            ]
          },
          orderBy: { createdAt: "asc" }
        })
      ]);

      if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
      if (!sku) throw new Error("SKU_NOT_FOUND");
      if (!filledCylinder) throw new Error("SCANNED_FILLED_CYLINDER_NOT_AVAILABLE");
      assertNoOpenCustomerCustody(await tx.customerCylinderCustody.count({
        where: { cylinderId: filledCylinder.id, returnDate: null }
      }));

      const price = await tx.masterDataRecord.findFirst({
        where: {
          type: "PRICE",
          isActive: true,
          OR: [
            { parentId: parsed.data.skuId },
            { code: `PRICE-${sku.code.replace(/^LPG-/, "")}` }
          ]
        },
        orderBy: { updatedAt: "desc" }
      });
      const subtotal = price?.amount ?? new Prisma.Decimal(0);
      const total = subtotal;
      const orderNumber = generateRetailReference("RSO-REFILL");
      const invoiceNumber = generateRetailReference("INV");
      const receiptNumber = generateRetailReference("RCT");
      const paymentNumber = generateRetailReference("PAY");
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 30);

      const returnedSizeKg = parsed.data.emptyReturnNoQr ? parsed.data.emptyReturnSizeKg : sku.capacityKg;
      if (parsed.data.emptyReturnNoQr && returnedSizeKg !== sku.capacityKg) throw new Error("EMPTY_RETURN_SKU_MISMATCH");

      let nonCodedIntakeId: string | null = null;
      let emptyCylinder = null as Awaited<ReturnType<typeof tx.cylinder.findFirst>>;
      let openReturnCustody = null as Awaited<ReturnType<typeof tx.customerCylinderCustody.findFirst>>;

      if (parsed.data.emptyReturnNoQr) {
        const intake = await createNonCodedCylinderIntake(tx, {
          customerId,
          visibleSerialNumber: emptyCode,
          cylinderSizeKg: returnedSizeKg ?? sku.capacityKg ?? 0,
          manufacturer: parsed.data.emptyReturnManufacturer,
          condition: parsed.data.emptyReturnCondition ?? "NON_CODED",
          photoPlaceholder: parsed.data.emptyReturnPhotoPlaceholder,
          intakeLocationId: locationId,
          staffRemarks: parsed.data.notes
        }, locationId, auth.session.user.id, { createPlaceholderCylinder: true, refillOrderNumber: orderNumber });
        if (!intake.linkedCylinder) throw new Error("NON_CODED_PLACEHOLDER_MISSING");
        nonCodedIntakeId = intake.id;
        emptyCylinder = intake.linkedCylinder;
      } else {
        emptyCylinder = await tx.cylinder.findFirst({
          where: {
            OR: [
              { barcode: { equals: emptyCode, mode: "insensitive" as const } },
              { serialNumber: { equals: emptyCode, mode: "insensitive" as const } },
              { factorySerialNo: { equals: emptyCode, mode: "insensitive" as const } },
              { qrCode: { equals: emptyCode, mode: "insensitive" as const } }
            ]
          }
        });

        if (emptyCylinder?.cylinderSizeKg && returnedSizeKg && emptyCylinder.cylinderSizeKg !== returnedSizeKg) throw new Error("EMPTY_RETURN_SKU_MISMATCH");
        if (emptyCylinder?.skuId !== undefined && emptyCylinder.skuId !== sku.id) throw new Error("EMPTY_RETURN_SKU_MISMATCH");

        openReturnCustody = emptyCylinder
          ? await tx.customerCylinderCustody.findFirst({
              where: { cylinderId: emptyCylinder.id, returnDate: null }
            })
          : null;
        if (openReturnCustody && openReturnCustody.customerId !== customerId) throw new Error("EMPTY_RETURN_DIFFERENT_CUSTOMER");

        if (!emptyCylinder) {
          emptyCylinder = await tx.cylinder.create({
            data: {
              serialNumber: emptyCode,
              barcode: emptyCode,
              factorySerialNo: emptyCode,
              cylinderSizeKg: returnedSizeKg ?? sku.capacityKg,
              skuId: sku.id,
              currentLocationId: locationId,
              status: "EMPTY_AT_SELLING_POINT",
              notes: `Scanned legacy empty exchange received for refill ${orderNumber}`
            }
          });
        } else {
          await tx.cylinder.update({
            where: { id: emptyCylinder.id },
            data: {
              currentLocationId: locationId,
              status: "EMPTY_AT_SELLING_POINT",
              notes: `Empty exchange returned by ${customer.name} for refill ${orderNumber}`
            }
          });
        }

        if (openReturnCustody) {
          await tx.customerCylinderCustody.update({
            where: { id: openReturnCustody.id },
            data: {
              returnDate: new Date(),
              returnLocationId: locationId,
              refillReference: openReturnCustody.refillReference ?? orderNumber,
              notes: openReturnCustody.notes ? `${openReturnCustody.notes}\nReturned during refill ${orderNumber}.` : `Returned during refill ${orderNumber}.`
            }
          });
        }
      }

      if (!emptyCylinder) throw new Error("EMPTY_RETURN_IDENTIFIER_REQUIRED");
      const previousEmptyStatus = parsed.data.emptyReturnNoQr ? null : emptyCylinder.status;
      const previousEmptyLocationId = parsed.data.emptyReturnNoQr ? null : emptyCylinder.currentLocationId;

      await tx.cylinder.update({
        where: { id: filledCylinder.id },
        data: {
          status: "WITH_CUSTOMER",
          notes: `Issued to ${customer.name} via refill ${orderNumber}`
        }
      });

      await tx.customerCylinderCustody.create({
        data: {
          cylinderId: filledCylinder.id,
          customerId,
          refillReference: orderNumber,
          issueLocationId: locationId,
          expectedReturnFollowUpDate: followUpDate,
          notes: `Issued during walk-in refill ${orderNumber}`,
          createdById: auth.session.user.id
        }
      });

      await tx.scanEvent.createMany({
        data: [
          {
            barcode: filledCode,
            action: "SALE",
            result: "PERMITTED",
            expectedStatus: "FILLED",
            scannedStatus: filledCylinder.status,
            expectedLocationId: locationId,
            scannedLocationId: filledCylinder.currentLocationId,
            cylinderId: filledCylinder.id,
            userId: auth.session.user.id,
            metadata: { orderNumber, scanRole: "OUTGOING_FILLED_REFILL_EXCHANGE" }
          },
          {
            barcode: emptyCode,
            action: "CUSTOMER_RETURN",
            result: "PERMITTED",
            scannedStatus: emptyCylinder.status,
            expectedLocationId: locationId,
            scannedLocationId: locationId,
            cylinderId: emptyCylinder.id,
            userId: auth.session.user.id,
            metadata: {
              orderNumber,
              scanRole: "RETURNED_EMPTY_REFILL_EXCHANGE",
              custodyClosed: Boolean(openReturnCustody),
              nonCodedReturn: Boolean(parsed.data.emptyReturnNoQr),
              returnedSizeKg
            }
          }
        ]
      });

      await tx.cylinderHistory.createMany({
        data: [
          {
            cylinderId: filledCylinder.id,
            previousStatus: filledCylinder.status,
            newStatus: "WITH_CUSTOMER",
            previousLocationId: filledCylinder.currentLocationId,
            newLocationId: filledCylinder.currentLocationId,
            changedById: auth.session.user.id,
            reason: `Refill order ${orderNumber} issued filled cylinder`
          },
          {
            cylinderId: emptyCylinder.id,
            previousStatus: previousEmptyStatus,
            newStatus: parsed.data.emptyReturnNoQr ? "QUARANTINED" : "EMPTY_AT_SELLING_POINT",
            previousLocationId: previousEmptyLocationId,
            newLocationId: locationId,
            changedById: auth.session.user.id,
            reason: parsed.data.emptyReturnNoQr
              ? `Refill order ${orderNumber} registered non-coded empty cylinder intake pending review`
              : `Refill order ${orderNumber} received scanned empty cylinder`
          }
        ]
      });

      const created = await tx.refillOrder.create({
        data: {
          orderNumber,
          customerId,
          skuId: sku.id,
          locationId,
          filledCylinderId: filledCylinder.id,
          emptyReturnCylinderId: emptyCylinder.id,
          status: "CLOSED",
          paymentMethod: parsed.data.paymentMethod,
          subtotalAmount: subtotal,
          totalAmount: total,
          invoiceNumber,
          receiptNumber,
          notes: parsed.data.notes?.trim() || null,
          deliveryPlaceholder: "Delivery is not part of the Stage 6 walk-in refill workflow.",
          creditPlaceholder: "Advanced credit handling remains a placeholder.",
          createdById: auth.session.user.id,
          payment: {
            create: {
              paymentNumber,
              method: parsed.data.paymentMethod,
              status: "PAID",
              amount: total,
              reference: parsed.data.paymentReference?.trim() || null,
              recordedById: auth.session.user.id
            }
          }
        },
        include: { customer: true, sku: true, location: true, filledCylinder: true, emptyReturnCylinder: true, payment: true }
      });

      if (nonCodedIntakeId) {
        await tx.nonCodedCylinderIntake.update({
          where: { id: nonCodedIntakeId },
          data: { refillOrderId: created.id }
        });
      }

      await tx.auditLog.create({
        data: {
          action: "REFILL_TRANSACTION_CLOSED",
          details: parsed.data.emptyReturnNoQr
            ? `${orderNumber} closed for ${customer.name}; filled cylinder ${filledCylinder.serialNumber} issued and non-coded empty intake was queued.`
            : `${orderNumber} closed for ${customer.name}; filled cylinder ${filledCylinder.serialNumber} issued and empty cylinder ${emptyCylinder.serialNumber} received.`,
          userId: auth.session.user.id
        }
      });

      await createMockNotification(tx, {
        eventType: "RECEIPT_ISSUED",
        channel: "SMS",
        recipientName: customer.name,
        recipientContact: customer.phone,
        payload: { reference: receiptNumber, amount: total.toString() },
        createdById: auth.session.user.id
      });

      return created;
    });

    await safeEnqueueSapPosting(prisma, {
      sourceModule: "REFILL_ORDER",
      sourceRecordId: order.id,
      sourceReference: order.orderNumber,
      action: "POST_REFILL_ORDER",
      customerId: order.customerId,
      skuId: order.skuId,
      plantLocationId: order.locationId,
      storageLocationId: order.locationId,
      amount: order.totalAmount,
      payload: {
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoiceNumber,
        receiptNumber: order.receiptNumber,
        totalAmount: order.totalAmount.toString(),
        pricingMode: "Demo app pricing; SAP pricing integration placeholder."
      },
      createdById: auth.session.user.id
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const message = errorMessage(error.message);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A generated order, invoice, receipt, payment, or cylinder reference already exists. Please try again." }, { status: 409 });
    }

    throw error;
  }
}


function errorMessage(message: string) {
  const messages: Record<string, string> = {
    CUSTOMER_REQUIRED: "Select an existing customer or register a new customer.",
    CUSTOMER_NOT_FOUND: "Selected customer was not found.",
    SKU_NOT_FOUND: "Selected SKU was not found.",
    NO_FILLED_STOCK: "No filled stock is available for this SKU at your assigned outlet.",
    SCANNED_FILLED_CYLINDER_NOT_AVAILABLE: "Scanned outgoing full cylinder is not available for this SKU at the selected sales location.",
    EMPTY_RETURN_IDENTIFIER_REQUIRED: "Scan the returned empty cylinder, or enter the serial number for a no-QR return.",
    EMPTY_RETURN_SKU_MISMATCH: "Returned empty cylinder does not match the selected SKU/cylinder size.",
    EMPTY_RETURN_DIFFERENT_CUSTOMER: "Returned empty cylinder is currently assigned to a different customer.",
    CYLINDER_ALREADY_IN_CUSTOMER_CUSTODY: "This cylinder already has an open customer custody record.",
    NON_CODED_PLACEHOLDER_MISSING: "The non-coded return could not be queued for warehouse review."
  };

  return messages[message];
}
