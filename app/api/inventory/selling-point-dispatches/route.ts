import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  canManageSellingPointDispatch,
  canViewSellingPointDispatch,
  findDuplicateCodes,
  sellingPointDispatchSchema
} from "@/lib/selling-point-distribution";
import {
  buildSellingPointSearchWhere,
  createSellingPointDispatch,
  sellingPointActionErrorMessage
} from "@/lib/selling-point-distribution-posting";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to view selling point dispatches." }, { status: 401 });
  if (!canViewSellingPointDispatch(session.user.role)) return NextResponse.json({ error: "Your role cannot view selling point dispatches." }, { status: 403 });

  const url = new URL(request.url);
  const movements = await prisma.inventoryMovement.findMany({
    where: buildSellingPointSearchWhere(url.searchParams.get("q"), url.searchParams.get("status"), url.searchParams.get("region")),
    include: { sku: true, sourceLocation: true, destinationLocation: true, cylinders: { include: { cylinder: true } } },
    orderBy: { updatedAt: "desc" },
    take: 150
  });

  return NextResponse.json({ movements });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to dispatch to selling points." }, { status: 401 });
  if (!canManageSellingPointDispatch(session.user.role)) return NextResponse.json({ error: "Only Admin and Warehouse Manager users can dispatch to selling points." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = sellingPointDispatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the dispatch form." }, { status: 400 });
  }
  const duplicate = findDuplicateCodes(parsed.data.cylinderCodes);
  if (duplicate) return NextResponse.json({ error: `Duplicate scanned cylinder in this batch: ${duplicate}.` }, { status: 409 });

  try {
    const movements = await createSellingPointDispatch(prisma, parsed.data, session.user.id, session.user.role);
    await writeAuditLog({
      action: "SELLING_POINT_DISPATCHED",
      category: "INVENTORY",
      details: `${parsed.data.reference} dispatched to selling point.`,
      entityType: "InventoryMovement",
      entityId: movements[0]?.id,
      session,
      request,
      metadata: {
        reference: parsed.data.reference,
        movementCount: movements.length,
        destinationLocationId: parsed.data.destinationLocationId,
        cylinderCount: parsed.data.cylinderCodes.length
      }
    }).catch(() => null);
    return NextResponse.json({ movements }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A dispatch with this transfer number/SKU already exists." }, { status: 409 });
    }
    if (error instanceof Error) {
      const message = sellingPointActionErrorMessage(error.message);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
