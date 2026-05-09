"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SecuritySettingForm({
  setting
}: {
  setting: { key: string; label: string; value: string; description: string; isEnabled: boolean };
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/security/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: setting.key,
        value: formData.get("value"),
        isEnabled: formData.get("isEnabled") === "on"
      })
    });
    const result = await response.json().catch(() => ({ error: "Unable to save security setting." }));

    if (!response.ok) {
      setMessage(result.error ?? "Unable to save security setting.");
      return;
    }

    setMessage("Saved.");
    router.refresh();
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel" onSubmit={handleSubmit}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">{setting.label}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{setting.description}</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <input name="isEnabled" type="checkbox" defaultChecked={setting.isEnabled} />
          Enabled
        </label>
      </div>
      <input
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        name="value"
        defaultValue={setting.value}
      />
      <button className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" type="submit">
        Save
      </button>
      {message ? <p className="mt-2 text-xs text-slate-500">{message}</p> : null}
    </form>
  );
}
