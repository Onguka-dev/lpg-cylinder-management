"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Option = { id: string; name: string; code?: string; orderNumber?: string; customerName?: string };

export function DeliveryAssignmentForm({
  orders,
  routes,
  zones,
  vehicles,
  users
}: {
  orders: Option[];
  routes: Option[];
  zones: Option[];
  vehicles: Option[];
  users: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      orderId: formData.get("orderId"),
      routeId: formData.get("routeId") || undefined,
      zoneId: formData.get("zoneId") || undefined,
      vehicleId: formData.get("vehicleId") || undefined,
      assignedUserId: formData.get("assignedUserId") || undefined,
      driverName: formData.get("driverName") || undefined
    };

    const response = await fetch("/api/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({ error: "Unable to assign delivery." }))) as {
      delivery?: { id: string };
      error?: string;
    };
    if (!response.ok) {
      setError(result.error ?? "Unable to assign delivery.");
      setIsSubmitting(false);
      return;
    }
    router.push(`/deliveries/${result.delivery?.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        Order
        <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="orderId" required>
          <option value="">Select order...</option>
          {orders.map((order) => (
            <option value={order.id} key={order.id}>
              {order.orderNumber} - {order.customerName}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Route" name="routeId" options={routes} />
        <Select label="Zone" name="zoneId" options={zones} />
        <Select label="Vehicle" name="vehicleId" options={vehicles} />
        <Select label="Assigned MSO / Driver User" name="assignedUserId" options={users} />
        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Driver Name Placeholder
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="driverName" placeholder="Optional driver name if no user is assigned" />
        </label>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex gap-3">
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Assigning..." : "Assign delivery"}
        </button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: Option[] }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name}>
        <option value="">Select...</option>
        {options.map((option) => (
          <option value={option.id} key={option.id}>
            {option.code ? `${option.code} - ` : ""}{option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
