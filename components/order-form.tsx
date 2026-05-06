"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatOrderChannel, orderChannels } from "@/lib/orders";

type Option = { id: string; name: string; code?: string; phone?: string };
type OrderItem = { skuId?: string; quantity?: number; notes?: string | null };
type OrderRecord = {
  id?: string;
  customerId?: string;
  channel?: string;
  isPriority?: boolean;
  deliveryZoneId?: string | null;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  items?: OrderItem[];
};

export function OrderForm({ order, customers, skus, zones }: { order?: OrderRecord; customers: Option[]; skus: Option[]; zones: Option[] }) {
  const router = useRouter();
  const [items, setItems] = useState<OrderItem[]>(order?.items?.length ? order.items : [{ quantity: 1 }]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(order?.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      customerId: formData.get("customerId"),
      channel: formData.get("channel"),
      isPriority: formData.get("isPriority") === "on",
      deliveryZoneId: formData.get("deliveryZoneId") || undefined,
      expectedDeliveryDate: formData.get("expectedDeliveryDate") || undefined,
      notes: formData.get("notes") || undefined,
      items: items.map((_, index) => ({
        skuId: formData.get(`skuId-${index}`),
        quantity: formData.get(`quantity-${index}`),
        notes: formData.get(`notes-${index}`) || undefined
      }))
    };
    const response = await fetch(isEditing ? `/api/orders/${order?.id}` : "/api/orders", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({ error: "Unable to save this order." }))) as { order?: { id: string }; error?: string };
    if (!response.ok) {
      setError(result.error ?? "Unable to save this order.");
      setIsSubmitting(false);
      return;
    }
    router.push(`/orders/${result.order?.id ?? order?.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Customer
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="customerId" defaultValue={order?.customerId ?? ""} required>
            <option value="">Select customer...</option>
            {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} {customer.phone ? `- ${customer.phone}` : ""}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Channel
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="channel" defaultValue={order?.channel ?? "RSO"}>
            {orderChannels.map((channel) => <option value={channel} key={channel}>{formatOrderChannel(channel)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Delivery Zone
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="deliveryZoneId" defaultValue={order?.deliveryZoneId ?? ""}>
            <option value="">Select zone...</option>
            {zones.map((zone) => <option value={zone.id} key={zone.id}>{zone.code} - {zone.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Expected Delivery Date
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="expectedDeliveryDate" type="date" defaultValue={order?.expectedDeliveryDate ?? ""} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input name="isPriority" type="checkbox" defaultChecked={order?.isPriority ?? false} />
        Priority order
      </label>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">Order Items</h2>
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => setItems([...items, { quantity: 1 }])}>Add line</button>
        </div>
        {items.map((item, index) => (
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_120px_1fr_auto]" key={index}>
            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name={`skuId-${index}`} defaultValue={item.skuId ?? ""} required>
              <option value="">Select SKU...</option>
              {skus.map((sku) => <option value={sku.id} key={sku.id}>{sku.name}</option>)}
            </select>
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name={`quantity-${index}`} type="number" min="1" defaultValue={item.quantity ?? 1} required />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name={`notes-${index}`} placeholder="Line notes" defaultValue={item.notes ?? ""} />
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" type="button" disabled={items.length === 1} onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
          </div>
        ))}
      </section>
      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="notes" defaultValue={order?.notes ?? ""} />
      </label>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="flex gap-3">
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : isEditing ? "Save order" : "Create order"}</button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
