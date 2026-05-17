import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { canReviewNonCodedCylinderIntake, nonCodedIntakeReviewSchema } from "@/lib/non-coded-intakes";
import { nonCodedIntakeErrorMessage, reviewNonCodedCylinderIntake } from "@/lib/non-coded-intake-posting";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to review non-coded intakes." }, { status: 401 });
  if (!canReviewNonCodedCylinderIntake(session.user.role)) return NextResponse.json({ error: "Only Admin and Warehouse Manager can review non-coded intakes." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = nonCodedIntakeReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the review action." }, { status: 400 });
  }

  try {
    const intake = await reviewNonCodedCylinderIntake(prisma, params.id, parsed.data, session.user.id);
    await prisma.auditLog.create({
      data: {
        action: "NON_CODED_CYLINDER_INTAKE_REVIEWED",
        details: `${intake.intakeNumber} reviewed with action ${parsed.data.action}.`,
        entityType: "NonCodedCylinderIntake",
        entityId: intake.id,
        userId: session.user.id,
        metadata: { action: parsed.data.action, status: intake.status }
      }
    });
    return NextResponse.json({ intake });
  } catch (error) {
    if (error instanceof Error) {
      const message = nonCodedIntakeErrorMessage(error.message);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
