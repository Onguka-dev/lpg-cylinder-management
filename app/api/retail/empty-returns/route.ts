import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { createNonCodedCylinderIntake, nonCodedIntakeErrorMessage } from "@/lib/non-coded-intake-posting";
import { getSalesLocationForSession } from "@/lib/refill-sales-access";
import { canManageEmptyReturns, emptyReturnSchema } from "@/lib/reverse-logistics";
import { recordCustomerEmptyReturn, reverseLogisticsErrorMessage } from "@/lib/reverse-logistics-posting";
import { prisma } from "@/lib/prisma";
import { safeEnqueueSapPosting } from "@/lib/sap-posting";

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
    if (parsed.data.noCode) {
      const intake = await createNonCodedCylinderIntake(prisma, {
        customerId: parsed.data.customerId,
        customerQuery: parsed.data.customerPhone,
        visibleSerialNumber: parsed.data.serialNumber ?? "",
        cylinderSizeKg: parsed.data.cylinderSizeKg ?? 0,
        manufacturer: parsed.data.manufacturer,
        condition: parsed.data.condition === "NON_CODED" ? "NON_CODED" : parsed.data.condition,
        photoPlaceholder: parsed.data.photoPlaceholder,
        intakeLocationId: locationId,
        staffRemarks: parsed.data.remarks
      }, locationId, session.user.id);
      await safeEnqueueSapPosting(prisma, {
        sourceModule: "EMPTY_RETURN",
        sourceRecordId: intake.id,
        sourceReference: intake.intakeNumber,
        action: "POST_EMPTY_RETURN",
        customerId: intake.customerId,
        plantLocationId: locationId,
        storageLocationId: locationId,
        payload: {
          intakeNumber: intake.intakeNumber,
          visibleSerialNumber: intake.visibleSerialNumber,
          condition: intake.condition,
          nonCoded: true
        },
        createdById: session.user.id
      });
      return NextResponse.json({ intake }, { status: 201 });
    }

    const cylinder = await recordCustomerEmptyReturn(prisma, parsed.data, locationId, session.user.id);
    if (!cylinder) return NextResponse.json({ error: "Returned cylinder was not found." }, { status: 404 });
    await safeEnqueueSapPosting(prisma, {
      sourceModule: "EMPTY_RETURN",
      sourceRecordId: cylinder.id,
      sourceReference: cylinder.serialNumber,
      action: "POST_EMPTY_RETURN",
      skuId: cylinder.skuId,
      plantLocationId: locationId,
      storageLocationId: locationId,
      payload: {
        cylinder: cylinder.serialNumber,
        barcode: cylinder.barcode,
        status: cylinder.status
      },
      createdById: session.user.id
    });
    return NextResponse.json({ cylinder }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const message = reverseLogisticsErrorMessage(error.message) ?? nonCodedIntakeErrorMessage(error.message);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
