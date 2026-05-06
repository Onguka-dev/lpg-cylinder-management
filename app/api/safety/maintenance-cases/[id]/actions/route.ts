import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { canApproveSafety, canManageSafety, inspectionSchema } from "@/lib/safety";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to update maintenance cases." }, { status: 401 });

  const body = await request.json().catch(() => null) as { action?: string } | null;
  const action = body?.action;
  const maintenanceCase = await prisma.maintenanceCase.findUnique({
    where: { id: params.id },
    include: { cylinder: true }
  });
  if (!maintenanceCase) return NextResponse.json({ error: "Maintenance case not found." }, { status: 404 });

  if (action === "inspect") {
    if (!canManageSafety(session.user.role)) return NextResponse.json({ error: "Your role cannot record inspections." }, { status: 403 });
    const parsed = inspectionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the inspection form." }, { status: 400 });

    const failed = ["FAILED", "NEEDS_HYDRO_TEST", "UNSAFE"].includes(parsed.data.inspectionResult);
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.maintenanceCase.update({
        where: { id: maintenanceCase.id },
        data: {
          status: "INSPECTION_RECORDED",
          inspectionResult: parsed.data.inspectionResult,
          inspectionNotes: parsed.data.inspectionNotes.trim(),
          inspectedById: session.user.id,
          inspectedAt: new Date()
        }
      });
      await tx.cylinder.update({
        where: { id: maintenanceCase.cylinderId },
        data: { unsafeStatus: failed, maintenanceStatus: failed ? "IN_PROGRESS" : "CLEARED" }
      });
      await tx.auditLog.create({ data: { action: "INSPECTION_RECORDED", details: `${maintenanceCase.caseNumber} inspection result ${parsed.data.inspectionResult}.`, userId: session.user.id } });
      return saved;
    });
    return NextResponse.json({ maintenanceCase: updated });
  }

  if (action === "quarantine") {
    if (!canManageSafety(session.user.role)) return NextResponse.json({ error: "Your role cannot quarantine cylinders." }, { status: 403 });
    const quarantine = await prisma.masterDataRecord.findFirst({ where: { type: "DAMAGED_QUARANTINE_LOCATION", isActive: true }, orderBy: { code: "asc" } });
    if (!quarantine) return NextResponse.json({ error: "No damaged quarantine location is configured." }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.maintenanceCase.update({ where: { id: maintenanceCase.id }, data: { status: "QUARANTINED", quarantinedAt: new Date() } });
      await tx.cylinder.update({
        where: { id: maintenanceCase.cylinderId },
        data: { currentLocationId: quarantine.id, status: "DAMAGED", unsafeStatus: true, quarantinedStatus: true, maintenanceStatus: "IN_PROGRESS" }
      });
      await tx.cylinderHistory.create({
        data: {
          cylinderId: maintenanceCase.cylinderId,
          previousStatus: maintenanceCase.cylinder.status,
          newStatus: "DAMAGED",
          previousLocationId: maintenanceCase.cylinder.currentLocationId,
          newLocationId: quarantine.id,
          changedById: session.user.id,
          reason: `Maintenance case ${maintenanceCase.caseNumber} quarantined`
        }
      });
      await tx.auditLog.create({ data: { action: "CYLINDER_QUARANTINED", details: `${maintenanceCase.cylinder.serialNumber} moved to quarantine.`, userId: session.user.id } });
      return saved;
    });
    return NextResponse.json({ maintenanceCase: updated });
  }

  if (action === "approve-return") {
    if (!canApproveSafety(session.user.role)) return NextResponse.json({ error: "Your role cannot approve return to stock." }, { status: 403 });
    const notes = typeof (body as Record<string, unknown>)?.returnApprovalNotes === "string" ? String((body as Record<string, unknown>).returnApprovalNotes).trim() : null;
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.maintenanceCase.update({
        where: { id: maintenanceCase.id },
        data: { status: "APPROVED_RETURN_TO_STOCK", returnApprovalNotes: notes, approvedById: session.user.id, approvedAt: new Date(), closedAt: new Date() }
      });
      await tx.cylinder.update({
        where: { id: maintenanceCase.cylinderId },
        data: { status: "EMPTY", unsafeStatus: false, quarantinedStatus: false, maintenanceStatus: "CLEARED" }
      });
      await tx.cylinderHistory.create({
        data: {
          cylinderId: maintenanceCase.cylinderId,
          previousStatus: maintenanceCase.cylinder.status,
          newStatus: "EMPTY",
          previousLocationId: maintenanceCase.cylinder.currentLocationId,
          newLocationId: maintenanceCase.cylinder.currentLocationId,
          changedById: session.user.id,
          reason: `Maintenance case ${maintenanceCase.caseNumber} approved return to stock`
        }
      });
      await tx.auditLog.create({ data: { action: "CYLINDER_RETURN_TO_STOCK_APPROVED", details: `${maintenanceCase.cylinder.serialNumber} cleared for stock.`, userId: session.user.id } });
      return saved;
    });
    return NextResponse.json({ maintenanceCase: updated });
  }

  if (action === "scrap-placeholder") {
    if (!canApproveSafety(session.user.role)) return NextResponse.json({ error: "Your role cannot mark scrap placeholders." }, { status: 403 });
    const placeholder = typeof (body as Record<string, unknown>)?.scrapWriteOffPlaceholder === "string" ? String((body as Record<string, unknown>).scrapWriteOffPlaceholder).trim() : "Scrap/write-off approval placeholder";
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.maintenanceCase.update({ where: { id: maintenanceCase.id }, data: { status: "SCRAP_PLACEHOLDER", scrapWriteOffPlaceholder: placeholder, closedAt: new Date() } });
      await tx.cylinder.update({ where: { id: maintenanceCase.cylinderId }, data: { status: "DAMAGED", unsafeStatus: true, quarantinedStatus: true, maintenanceStatus: "SCRAP_PLACEHOLDER" } });
      await tx.auditLog.create({ data: { action: "CYLINDER_SCRAP_PLACEHOLDER", details: `${maintenanceCase.cylinder.serialNumber} marked for scrap/write-off placeholder.`, userId: session.user.id } });
      return saved;
    });
    return NextResponse.json({ maintenanceCase: updated });
  }

  return NextResponse.json({ error: "Choose a valid maintenance action." }, { status: 400 });
}
