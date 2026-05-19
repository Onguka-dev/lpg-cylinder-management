import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { canTriggerIntegrations } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { retrySapQueueItem } from "@/lib/sap-posting";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to retry SAP queue postings." }, { status: 401 });
  if (!canTriggerIntegrations(session.user.role)) return NextResponse.json({ error: "Your role cannot retry SAP postings." }, { status: 403 });

  const body = await request.json().catch(() => null) as { id?: string; forceFailure?: boolean } | null;
  if (!body?.id) return NextResponse.json({ error: "Select a SAP queue item to retry." }, { status: 400 });

  try {
    const queue = await retrySapQueueItem(prisma, body.id, Boolean(body.forceFailure));
    return NextResponse.json({ queue });
  } catch (error) {
    if (error instanceof Error && error.message === "SAP_QUEUE_ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "SAP queue item was not found." }, { status: 404 });
    }
    throw error;
  }
}
