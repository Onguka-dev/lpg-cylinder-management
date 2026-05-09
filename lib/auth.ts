import { cookies } from "next/headers";
import type { AppRole, AppSession, SessionUser } from "@/lib/auth-types";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  verifySessionToken
} from "@/lib/session-core";
import { prisma } from "@/lib/prisma";

export async function getCurrentSession() {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);

  if (!session?.sessionId) {
    return session;
  }

  const stored = await prisma.userSession.findUnique({
    where: { sessionTokenId: session.sessionId }
  });

  if (!stored || stored.status !== "ACTIVE" || stored.expiresAt.getTime() < Date.now()) {
    if (stored?.status === "ACTIVE") {
      await prisma.userSession.update({
        where: { sessionTokenId: session.sessionId },
        data: { status: "EXPIRED" }
      });
    }
    return null;
  }

  await prisma.userSession.update({
    where: { sessionTokenId: session.sessionId },
    data: { lastSeenAt: new Date() }
  });

  return session;
}

export async function createSessionCookie(user: SessionUser) {
  const session: AppSession = {
    sessionId: crypto.randomUUID(),
    user,
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000
  };

  return createSessionToken(session);
}

export async function createSessionCookieForSession(user: SessionUser, sessionId: string) {
  const now = Date.now();
  const session: AppSession = {
    sessionId,
    user,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_SECONDS * 1000
  };

  return createSessionToken(session);
}

export function toSessionUser(user: {
  id: string;
  name: string;
  email: string;
  role: { name: AppRole };
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name
  };
}
