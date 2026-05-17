"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";

export function RefillFollowUpReminderButton({ filter }: { filter?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createReminders() {
    setMessage("");
    setIsSubmitting(true);
    const response = await fetch("/api/customers/custody-follow-ups/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filter: filter || "DUE_REFILL_FOLLOW_UP" })
    });
    const result = (await response.json().catch(() => ({ error: "Unable to create reminders." }))) as { created?: number; error?: string };
    setIsSubmitting(false);
    if (!response.ok) {
      setMessage(result.error ?? "Unable to create reminders.");
      return;
    }
    setMessage(`${result.created ?? 0} reminder record${result.created === 1 ? "" : "s"} created.`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-60"
        disabled={isSubmitting}
        type="button"
        onClick={createReminders}
      >
        <BellRing size={16} aria-hidden="true" />
        {isSubmitting ? "Creating..." : "Create Follow-Up Reminders"}
      </button>
      {message ? <p className="text-xs font-semibold text-slate-600">{message}</p> : null}
    </div>
  );
}
