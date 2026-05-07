"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  formatNotificationChannel,
  formatNotificationEvent,
  notificationChannels,
  notificationEventTypes
} from "@/lib/notifications";

type TemplateRecord = {
  id?: string;
  eventType?: string;
  channel?: string;
  name?: string;
  subject?: string | null;
  body?: string;
  isEnabled?: boolean;
};

export function NotificationTemplateForm({ template }: { template?: TemplateRecord }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(template?.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      eventType: formData.get("eventType"),
      channel: formData.get("channel"),
      name: formData.get("name"),
      subject: formData.get("subject") || undefined,
      body: formData.get("body"),
      isEnabled: formData.get("isEnabled") === "on"
    };
    const response = await fetch(isEditing ? `/api/notifications/templates/${template?.id}` : "/api/notifications/templates", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ error: "Unable to save template." }));
    if (!response.ok) {
      setError(result.error ?? "Unable to save template.");
      setIsSubmitting(false);
      return;
    }
    router.push("/settings/notifications");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Event trigger
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="eventType" defaultValue={template?.eventType ?? "CUSTOMER_ORDER_CONFIRMATION"}>
            {notificationEventTypes.map((eventType) => (
              <option value={eventType} key={eventType}>{formatNotificationEvent(eventType)}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Channel
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="channel" defaultValue={template?.channel ?? "SMS"}>
            {notificationChannels.map((channel) => (
              <option value={channel} key={channel}>{formatNotificationChannel(channel)}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Template name
        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="name" defaultValue={template?.name ?? ""} required />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Subject
        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="subject" defaultValue={template?.subject ?? ""} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Body
        <textarea className="mt-1 min-h-36 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="body" defaultValue={template?.body ?? ""} required />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input name="isEnabled" type="checkbox" defaultChecked={template?.isEnabled ?? true} />
        Enabled
      </label>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="flex gap-3">
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save template"}</button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
