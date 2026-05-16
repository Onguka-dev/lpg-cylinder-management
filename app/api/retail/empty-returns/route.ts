import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getSalesLocationForSession } from "@/lib/refill-sales-access";
import { canManageEmptyReturns, emptyReturnSchema } from "@/lib/reverse-logistics";
import { recordCustomerEmptyReturn, reverseLogisticsErrorMessage } from "@/lib/reverse-logistics-posting";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to record empty returns." }, { status: 401 });
  if (!canManageEmptyReturns(session.user.role)) return NextResponse.json({ error: "Your role cannot record customer empty returns." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = emptyReturnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the empty return form." }, { status: 400 });
  }

  const locationId = session.user.role === "ADMIN"
    ? parsed.data.locationId || null
    : await getSalesLocationForSession(session);
  if (!locationId) return NextResponse.json({ error: "No assigned selling point found for this user." }, { status: 400 });

  try {
    const cylinder = await recordCustomerEmptyReturn(prisma, parsed.data, locationId, session.user.id);
    return NextResponse.json({ cylinder }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const message = reverseLogisticsErrorMessage(error.message);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
