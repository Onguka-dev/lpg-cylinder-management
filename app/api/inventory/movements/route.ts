import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import {
  getAssignedMasterLocationId,
  movementTouchesAssignedLocation,
  requireMovementRequestSession,
  requireMovementViewSession
} from "@/lib/inventory-movement-access";
import { inventoryMovementSchema, normalizeInventoryMovementInput } from "@/lib/inventory-movements";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  const auth = requireMovementViewSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const assignedLocationId =
    session?.user.role === "RSO" || session?.user.role === "MSO" || session?.user.role === "SERVICE_CENTRE_STAFF"
      ? await getAssignedMasterLocationId(session.user.id)
      : null;

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      AND: [
        query
          ? {
              OR: [
                { reference: { contains: query, mode: "insensitive" } },
                { sku: { name: { contains: query, mode: "insensitive" } } },
                { sourceLocation: { name: { contains: query, mode: "insensitive" } } },
                { destinationLocation: { name: { contains: query, mode: "insensitive" } } }
              ]
            }
          : {},
        assignedLocationId
          ? {
              OR: [
                { sourceLocationId: assignedLocationId },
                { destinationLocationId: assignedLocationId }
              ]
            }
          : {}
      ]
    },
    include: {
      sku: true,
      sourceLocation: true,
      destinationLocation: true,
      requestedBy: true
    },
    orderBy: { updatedAt: "desc" },
    take: 150
  });

  return NextResponse.json({ movements });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const auth = requireMovementRequestSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = inventoryMovementSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the movement form and try again." },
      { status: 400 }
    );
  }

  const data = normalizeInventoryMovementInput(parsed.data);

  if (session?.user.role === "RSO" || session?.user.role === "MSO" || session?.user.role === "SERVICE_CENTRE_STAFF") {
    const assignedLocationId = await getAssignedMasterLocationId(session.user.id);
    if (
      !movementTouchesAssignedLocation({
        assignedLocationId,
        sourceLocationId: data.sourceLocationId,
        destinationLocationId: data.destinationLocationId
      })
    ) {
      return NextResponse.json(
        { error: "Sales and service users can request stock only for their assigned location." },
        { status: 403 }
      );
    }
  }

  try {
    const movement = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryMovement.create({
        data: {
          ...data,
          requestedById: session?.user.id
        }
      });

      await tx.inventoryMovementHistory.create({
        data: {
          movementId: created.id,
          toStatus: created.status,
          action: "Movement requested",
          details: `${created.type} request for ${created.requestedQuantity} cylinder(s).`,
          changedById: session?.user.id
        }
      });

      return created;
    });

    return NextResponse.json({ movement }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A movement with this reference already exists." }, { status: 409 });
    }

    throw error;
  }
}
