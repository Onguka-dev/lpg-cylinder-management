import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { nonCodedCylinderIntakeSchema, canCreateNonCodedCylinderIntake, canViewNonCodedCylinderIntake } from "@/lib/non-coded-intakes";
import { createNonCodedCylinderIntake, nonCodedIntakeErrorMessage } from "@/lib/non-coded-intake-posting";
import { getSalesLocationForSession } from "@/lib/refill-sales-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to view non-coded intakes." }, { status: 401 });
  if (!canViewNonCodedCylinderIntake(session.user.role)) return NextResponse.json({ error: "Your role cannot view non-coded intakes." }, { status: 403 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim();
  const query = url.searchParams.get("q")?.trim();
  const intakes = await prisma.nonCodedCylinderIntake.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(query
        ? {
            OR: [
              { intakeNumber: { contains: query, mode: "insensitive" } },
              { visibleSerialNumber: { contains: query, mode: "insensitive" } },
              { customer: { name: { contains: query, mode: "insensitive" } } },
              { customer: { phone: { contains: query, mode: "insensitive" } } },
              { customer: { email: { contains: query, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: { customer: true, intakeLocation: true, linkedCylinder: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ intakes });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to record non-coded returns." }, { status: 401 });
  if (!canCreateNonCodedCylinderIntake(session.user.role)) return NextResponse.json({ error: "Your role cannot record non-coded returns." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = nonCodedCylinderIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the non-coded return form." }, { status: 400 });
  }

  const locationId = session.user.role === "ADMIN"
    ? parsed.data.intakeLocationId || null
    : await getSalesLocationForSession(session);
  if (!locationId) return NextResponse.json({ error: "No assigned intake location found for this user." }, { status: 400 });

  try {
    const intake = await createNonCodedCylinderIntake(prisma, parsed.data, locationId, session.user.id);
    return NextResponse.json({ intake }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const message = nonCodedIntakeErrorMessage(error.message);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
