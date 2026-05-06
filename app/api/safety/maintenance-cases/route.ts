import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { maintenanceCaseSchema, canManageSafety, canViewSafety, generateSafetyReference } from "@/lib/safety";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to view maintenance cases." }, { status: 401 });
  if (!canViewSafety(session.user.role)) return NextResponse.json({ error: "Your role cannot view safety records." }, { status: 403 });

  const query = new URL(request.url).searchParams.get("q")?.trim();
  const cases = await prisma.maintenanceCase.findMany({
    where: query ? {
      OR: [
        { caseNumber: { contains: query, mode: "insensitive" } },
        { cylinder: { serialNumber: { contains: query, mode: "insensitive" } } },
        { reason: { contains: query, mode: "insensitive" } }
      ]
    } : undefined,
    include: { cylinder: { include: { sku: true, currentLocation: true } }, createdBy: true },
    orderBy: { updatedAt: "desc" },
    take: 150
  });

  return NextResponse.json({ cases });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to create maintenance cases." }, { status: 401 });
  if (!canManageSafety(session.user.role)) return NextResponse.json({ error: "Your role cannot create maintenance cases." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = maintenanceCaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the maintenance case form." }, { status: 400 });

  const cylinder = await prisma.cylinder.findUnique({ where: { id: parsed.data.cylinderId } });
  if (!cylinder) return NextResponse.json({ error: "Selected cylinder was not found." }, { status: 400 });

  try {
    const maintenanceCase = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceCase.create({
        data: {
          caseNumber: generateSafetyReference("MNT"),
          cylinderId: cylinder.id,
          reason: parsed.data.reason.trim(),
          certificateUploadPlaceholder: parsed.data.certificateUploadPlaceholder?.trim() || "Certificate upload placeholder",
          documentUploadPlaceholder: parsed.data.documentUploadPlaceholder?.trim() || "Document upload placeholder",
          createdById: session.user.id
        },
        include: { cylinder: true }
      });

      await tx.cylinder.update({
        where: { id: cylinder.id },
        data: { maintenanceStatus: "OPEN", unsafeStatus: true, status: cylinder.status === "FILLED" ? "UNDER_MAINTENANCE" : cylinder.status }
      });
      await tx.cylinderHistory.create({
        data: {
          cylinderId: cylinder.id,
          previousStatus: cylinder.status,
          newStatus: cylinder.status === "FILLED" ? "UNDER_MAINTENANCE" : cylinder.status,
          previousLocationId: cylinder.currentLocationId,
          newLocationId: cylinder.currentLocationId,
          changedById: session.user.id,
          reason: `Maintenance case ${created.caseNumber} opened`
        }
      });
      await tx.auditLog.create({
        data: { action: "MAINTENANCE_CASE_CREATED", details: `${created.caseNumber} opened for cylinder ${cylinder.serialNumber}.`, userId: session.user.id }
      });

      return created;
    });

    return NextResponse.json({ maintenanceCase }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Generated maintenance case number already exists. Please try again." }, { status: 409 });
    }
    throw error;
  }
}
