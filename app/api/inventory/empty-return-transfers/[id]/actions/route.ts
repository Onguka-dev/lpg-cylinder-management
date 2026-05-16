import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { canReceiveEmptyReturns, emptyReturnReceiveSchema } from "@/lib/reverse-logistics";
import { receiveEmptyReturnTransfer, reverseLogisticsErrorMessage } from "@/lib/reverse-logistics-posting";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to receive empty returns." }, { status: 401 });
  if (!canReceiveEmptyReturns(session.user.role)) return NextResponse.json({ error: "Only Admin and Warehouse Manager users can receive empty returns at warehouse." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = emptyReturnReceiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the warehouse receipt scans." }, { status: 400 });
  }

  try {
    const movement = await receiveEmptyReturnTransfer(prisma, params.id, parsed.data, session.user.id);
    return NextResponse.json({ movement });
  } catch (error) {
    if (error instanceof Error) {
      const message = reverseLogisticsErrorMessage(error.message);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
