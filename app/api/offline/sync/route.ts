import { NextResponse } from "next/server";
import { Prisma, type OfflineSyncItemType } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { canUseOfflineMode, offlineSyncBatchSchema } from "@/lib/offline";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to view offline sync records." }, { status: 401 });
  if (!canUseOfflineMode(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot view offline sync records." }, { status: 403 });
  }

  const records = await prisma.offlineSyncItem.findMany({
    where: session.user.role === "MSO" ? { createdById: session.user.id } : undefined,
    include: { createdBy: true },
    orderBy: { updatedAt: "desc" },
    take: 100
  });

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in before syncing offline drafts." }, { status: 401 });
  if (!canUseOfflineMode(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot sync offline drafts." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = offlineSyncBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check offline drafts and try again." }, { status: 400 });
  }

  const results = await prisma.$transaction(async (tx) => {
    const output = [];

    for (const item of parsed.data.items) {
      const review = await reviewOfflineItem(item.type, item.payload);
      const payload = item.payload as Prisma.InputJsonValue;
      const saved = await tx.offlineSyncItem.upsert({
        where: { clientId: item.clientId },
        update: {
          type: item.type,
          payload,
          status: review.status,
          serverRecordId: review.serverRecordId,
          conflictReason: review.conflictReason,
          failedReason: review.failedReason,
          clientCreatedAt: item.clientCreatedAt ? new Date(item.clientCreatedAt) : null,
          syncedAt: review.status === "SYNCED" || review.status === "CONFLICT" ? new Date() : null,
          createdById: session.user.id
        },
        create: {
          clientId: item.clientId,
          type: item.type,
          payload,
          status: review.status,
          serverRecordId: review.serverRecordId,
          conflictReason: review.conflictReason,
          failedReason: review.failedReason,
          clientCreatedAt: item.clientCreatedAt ? new Date(item.clientCreatedAt) : null,
          syncedAt: review.status === "SYNCED" || review.status === "CONFLICT" ? new Date() : null,
          createdById: session.user.id
        }
      });
      output.push(saved);
    }

    await tx.auditLog.create({
      data: {
        action: "OFFLINE_SYNC_BATCH",
        details: `${output.length} offline item(s) synced for review; ${output.filter((item) => item.status === "CONFLICT").length} conflict(s).`,
        userId: session.user.id
      }
    });

    return output;
  });

  return NextResponse.json({ results });
}

async function reviewOfflineItem(type: OfflineSyncItemType, payload: unknown) {
  if (type === "DELIVERY_STATUS_DRAFT" || type === "PROOF_OF_DELIVERY_DRAFT") {
    const record = payload as { deliveryId?: string; serverUpdatedAt?: string };
    if (!record.deliveryId || !record.serverUpdatedAt) {
      return { status: "FAILED" as const, failedReason: "Delivery draft is missing delivery id or server timestamp." };
    }

    const delivery = await prisma.delivery.findUnique({ where: { id: record.deliveryId } });
    if (!delivery) {
      return { status: "FAILED" as const, failedReason: "Delivery no longer exists on the server." };
    }

    if (delivery.updatedAt.toISOString() !== record.serverUpdatedAt) {
      return {
        status: "CONFLICT" as const,
        serverRecordId: delivery.id,
        conflictReason: "Delivery changed on the server after the offline snapshot was captured."
      };
    }

    return { status: "SYNCED" as const, serverRecordId: delivery.id };
  }

  if (type === "FIELD_SALE_DRAFT") {
    return { status: "CONFLICT" as const, conflictReason: "Field sale drafts require stock review before server posting." };
  }

  return { status: "SYNCED" as const };
}
