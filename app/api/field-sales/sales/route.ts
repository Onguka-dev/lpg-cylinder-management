import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { normalizeCustomerInput } from "@/lib/customers";
import { fieldSaleSchema, generateFieldSaleNumber } from "@/lib/field-sales";
import { getFieldAssignment, requireFieldSalesManageSession, requireFieldSalesViewSession } from "@/lib/field-sales-access";
import { assertNoOpenCustomerCustody } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { saleEligibleCylinderWhere } from "@/lib/safety";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  const auth = requireFieldSalesViewSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const assignment = await getFieldAssignment();
  const vehicleId = auth.session.user.role === "MSO" ? assignment.vehicle?.id : undefined;

  const sales = await prisma.fieldSale.findMany({
    where: {
      AND: [
        vehicleId ? { vehicleId } : {},
        query
          ? {
              OR: [
                { saleNumber: { contains: query, mode: "insensitive" } },
                { customer: { name: { contains: query, mode: "insensitive" } } },
                { customer: { phone: { contains: query, mode: "insensitive" } } }
              ]
            }
          : {}
      ]
    },
    include: { customer: true, sku: true, vehicle: true, route: true, zone: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ sales });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const auth = requireFieldSalesManageSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = fieldSaleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the field sale form and try again." },
      { status: 400 }
    );
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const [vehicle, route, zone] = await Promise.all([
        tx.masterDataRecord.findFirst({
          where: { type: "VEHICLE", isActive: true },
          orderBy: { code: "asc" }
        }),
        tx.masterDataRecord.findFirst({
          where: { type: "ROUTE", isActive: true },
          orderBy: { code: "asc" }
        }),
        tx.masterDataRecord.findFirst({
          where: { type: "ZONE", isActive: true },
          orderBy: { code: "asc" }
        })
      ]);
      const assignment = { vehicle, route, zone };
      if (!assignment.vehicle) throw new Error("NO_VEHICLE");

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

        customerId = duplicate?.id ?? (await tx.customer.create({ data: customerInput })).id;
      }

      if (!customerId) throw new Error("CUSTOMER_REQUIRED");

      const [customer, sku, filledCylinder] = await Promise.all([
        tx.customer.findUnique({ where: { id: customerId } }),
        tx.masterDataRecord.findUnique({ where: { id: parsed.data.skuId } }),
        tx.cylinder.findFirst({
          where: {
            ...saleEligibleCylinderWhere(),
            skuId: parsed.data.skuId,
            currentLocationId: assignment.vehicle.id,
          },
          orderBy: { createdAt: "asc" }
        })
      ]);

      if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
      if (!sku) throw new Error("SKU_NOT_FOUND");
      if (!filledCylinder) throw new Error("NO_FILLED_STOCK");
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
      const amount = price?.amount ?? new Prisma.Decimal(0);
      const saleNumber = generateFieldSaleNumber();
      const emptySerial = `FIELD-EMPTY-${saleNumber}`;
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 30);

      const emptyCylinder = await tx.cylinder.create({
        data: {
          serialNumber: emptySerial,
          barcode: `${emptySerial}-RFID`,
          factorySerialNo: emptySerial,
          cylinderSizeKg: sku.capacityKg,
          skuId: sku.id,
          currentLocationId: assignment.vehicle.id,
          status: "EMPTY",
          notes: `Empty cylinder collected during field sale ${saleNumber}`
        }
      });

      await tx.cylinder.update({
        where: { id: filledCylinder.id },
        data: {
          status: "WITH_CUSTOMER",
          currentLocationId: filledCylinder.currentLocationId,
          notes: `Issued to ${customer.name} by MSO field sale ${saleNumber}`
        }
      });

      await tx.customerCylinderCustody.create({
        data: {
          cylinderId: filledCylinder.id,
          customerId,
          saleReference: saleNumber,
          issueLocationId: assignment.vehicle.id,
          expectedReturnFollowUpDate: followUpDate,
          notes: `Issued during field sale ${saleNumber}`,
          createdById: auth.session.user.id
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
            reason: `Field sale ${saleNumber} issued filled cylinder from vehicle stock`
          },
          {
            cylinderId: emptyCylinder.id,
            newStatus: "EMPTY",
            newLocationId: emptyCylinder.currentLocationId,
            changedById: auth.session.user.id,
            reason: `Field sale ${saleNumber} collected empty cylinder onto vehicle`
          }
        ]
      });

      const created = await tx.fieldSale.create({
        data: {
          saleNumber,
          customerId,
          skuId: sku.id,
          vehicleId: assignment.vehicle.id,
          routeId: assignment.route?.id ?? null,
          zoneId: assignment.zone?.id ?? null,
          filledCylinderId: filledCylinder.id,
          emptyReturnCylinderId: emptyCylinder.id,
          paymentMethod: parsed.data.paymentMethod,
          paymentReference: parsed.data.paymentReference?.trim() || null,
          amount,
          deliveryStatus: parsed.data.deliveryStatus,
          discrepancyReport: parsed.data.discrepancyReport?.trim() || null,
          offlineSyncPlaceholder: parsed.data.offlineSyncPlaceholder?.trim() || "Offline queue hook reserved for Stage 15.",
          status: parsed.data.discrepancyReport?.trim() ? "DISCREPANCY_REPORTED" : "CLOSED",
          createdById: auth.session.user.id
        },
        include: { customer: true, sku: true, vehicle: true, route: true, zone: true, filledCylinder: true, emptyReturnCylinder: true }
      });

      await tx.auditLog.create({
        data: {
          action: "FIELD_SALE_CLOSED",
          details: `${saleNumber} closed for ${customer.name}; ${filledCylinder.serialNumber} issued from ${assignment.vehicle.code} and ${emptyCylinder.serialNumber} collected empty.`,
          userId: auth.session.user.id
        }
      });

      return created;
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const message = errorMessage(error.message);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A generated field sale or empty cylinder reference already exists. Please try again." }, { status: 409 });
    }

    throw error;
  }
}

function errorMessage(message: string) {
  const messages: Record<string, string> = {
    NO_VEHICLE: "No assigned vehicle is configured for MSO field sales.",
    CUSTOMER_REQUIRED: "Select an existing customer or register a field customer.",
    CUSTOMER_NOT_FOUND: "Selected customer was not found.",
    SKU_NOT_FOUND: "Selected SKU was not found.",
    NO_FILLED_STOCK: "No filled stock is available for this SKU on the assigned vehicle.",
    CYLINDER_ALREADY_IN_CUSTOMER_CUSTODY: "This cylinder already has an open customer custody record."
  };

  return messages[message];
}
