import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { getSalesLocationForSession } from "@/lib/refill-sales-access";
import { prisma } from "@/lib/prisma";
import { safeEnqueueSapPosting } from "@/lib/sap-posting";
import { canManageFullCylinderSales, canViewFullCylinderSales, fullCylinderSaleSchema } from "@/lib/full-cylinder-sales";
import { createFullCylinderSale, fullCylinderSaleErrorMessage } from "@/lib/full-cylinder-sale-posting";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to view full cylinder sales." }, { status: 401 });
  if (!canViewFullCylinderSales(session.user.role)) return NextResponse.json({ error: "Your role cannot view full cylinder sales." }, { status: 403 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const locationId = ["RSO", "MSO", "SERVICE_CENTRE_STAFF"].includes(session.user.role) ? await getSalesLocationForSession(session) : null;
  const sales = await prisma.fullCylinderSale.findMany({
    where: {
      AND: [
        locationId ? { locationId } : {},
        q ? {
          OR: [
            { saleNumber: { contains: q, mode: "insensitive" } },
            { receiptNumber: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { phone: { contains: q, mode: "insensitive" } } },
            { cylinder: { barcode: { contains: q, mode: "insensitive" } } },
            { cylinder: { serialNumber: { contains: q, mode: "insensitive" } } }
          ]
        } : {}
      ]
    },
    include: { customer: true, sku: true, location: true, cylinder: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ sales });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to complete full cylinder sales." }, { status: 401 });
  if (!canManageFullCylinderSales(session.user.role)) return NextResponse.json({ error: "Your role cannot complete full cylinder sales." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = fullCylinderSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the full cylinder sale form." }, { status: 400 });
  }

  const locationId = session.user.role === "ADMIN"
    ? parsed.data.locationId || null
    : await getSalesLocationForSession(session);
  if (!locationId) return NextResponse.json({ error: "Select or assign a selling point location." }, { status: 400 });

  try {
    const sale = await createFullCylinderSale(prisma, parsed.data, locationId, session.user.id);
    await safeEnqueueSapPosting(prisma, {
      sourceModule: "FULL_CYLINDER_SALE",
      sourceRecordId: sale.id,
      sourceReference: sale.saleNumber,
      action: "POST_FULL_CYLINDER_SALE",
      customerId: sale.customerId,
      skuId: sale.skuId,
      plantLocationId: sale.locationId,
      storageLocationId: sale.locationId,
      amount: sale.totalAmount,
      payload: {
        saleNumber: sale.saleNumber,
        invoiceNumber: sale.invoiceNumber,
        receiptNumber: sale.receiptNumber,
        totalAmount: sale.totalAmount.toString(),
        pricingMode: "Demo app pricing; SAP pricing integration placeholder."
      },
      createdById: session.user.id
    });
    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A generated sale, invoice, or receipt reference already exists. Please try again." }, { status: 409 });
    }
    if (error instanceof Error) {
      const message = fullCylinderSaleErrorMessage(error.message);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
