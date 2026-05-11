import type { SessionUser } from "@/lib/auth-types";

export const demoUsers: SessionUser[] = [
  { id: "demo-admin", name: "Amina Okello", email: "admin@example.com", role: "ADMIN" },
  { id: "demo-warehouse", name: "Peter Mwangi", email: "warehouse@example.com", role: "WAREHOUSE_MANAGER" },
  { id: "demo-rso", name: "Grace Njeri", email: "rso@example.com", role: "RSO" },
  { id: "demo-mso", name: "David Otieno", email: "mso@example.com", role: "MSO" },
  { id: "demo-auditor", name: "Sarah Wambui", email: "auditor@example.com", role: "AUDITOR" },
  { id: "demo-customer", name: "Customer Demo", email: "customer@example.com", role: "CUSTOMER" }
];

export const DEMO_PASSWORD = "password123";

export function isDemoAuthFallbackEnabled() {
  return process.env.DEMO_AUTH_FALLBACK_ENABLED !== "false";
}

export function getDemoUser(email: string) {
  return demoUsers.find((user) => user.email === email.toLowerCase()) ?? null;
}

export function isDemoSessionId(sessionId: string) {
  return sessionId.startsWith("demo-");
}
