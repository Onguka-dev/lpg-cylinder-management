"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppRole } from "@/lib/auth-types";
import {
  canApproveInventoryMovements,
  canDispatchInventoryMovements,
  canReceiveInventoryMovements
} from "@/lib/inventory-movements";

type MovementAction = "approve" | "reject" | "dispatch" | "receive" | "log-variance" | "complete";

export function InventoryMovementActions({
  movementId,
  status,
  requestedQuantity,
  approvedQuantity,
  dispatchedQuantity,
  userRole
}: {
  movementId: string;
  status: string;
  requestedQuantity: number;
  approvedQuantity?: number | null;
  dispatchedQuantity?: number | null;
  userRole: AppRole;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<MovementAction | null>(null);
  const defaultQuantity = dispatchedQuantity ?? approvedQuantity ?? requestedQuantity;

  async function runAction(action: MovementAction, quantity?: number, varianceReason?: string) {
    setError("");
    setBusyAction(action);

    const response = await fetch(`/api/inventory/movements/${movementId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, quantity, varianceReason })
    });
    const result = (await response.json().catch(() => ({
      error: "Unable to update this movement."
    }))) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to update this movement.");
      setBusyAction(null);
      return;
    }

    router.refresh();
    setBusyAction(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {status === "REQUESTED" && canApproveInventoryMovements(userRole) ? (
          <>
            <ActionButton label="Approve" busy={busyAction === "approve"} onClick={() => runAction("approve", requestedQuantity)} />
            <ActionButton label="Reject" tone="secondary" busy={busyAction === "reject"} onClick={() => runAction("reject")} />
          </>
        ) : null}
        {status === "APPROVED" && canDispatchInventoryMovements(userRole) ? (
          <ActionButton label="Dispatch" busy={busyAction === "dispatch"} onClick={() => runAction("dispatch", defaultQuantity)} />
        ) : null}
        {(status === "APPROVED" || status === "DISPATCHED") && canReceiveInventoryMovements(userRole) ? (
          <ActionButton label="Receive Full Quantity" busy={busyAction === "receive"} onClick={() => runAction("receive", defaultQuantity)} />
        ) : null}
        {status === "DISPATCHED" && canReceiveInventoryMovements(userRole) ? (
          <ActionButton label="Receive With Variance" tone="secondary" busy={busyAction === "receive"} onClick={() => runAction("receive", Math.max(defaultQuantity - 1, 1), "Manual variance logged during receiving.")} />
        ) : null}
        {status === "VARIANCE_LOGGED" && canApproveInventoryMovements(userRole) ? (
          <ActionButton label="Complete Variance Review" busy={busyAction === "complete"} onClick={() => runAction("complete")} />
        ) : null}
      </div>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

function ActionButton({
  label,
  busy,
  onClick,
  tone = "primary"
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
  tone?: "primary" | "secondary";
}) {
  return (
    <button
      className={
        tone === "primary"
          ? "rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
      }
      type="button"
      onClick={onClick}
      disabled={busy}
    >
      {busy ? "Working..." : label}
    </button>
  );
}
