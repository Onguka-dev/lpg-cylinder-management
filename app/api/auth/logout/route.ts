import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/session-core";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (session?.sessionId) {
    await prisma.userSession.updateMany({
      where: { sessionTokenId: session.sessionId, status: "ACTIVE" },
      data: { status: "LOGGED_OUT", revokedAt: new Date() }
    });

    await writeAuditLog({
      action: "LOGOUT",
      category: "AUTH",
      details: `${session.user.email} signed out`,
      entityType: "UserSession",
      entityId: session.sessionId,
      request,
      session
    });
  }

  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}
