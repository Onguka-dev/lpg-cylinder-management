import type { AppSession } from "@/lib/auth-types";

export const SESSION_COOKIE_NAME = "lpg_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 2;
export const SESSION_TIMEOUT_MINUTES = SESSION_DURATION_SECONDS / 60;

function getSecret() {
  return process.env.AUTH_SECRET ?? "stage-1-dev-session-secret-change-me";
}

function base64UrlEncode(value: string) {
  const base64 =
    typeof Buffer === "undefined"
      ? btoa(value)
      : Buffer.from(value, "utf8").toString("base64");

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  return typeof Buffer === "undefined"
    ? atob(padded)
    : Buffer.from(padded, "base64").toString("utf8");
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));

  return toHex(signature);
}

export async function createSessionToken(session: AppSession) {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = await sign(payload);

  return `${payload}.${signature}`;
}

export async function verifySessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || (await sign(payload)) !== signature) {
    return null;
  }

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as AppSession;

    if (!session.user || Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
