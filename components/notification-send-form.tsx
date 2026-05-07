"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  formatNotificationChannel,
  formatNotificationEvent,
  notificationChannels,
  notificationEventTypes
} from "@/lib/notifications";

export function NotificationSendForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      eventType: formData.get("eventType"),
      channel: formData.get("channel"),
      recipientName: formData.get("recipientName") || undefined,
      recipientContact: formData.get("recipientContact"),
      subject: formData.get("subject") || undefined,
      message: formData.get("message")
    };
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ error: "Unable to create notification." }));
    if (!response.ok) {
      setError(result.error ?? "Unable to create notification.");
      setIsSubmitting(false);
      return;
    }
    router.push("/notifications");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Event trigger
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="eventType" defaultValue="CUSTOMER_ORDER_CONFIRMATION">
            {notificationEventTypes.map((eventType) => (
              <option value={eventType} key={eventType}>{formatNotificationEvent(eventType)}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Channel
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="channel" defaultValue="SMS">
            {notificationChannels.map((channel) => (
              <option value={channel} key={channel}>{formatNotificationChannel(channel)}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Recipient name
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="recipientName" placeholder="Customer or staff name" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Recipient contact
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="recipientContact" placeholder="+254..., email, or push target" required />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Subject
        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="subject" placeholder="Subject placeholder" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Message
        <textarea className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="message" defaultValue="Your LPG notification placeholder has been created." required />
      </label>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="flex gap-3">
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Mock send"}</button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
