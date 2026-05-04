import { cookies } from "next/headers";
import type { AppRole, AppSession, SessionUser } from "@/lib/auth-types";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  verifySessionToken
} from "@/lib/session-core";

export async function getCurrentSession() {
  return verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
}

export async function createSessionCookie(user: SessionUser) {
  const session: AppSession = {
    user,
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000
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
