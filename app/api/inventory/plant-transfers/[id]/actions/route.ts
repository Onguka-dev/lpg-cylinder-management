import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  canManagePlantTransfers,
  plantReceiveSchema,
  plantReturnDispatchSchema,
  plantReturnReceiveSchema,
  refillBatchSchema
} from "@/lib/plant-refill-workflow";
import {
  createRefillBatchAndMarkFilled,
  dispatchFilledBackToWandiege,
  receiveAtPlant,
  receiveFilledBackAtWandiege
} from "@/lib/plant-refill-posting";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to update plant transfers." }, { status: 401 });
  if (!canManagePlantTransfers(session.user.role)) return NextResponse.json({ error: "Your role cannot update plant transfers." }, { status: 403 });

  const body = await request.json().catch(() => null) as { action?: string } | null;
  const action = body?.action;

  try {
    if (action === "receive-at-plant") {
      const parsed = plantReceiveSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check plant receipt scans." }, { status: 400 });
      const transfer = await receiveAtPlant(prisma, params.id, parsed.data, session.user.id);
      await audit(request, session, "PLANT_TRANSFER_RECEIVED", transfer.id, transfer.reference, `Plant received transfer ${transfer.reference}.`);
      return NextResponse.json({ transfer });
    }

    if (action === "create-refill-batch") {
      const parsed = refillBatchSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check refill batch input." }, { status: 400 });
      const batch = await createRefillBatchAndMarkFilled(prisma, params.id, { ...parsed.data, reference: parsed.data.reference.trim().toUpperCase() }, session.user.id);
      await audit(request, session, "REFILL_BATCH_FILLED", params.id, batch.reference, `Refill batch ${batch.reference} marked filled after quality check.`);
      return NextResponse.json({ batch });
    }

    if (action === "dispatch-return") {
      const parsed = plantReturnDispatchSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check return dispatch input." }, { status: 400 });
      const transfer = await dispatchFilledBackToWandiege(prisma, params.id, parsed.data, session.user.id);
      await audit(request, session, "PLANT_RETURN_DISPATCHED", transfer.id, transfer.reference, `Filled cylinders dispatched back to Wandiege for ${transfer.reference}.`);
      return NextResponse.json({ transfer });
    }

    if (action === "receive-return") {
      const parsed = plantReturnReceiveSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check return receipt scans." }, { status: 400 });
      const transfer = await receiveFilledBackAtWandiege(prisma, params.id, parsed.data, session.user.id);
      await audit(request, session, "PLANT_RETURN_RECEIVED", transfer.id, transfer.reference, `Filled cylinders received back at Wandiege for ${transfer.reference}.`);
      return NextResponse.json({ transfer });
    }

    return NextResponse.json({ error: "Choose a valid plant transfer action." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}

async function audit(request: Request, session: Awaited<ReturnType<typeof getCurrentSession>>, action: string, entityId: string, reference: string, details: string) {
  await writeAuditLog({
    action,
    category: "INVENTORY",
    details,
    entityType: "PlantTransfer",
    entityId,
    session,
    request,
    metadata: { reference }
  }).catch(() => null);
}
