import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionCookieForSession, toSessionUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { defaultRouteByRole, canAccessPath } from "@/lib/rbac";
import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/session-core";
import { DEMO_PASSWORD, getDemoUser, isDemoAuthFallbackEnabled } from "@/lib/demo-auth";
import { verifyPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().nullable().optional()
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  }).catch(() => null);

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    const demoUser = getDemoUser(email);

    if (
      isDemoAuthFallbackEnabled() &&
      demoUser &&
      parsed.data.password === DEMO_PASSWORD
    ) {
      const sessionTokenId = `demo-${crypto.randomUUID()}`;
      const redirectTo =
        parsed.data.next && canAccessPath(demoUser.role, parsed.data.next)
          ? parsed.data.next
          : defaultRouteByRole[demoUser.role];
      const response = NextResponse.json({ redirectTo });

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: await createSessionCookieForSession(demoUser, sessionTokenId),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_DURATION_SECONDS
      });

      return response;
    }

    await writeAuditLog({
      action: "LOGIN_FAILED",
      category: "AUTH",
      severity: "WARNING",
      details: `Failed sign-in attempt for ${email}`,
      request
    }).catch(() => null);

    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const sessionUser = toSessionUser(user);
  const sessionTokenId = crypto.randomUUID();
  const redirectTo =
    parsed.data.next && canAccessPath(sessionUser.role, parsed.data.next)
      ? parsed.data.next
      : defaultRouteByRole[sessionUser.role];

  await prisma.userSession.create({
    data: {
      sessionTokenId,
      userId: user.id,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: request.headers.get("user-agent"),
      deviceLabel: request.headers.get("user-agent")?.slice(0, 120) ?? "Unknown device",
      mfaPlaceholder: "OTP/MFA placeholder ready; not enforced in Stage 17.",
      expiresAt: new Date(Date.now() + SESSION_DURATION_SECONDS * 1000)
    }
  });

  await writeAuditLog({
    action: "LOGIN",
    category: "AUTH",
    details: `${user.email} signed in`,
    entityType: "UserSession",
    entityId: sessionTokenId,
    request,
    userId: user.id,
    metadata: { redirectTo, mfaVerified: false }
  }).catch(() => null);

  const response = NextResponse.json({ redirectTo });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: await createSessionCookieForSession(sessionUser, sessionTokenId),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS
  });

  return response;
}
