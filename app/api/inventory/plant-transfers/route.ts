import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canManagePlantTransfers, canViewPlantTransfers, findDuplicateCodes, plantTransferSchema } from "@/lib/plant-refill-workflow";
import { createAndDispatchPlantTransfer } from "@/lib/plant-refill-posting";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to view plant transfers." }, { status: 401 });
  if (!canViewPlantTransfers(session.user.role)) return NextResponse.json({ error: "Your role cannot view plant transfers." }, { status: 403 });

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const transfers = await prisma.plantTransfer.findMany({
    where: query
      ? {
          OR: [
            { reference: { contains: query, mode: "insensitive" } },
            { vehicle: { contains: query, mode: "insensitive" } },
            { driver: { contains: query, mode: "insensitive" } },
            { sealNumber: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    include: { sourceLocation: true, plantLocation: true, returnDestination: true, _count: { select: { lines: true, varianceCases: true, refillBatches: true } } },
    orderBy: { updatedAt: "desc" },
    take: 150
  });
  return NextResponse.json({ transfers });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to create plant transfers." }, { status: 401 });
  if (!canManagePlantTransfers(session.user.role)) return NextResponse.json({ error: "Your role cannot create plant transfers." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = plantTransferSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check plant transfer input." }, { status: 400 });

  const duplicate = findDuplicateCodes(parsed.data.cylinderCodes);
  if (duplicate) return NextResponse.json({ error: `Duplicate cylinder code in dispatch list: ${duplicate}.` }, { status: 409 });

  try {
    const transfer = await createAndDispatchPlantTransfer(prisma, {
      ...parsed.data,
      reference: parsed.data.reference.trim().toUpperCase()
    }, session.user.id);

    await writeAuditLog({
      action: "PLANT_TRANSFER_DISPATCHED",
      category: "INVENTORY",
      details: `${transfer.reference} dispatched ${transfer.lines.length} empty cylinder(s) to plant.`,
      entityType: "PlantTransfer",
      entityId: transfer.id,
      session,
      request,
      metadata: { reference: transfer.reference, lineCount: transfer.lines.length }
    }).catch(() => null);

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
