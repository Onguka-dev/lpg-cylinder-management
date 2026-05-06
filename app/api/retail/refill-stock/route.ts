import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requireRefillSalesViewSession, getSalesLocationForSession } from "@/lib/refill-sales-access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentSession();
  const auth = requireRefillSalesViewSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const locationId = auth.session.user.role === "ADMIN"
    ? null
    : await getSalesLocationForSession(auth.session);

  if (auth.session.user.role !== "ADMIN" && !locationId) {
    return NextResponse.json({ error: "No assigned sales location found for this RSO user." }, { status: 400 });
  }

  const grouped = await prisma.cylinder.groupBy({
    by: ["skuId"],
    where: {
      status: "FILLED",
      ...(locationId ? { currentLocationId: locationId } : {})
    },
    _count: { id: true },
    orderBy: { skuId: "asc" }
  });
  const skus = await prisma.masterDataRecord.findMany({
    where: { id: { in: grouped.map((row) => row.skuId) } },
    orderBy: { name: "asc" }
  });
  const location = locationId
    ? await prisma.masterDataRecord.findUnique({ where: { id: locationId } })
    : null;

  return NextResponse.json({
    location,
    stock: grouped.map((row) => ({
      skuId: row.skuId,
      skuName: skus.find((sku) => sku.id === row.skuId)?.name ?? "Unknown SKU",
      filledQuantity: row._count.id
    }))
  });
}
