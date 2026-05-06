import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { normalizeCustomerInput } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import { getSalesLocationForSession, requireRefillSalesManageSession, requireRefillSalesViewSession } from "@/lib/refill-sales-access";
import { generateRetailReference, refillOrderSchema } from "@/lib/refill-sales";
import { saleEligibleCylinderWhere } from "@/lib/safety";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  const auth = requireRefillSalesViewSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const locationId = auth.session.user.role === "RSO" ? await getSalesLocationForSession(auth.session) : null;

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
    return NextResponse.json({ error: "No assigned sales location found for this RSO user." }, { status: 400 });
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

      const [customer, sku, filledCylinder] = await Promise.all([
        tx.customer.findUnique({ where: { id: customerId } }),
        tx.masterDataRecord.findUnique({ where: { id: parsed.data.skuId } }),
        tx.cylinder.findFirst({
          where: {
            ...saleEligibleCylinderWhere(),
            skuId: parsed.data.skuId,
            currentLocationId: locationId,
          },
          orderBy: { createdAt: "asc" }
        })
      ]);

      if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
      if (!sku) throw new Error("SKU_NOT_FOUND");
      if (!filledCylinder) throw new Error("NO_FILLED_STOCK");

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
      const emptySerial = generateRetailReference(`EMPTY-${sku.code}`);

      const emptyCylinder = await tx.cylinder.create({
        data: {
          serialNumber: emptySerial,
          barcode: `${emptySerial}-RFID`,
          skuId: sku.id,
          currentLocationId: locationId,
          status: "EMPTY",
          notes: `Empty exchange received for refill ${orderNumber}`
        }
      });

      await tx.cylinder.update({
        where: { id: filledCylinder.id },
        data: {
          status: "WITH_CUSTOMER",
          notes: `Issued to ${customer.name} via refill ${orderNumber}`
        }
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
            newStatus: "EMPTY",
            newLocationId: emptyCylinder.currentLocationId,
            changedById: auth.session.user.id,
            reason: `Refill order ${orderNumber} received empty cylinder`
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

      await tx.auditLog.create({
        data: {
          action: "REFILL_TRANSACTION_CLOSED",
          details: `${orderNumber} closed for ${customer.name}; filled cylinder ${filledCylinder.serialNumber} issued and empty cylinder ${emptyCylinder.serialNumber} received.`,
          userId: auth.session.user.id
        }
      });

      return created;
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
    NO_FILLED_STOCK: "No filled stock is available for this SKU at your assigned outlet."
  };

  return messages[message];
}
