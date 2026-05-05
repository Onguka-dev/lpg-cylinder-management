import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { requireInventoryManageSession, requireInventoryViewSession } from "@/lib/inventory-access";
import { cylinderSchema, normalizeCylinderInput } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = requireInventoryViewSession(await getCurrentSession());

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();

  const cylinders = await prisma.cylinder.findMany({
    where: query
      ? {
          OR: [
            { serialNumber: { contains: query, mode: "insensitive" } },
            { barcode: { contains: query, mode: "insensitive" } },
            { sku: { name: { contains: query, mode: "insensitive" } } },
            { currentLocation: { name: { contains: query, mode: "insensitive" } } }
          ]
        }
      : undefined,
    include: { sku: true, currentLocation: true },
    orderBy: { updatedAt: "desc" },
    take: 150
  });

  return NextResponse.json({ cylinders });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const auth = requireInventoryManageSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = cylinderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the cylinder form and try again." },
      { status: 400 }
    );
  }

  const data = normalizeCylinderInput(parsed.data);

  try {
    const cylinder = await prisma.$transaction(async (tx) => {
      const created = await tx.cylinder.create({ data });
      await tx.cylinderHistory.create({
        data: {
          cylinderId: created.id,
          newStatus: created.status,
          newLocationId: created.currentLocationId,
          changedById: session?.user.id,
          reason: "Cylinder record created"
        }
      });

      return created;
    });

    return NextResponse.json({ cylinder }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: duplicateMessage(error.meta?.target) },
        { status: 409 }
      );
    }

    throw error;
  }
}

function duplicateMessage(target: unknown) {
  const fields = Array.isArray(target) ? target.join(",") : String(target);

  if (fields.includes("serialNumber")) {
    return "A cylinder with this serial number already exists.";
  }

  if (fields.includes("barcode")) {
    return "A cylinder with this barcode/RFID placeholder already exists.";
  }

  return "A duplicate cylinder record already exists.";
}
