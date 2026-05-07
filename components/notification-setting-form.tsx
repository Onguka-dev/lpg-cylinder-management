"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatNotificationChannel } from "@/lib/notifications";

type SettingRecord = {
  channel: string;
  isEnabled: boolean;
  providerPlaceholder?: string | null;
  senderPlaceholder?: string | null;
};

export function NotificationSettingForm({ setting }: { setting: SettingRecord }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      channel: setting.channel,
      isEnabled: formData.get("isEnabled") === "on",
      providerPlaceholder: formData.get("providerPlaceholder") || undefined,
      senderPlaceholder: formData.get("senderPlaceholder") || undefined
    };
    const response = await fetch("/api/notifications/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ error: "Unable to save setting." }));
    if (!response.ok) {
      setError(result.error ?? "Unable to save setting.");
      setIsSubmitting(false);
      return;
    }
    router.refresh();
    setIsSubmitting(false);
  }

  return (
    <form className="space-y-3 rounded-lg border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{formatNotificationChannel(setting.channel)}</h3>
          <p className="text-xs text-slate-500">Mock channel configuration</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input name="isEnabled" type="checkbox" defaultChecked={setting.isEnabled} />
          Enabled
        </label>
      </div>
      <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="providerPlaceholder" placeholder="Provider placeholder" defaultValue={setting.providerPlaceholder ?? ""} />
      <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="senderPlaceholder" placeholder="Sender placeholder" defaultValue={setting.senderPlaceholder ?? ""} />
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save channel"}</button>
    </form>
  );
}
