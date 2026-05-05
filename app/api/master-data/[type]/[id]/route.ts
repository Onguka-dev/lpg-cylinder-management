import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { requireAdminSession, normalizeMasterDataInput } from "@/lib/master-data-access";
import { fromSlug, masterDataRecordSchema } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { type: string; id: string } }
) {
  const auth = requireAdminSession(await getCurrentSession());

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const type = fromSlug(params.type);

  if (!type) {
    return NextResponse.json({ error: "Unknown master data type." }, { status: 404 });
  }

  const record = await prisma.masterDataRecord.findFirst({
    where: { id: params.id, type },
    include: { parent: true }
  });

  if (!record) {
    return NextResponse.json({ error: "Master data record not found." }, { status: 404 });
  }

  return NextResponse.json({ record });
}

export async function PUT(
  request: Request,
  { params }: { params: { type: string; id: string } }
) {
  const auth = requireAdminSession(await getCurrentSession());

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const type = fromSlug(params.type);

  if (!type) {
    return NextResponse.json({ error: "Unknown master data type." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = masterDataRecordSchema.safeParse({ ...body, type });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 }
    );
  }

  try {
    const record = await prisma.masterDataRecord.update({
      where: { id: params.id },
      data: normalizeMasterDataInput(parsed.data)
    });

    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A record with this code already exists for this master data type." },
        { status: 409 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Master data record not found." }, { status: 404 });
    }

    throw error;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { type: string; id: string } }
) {
  const auth = requireAdminSession(await getCurrentSession());

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const type = fromSlug(params.type);

  if (!type) {
    return NextResponse.json({ error: "Unknown master data type." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { isActive?: boolean };

  const record = await prisma.masterDataRecord.update({
    where: { id: params.id },
    data: { isActive: body.isActive ?? false }
  });

  return NextResponse.json({ record });
}
