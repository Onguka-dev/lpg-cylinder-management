import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { requireCustomerManageSession, requireCustomerViewSession } from "@/lib/customer-access";
import { customerSchema, normalizeCustomerInput } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = requireCustomerViewSession(await getCurrentSession());

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: params.id }
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  return NextResponse.json({ customer });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
      id: { not: params.id },
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

  try {
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: normalizeCustomerInput(parsed.data)
    });

    return NextResponse.json({ customer });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    throw error;
  }
}
