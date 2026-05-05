import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requireInventoryViewSession } from "@/lib/inventory-access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = requireInventoryViewSession(await getCurrentSession());

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const grouped = await prisma.cylinder.groupBy({
    by: ["skuId", "currentLocationId", "status"],
    _count: { id: true },
    orderBy: [{ skuId: "asc" }, { currentLocationId: "asc" }, { status: "asc" }]
  });
  const [skus, locations] = await Promise.all([
    prisma.masterDataRecord.findMany({ where: { id: { in: grouped.map((row) => row.skuId) } } }),
    prisma.masterDataRecord.findMany({ where: { id: { in: grouped.map((row) => row.currentLocationId) } } })
  ]);

  const balances = grouped.map((row) => ({
    skuId: row.skuId,
    skuName: skus.find((sku) => sku.id === row.skuId)?.name ?? "Unknown SKU",
    locationId: row.currentLocationId,
    locationName:
      locations.find((location) => location.id === row.currentLocationId)?.name ??
      "Unknown location",
    status: row.status,
    quantity: row._count.id
  }));

  return NextResponse.json({ balances });
}
