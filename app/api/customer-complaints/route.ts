import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import {
  canManageCustomerComplaints,
  canViewCustomerComplaints,
  customerComplaintSchema,
  generateComplaintNumber,
  normalizeCustomerComplaintInput
} from "@/lib/customer-complaints";
import { getAssignedMasterLocationId } from "@/lib/inventory-movement-access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sign in to view customer complaints." }, { status: 401 });
  }

  if (!canViewCustomerComplaints(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot view customer complaints." }, { status: 403 });
  }

  const assignedLocationId =
    session.user.role === "RSO" || session.user.role === "MSO"
      ? await getAssignedMasterLocationId(session.user.id)
      : null;

  const complaints = await prisma.customerComplaint.findMany({
    where: assignedLocationId ? { locationId: assignedLocationId } : undefined,
    include: { customer: true, location: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ complaints });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sign in to submit customer complaints." }, { status: 401 });
  }

  if (!canManageCustomerComplaints(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot submit customer complaints." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = customerComplaintSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the complaint form and try again." },
      { status: 400 }
    );
  }

  const assignedLocationId =
    session.user.role === "RSO" || session.user.role === "MSO"
      ? await getAssignedMasterLocationId(session.user.id)
      : null;
  const input = normalizeCustomerComplaintInput(parsed.data);
  const locationId = assignedLocationId ?? input.locationId;

  try {
    const complaint = await prisma.$transaction(async (tx) => {
      const created = await tx.customerComplaint.create({
        data: {
          ...input,
          locationId,
          complaintNumber: generateComplaintNumber(),
          status: input.priority === "CRITICAL" ? "ESCALATED" : "SUBMITTED",
          createdById: session.user.id
        }
      });

      await tx.auditLog.create({
        data: {
          action: input.priority === "CRITICAL" ? "CUSTOMER_COMPLAINT_ESCALATED" : "CUSTOMER_COMPLAINT_SUBMITTED",
          category: "CUSTOMER",
          severity: input.priority === "CRITICAL" || input.priority === "HIGH" ? "WARNING" : "INFO",
          details: `${created.complaintNumber} submitted from retail point POS workflow.`,
          entityType: "CustomerComplaint",
          entityId: created.id,
          userId: session.user.id
        }
      });

      return created;
    });

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Complaint number collision. Please try again." }, { status: 409 });
    }

    throw error;
  }
}
