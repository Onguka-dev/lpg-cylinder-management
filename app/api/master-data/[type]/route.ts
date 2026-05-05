import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { requireAdminSession, normalizeMasterDataInput } from "@/lib/master-data-access";
import { fromSlug, getMasterDataConfig, masterDataRecordSchema } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { type: string } }
) {
  const auth = requireAdminSession(await getCurrentSession());

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const type = fromSlug(params.type);

  if (!type) {
    return NextResponse.json({ error: "Unknown master data type." }, { status: 404 });
  }

  const records = await prisma.masterDataRecord.findMany({
    where: { type },
    orderBy: [{ isActive: "desc" }, { name: "asc" }]
  });

  return NextResponse.json({ records });
}

export async function POST(
  request: Request,
  { params }: { params: { type: string } }
) {
  const auth = requireAdminSession(await getCurrentSession());

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const type = fromSlug(params.type);
  const config = type ? getMasterDataConfig(type) : null;

  if (!type || !config) {
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
    const record = await prisma.masterDataRecord.create({
      data: {
        type,
        ...normalizeMasterDataInput(parsed.data)
      }
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A record with this code already exists for this master data type." },
        { status: 409 }
      );
    }

    throw error;
  }
}
