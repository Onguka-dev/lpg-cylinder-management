import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { canManageSafety, canViewSafety, generateSafetyReference, safetyIncidentSchema } from "@/lib/safety";
import { createMockNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to view safety incidents." }, { status: 401 });
  if (!canViewSafety(session.user.role)) return NextResponse.json({ error: "Your role cannot view safety incidents." }, { status: 403 });
  const incidents = await prisma.safetyIncident.findMany({ include: { cylinder: true, createdBy: true }, orderBy: { incidentDate: "desc" }, take: 150 });
  return NextResponse.json({ incidents });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to log safety incidents." }, { status: 401 });
  if (!canManageSafety(session.user.role)) return NextResponse.json({ error: "Your role cannot log safety incidents." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = safetyIncidentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the incident form." }, { status: 400 });

  try {
    const incident = await prisma.$transaction(async (tx) => {
      const created = await tx.safetyIncident.create({
        data: {
          incidentNumber: generateSafetyReference("INC"),
          cylinderId: parsed.data.cylinderId || null,
          title: parsed.data.title.trim(),
          severity: parsed.data.severity,
          incidentDate: new Date(parsed.data.incidentDate),
          locationId: parsed.data.locationId || null,
          description: parsed.data.description.trim(),
          correctiveAction: parsed.data.correctiveAction?.trim() || null,
          certificateUploadPlaceholder: parsed.data.certificateUploadPlaceholder?.trim() || "Certificate/document upload placeholder",
          photoUploadPlaceholder: parsed.data.photoUploadPlaceholder?.trim() || "Photo upload placeholder",
          createdById: session.user.id
        }
      });
      if (parsed.data.cylinderId) {
        await tx.cylinder.update({ where: { id: parsed.data.cylinderId }, data: { unsafeStatus: true } });
      }
      await tx.auditLog.create({ data: { action: "SAFETY_INCIDENT_LOGGED", details: `${created.incidentNumber} logged: ${created.title}.`, userId: session.user.id } });
      await createMockNotification(tx, {
        eventType: "SAFETY_WARNING",
        channel: "PUSH",
        recipientName: "Safety Team",
        recipientContact: "safety-push-placeholder",
        payload: { reference: created.incidentNumber },
        createdById: session.user.id
      });
      return created;
    });
    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Generated incident number already exists. Please try again." }, { status: 409 });
    }
    throw error;
  }
}
