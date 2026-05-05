import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { requireInventoryManageSession, requireInventoryViewSession } from "@/lib/inventory-access";
import { cylinderSchema, normalizeCylinderInput } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = requireInventoryViewSession(await getCurrentSession());

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const cylinder = await prisma.cylinder.findUnique({
    where: { id: params.id },
    include: {
      sku: true,
      currentLocation: true,
      historyEntries: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { changedBy: true }
      }
    }
  });

  if (!cylinder) {
    return NextResponse.json({ error: "Cylinder not found." }, { status: 404 });
  }

  return NextResponse.json({ cylinder });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
      const existing = await tx.cylinder.findUnique({ where: { id: params.id } });

      if (!existing) {
        throw new Error("CYLINDER_NOT_FOUND");
      }

      const updated = await tx.cylinder.update({
        where: { id: params.id },
        data
      });

      if (
        existing.status !== updated.status ||
        existing.currentLocationId !== updated.currentLocationId
      ) {
        await tx.cylinderHistory.create({
          data: {
            cylinderId: updated.id,
            previousStatus: existing.status,
            newStatus: updated.status,
            previousLocationId: existing.currentLocationId,
            newLocationId: updated.currentLocationId,
            changedById: session?.user.id,
            reason: "Cylinder status or location updated"
          }
        });
      }

      return updated;
    });

    return NextResponse.json({ cylinder });
  } catch (error) {
    if (error instanceof Error && error.message === "CYLINDER_NOT_FOUND") {
      return NextResponse.json({ error: "Cylinder not found." }, { status: 404 });
    }

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
