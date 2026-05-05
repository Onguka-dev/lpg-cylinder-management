import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requireCustomerManageSession, requireCustomerViewSession } from "@/lib/customer-access";
import { customerSchema, normalizeCustomerInput } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = requireCustomerViewSession(await getCurrentSession());

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();

  const customers = await prisma.customer.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
            { proofReference: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    take: 100
  });

  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  const auth = requireCustomerManageSession(await getCurrentSession());

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = customerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the customer form and try again." },
      { status: 400 }
    );
  }

  const duplicate = await prisma.customer.findFirst({
    where: {
      OR: [
        { phone: parsed.data.phone.trim() },
        { proofReference: parsed.data.proofReference.trim().toUpperCase() }
      ]
    }
  });

  if (duplicate?.phone === parsed.data.phone.trim()) {
    return NextResponse.json(
      { error: "A customer with this phone number already exists." },
      { status: 409 }
    );
  }

  if (duplicate?.proofReference === parsed.data.proofReference.trim().toUpperCase()) {
    return NextResponse.json(
      { error: "A customer with this ID/passport/proof reference already exists." },
      { status: 409 }
    );
  }

  const customer = await prisma.customer.create({
    data: normalizeCustomerInput(parsed.data)
  });

  return NextResponse.json({ customer }, { status: 201 });
}
