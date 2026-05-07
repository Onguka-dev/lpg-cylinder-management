import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { barcodeScanSchema, canTriggerIntegrations } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to capture barcode/RFID scans." }, { status: 401 });
  if (!canTriggerIntegrations(session.user.role)) return NextResponse.json({ error: "Your role cannot capture barcode/RFID scans." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = barcodeScanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check barcode/RFID input." }, { status: 400 });

  const response = await fetch(new URL("/api/integrations/logs", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") ?? "" },
    body: JSON.stringify({
      providerType: "BARCODE_RFID",
      action: "SCAN_BARCODE_RFID",
      relatedRecord: parsed.data.relatedRecord,
      payload: parsed.data
    })
  });
  const result = await response.json();
  await prisma.auditLog.create({ data: { action: "BARCODE_RFID_CAPTURED", details: `Captured scan ${parsed.data.scanValue}.`, userId: session.user.id } });
  return NextResponse.json(result, { status: response.status });
}
