import type { AppSession } from "@/lib/auth-types";
import {
  canCreateReconciliations,
  canReviewReconciliations,
  canViewReconciliations
} from "@/lib/reconciliations";

type AuthResult =
  | { ok: true; session: AppSession }
  | { ok: false; status: 401 | 403; error: string };

export function requireReconciliationViewSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to view reconciliations." };
  if (!canViewReconciliations(session.user.role)) return { ok: false, status: 403, error: "Your role cannot view reconciliations." };
  return { ok: true, session };
}

export function requireReconciliationCreateSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to create reconciliations." };
  if (!canCreateReconciliations(session.user.role)) return { ok: false, status: 403, error: "Your role cannot create reconciliations." };
  return { ok: true, session };
}

export function requireReconciliationReviewSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to review reconciliations." };
  if (!canReviewReconciliations(session.user.role)) return { ok: false, status: 403, error: "Your role cannot review reconciliations." };
  return { ok: true, session };
}
