import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionCookie, toSessionUser } from "@/lib/auth";
import { defaultRouteByRole, canAccessPath } from "@/lib/rbac";
import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/session-core";
import { verifyPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().nullable().optional()
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { role: true }
  });

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const sessionUser = toSessionUser(user);
  const redirectTo =
    parsed.data.next && canAccessPath(sessionUser.role, parsed.data.next)
      ? parsed.data.next
      : defaultRouteByRole[sessionUser.role];

  await prisma.auditLog.create({
    data: {
      action: "LOGIN",
      details: `${user.email} signed in`,
      userId: user.id
    }
  });

  const response = NextResponse.json({ redirectTo });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: await createSessionCookie(sessionUser),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS
  });

  return response;
}
