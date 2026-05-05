import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { requireInventoryManageSession } from "@/lib/inventory-access";
import { openingBalanceSchema } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = requireInventoryManageSession(await getCurrentSession());

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const batches = await prisma.openingBalanceBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: { lines: { include: { sku: true, location: true } }, createdBy: true },
    take: 50
  });

  return NextResponse.json({ batches });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const auth = requireInventoryManageSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = openingBalanceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the opening balance form and try again." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const prefix = data.serialPrefix.trim().toUpperCase();

  try {
    const batch = await prisma.$transaction(async (tx) => {
      const createdBatch = await tx.openingBalanceBatch.create({
        data: {
          reference: data.reference.trim().toUpperCase(),
          notes: data.notes?.trim() || null,
          createdById: session?.user.id
        }
      });

      await tx.openingBalanceLine.create({
        data: {
          batchId: createdBatch.id,
          skuId: data.skuId,
          locationId: data.locationId,
          status: data.status,
          quantity: data.quantity,
          serialPrefix: prefix
        }
      });

      for (let index = 1; index <= data.quantity; index += 1) {
        const serialNumber = `${prefix}-${String(index).padStart(4, "0")}`;
        const cylinder = await tx.cylinder.create({
          data: {
            serialNumber,
            skuId: data.skuId,
            currentLocationId: data.locationId,
            status: data.status,
            notes: `Created from opening balance ${createdBatch.reference}`
          }
        });
        await tx.cylinderHistory.create({
          data: {
            cylinderId: cylinder.id,
            newStatus: cylinder.status,
            newLocationId: cylinder.currentLocationId,
            changedById: session?.user.id,
            reason: `Opening balance ${createdBatch.reference}`
          }
        });
      }

      return createdBatch;
    });

    return NextResponse.json({ batch }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Opening balance reference or generated cylinder serial numbers already exist." },
        { status: 409 }
      );
    }

    throw error;
  }
}
