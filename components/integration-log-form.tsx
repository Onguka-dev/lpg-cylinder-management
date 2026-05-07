"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatIntegrationProvider, integrationActions, integrationProviderTypes } from "@/lib/integrations";

export function IntegrationLogForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      providerType: form.get("providerType"),
      action: form.get("action"),
      relatedRecord: form.get("relatedRecord") || undefined,
      forceFailure: form.get("forceFailure") === "on",
      payload: {
        reference: form.get("relatedRecord") || "manual-stage16",
        amount: form.get("amount") || undefined,
        note: form.get("note") || undefined
      }
    };
    const response = await fetch("/api/integrations/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ error: "Unable to create integration log." }));
    if (!response.ok) {
      setError(result.error ?? "Unable to create integration log.");
      setIsSubmitting(false);
      return;
    }
    router.refresh();
    setIsSubmitting(false);
    event.currentTarget.reset();
  }

  return (
    <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-panel" onSubmit={handleSubmit}>
      <h2 className="text-base font-semibold text-slate-950">Mock Integration Attempt</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Provider
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="providerType" defaultValue="SAP_ACCOUNTING">
            {integrationProviderTypes.map((provider) => <option value={provider} key={provider}>{formatIntegrationProvider(provider)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Action
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="action" defaultValue="POST_ACCOUNTING_DOCUMENT">
            {integrationActions.map((action) => <option value={action} key={action}>{action.toLowerCase().replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <Input name="relatedRecord" label="Related Record" placeholder="INV-001, RCT-001, CYL-001" />
        <Input name="amount" label="Amount Placeholder" placeholder="1200" />
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Note
        <textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="note" />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input name="forceFailure" type="checkbox" />
        Force mock failure and queue for retry
      </label>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Run mock"}</button>
    </form>
  );
}

function Input({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} placeholder={placeholder} /></label>;
}
