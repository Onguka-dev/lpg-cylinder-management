import type { AppSession } from "@/lib/auth-types";

export function requireAdminSession(session: AppSession | null) {
  if (!session) {
    return { ok: false as const, status: 401, error: "Sign in to continue." };
  }

  if (session.user.role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "Only Admin users can manage master data." };
  }

  return { ok: true as const };
}

export function normalizeMasterDataInput(input: {
  code: string;
  name: string;
  description?: string | null;
  amount?: number | null;
  rate?: number | null;
  capacityKg?: number | null;
  threshold?: number | null;
  parentId?: string | null;
  isActive?: boolean;
}) {
  return {
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    amount: input.amount ?? null,
    rate: input.rate ?? null,
    capacityKg: input.capacityKg ?? null,
    threshold: input.threshold ?? null,
    parentId: input.parentId || null,
    isActive: input.isActive ?? true,
    metadata: {}
  };
}
