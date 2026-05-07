"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatIntegrationProvider } from "@/lib/integrations";

type SettingRecord = {
  providerType: string;
  name: string;
  isEnabled: boolean;
  endpointPlaceholder?: string | null;
  credentialPlaceholder?: string | null;
  mockFailureRate: number;
  notes?: string | null;
};

export function IntegrationSettingForm({ setting }: { setting: SettingRecord }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      providerType: setting.providerType,
      name: form.get("name"),
      isEnabled: form.get("isEnabled") === "on",
      endpointPlaceholder: form.get("endpointPlaceholder") || undefined,
      credentialPlaceholder: form.get("credentialPlaceholder") || undefined,
      mockFailureRate: form.get("mockFailureRate"),
      notes: form.get("notes") || undefined
    };
    const response = await fetch("/api/integrations/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ error: "Unable to save integration setting." }));
    if (!response.ok) {
      setError(result.error ?? "Unable to save integration setting.");
      setIsSubmitting(false);
      return;
    }
    router.refresh();
    setIsSubmitting(false);
  }

  return (
    <form className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-panel" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{formatIntegrationProvider(setting.providerType)}</h3>
          <p className="text-xs text-slate-500">Mock adapter configuration</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input name="isEnabled" type="checkbox" defaultChecked={setting.isEnabled} />
          Enabled
        </label>
      </div>
      <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="name" defaultValue={setting.name} required />
      <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="endpointPlaceholder" defaultValue={setting.endpointPlaceholder ?? ""} placeholder="Endpoint placeholder" />
      <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="credentialPlaceholder" defaultValue={setting.credentialPlaceholder ?? ""} placeholder="Credential placeholder" />
      <label className="block text-sm font-medium text-slate-700">
        Mock failure rate
        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="mockFailureRate" type="number" min="0" max="100" defaultValue={setting.mockFailureRate} />
      </label>
      <textarea className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="notes" defaultValue={setting.notes ?? ""} placeholder="Notes" />
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save setting"}</button>
    </form>
  );
}
