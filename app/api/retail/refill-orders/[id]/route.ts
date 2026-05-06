import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getSalesLocationForSession, requireRefillSalesViewSession } from "@/lib/refill-sales-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  const auth = requireRefillSalesViewSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const order = await prisma.refillOrder.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      sku: true,
      location: true,
      filledCylinder: true,
      emptyReturnCylinder: true,
      payment: true,
      createdBy: true
    }
  });

  if (!order) {
    return NextResponse.json({ error: "Refill order not found." }, { status: 404 });
  }

  if (auth.session.user.role === "RSO") {
    const assignedLocationId = await getSalesLocationForSession(auth.session);
    if (order.locationId !== assignedLocationId) {
      return NextResponse.json({ error: "This refill order is outside your assigned outlet." }, { status: 403 });
    }
  }

  return NextResponse.json({ order });
}
