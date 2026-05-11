import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { canViewInventoryMovements } from "@/lib/inventory-movements";
import { prisma } from "@/lib/prisma";
import { scannerValidationSchema, validateAndLogCylinderScan } from "@/lib/scanning";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sign in to scan cylinders." }, { status: 401 });
  }

  if (!canViewInventoryMovements(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot scan cylinders." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = scannerValidationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the scan input and try again." },
      { status: 400 }
    );
  }

  const result = await validateAndLogCylinderScan(prisma, parsed.data, session.user.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
