"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  formatOfflineSyncStatus,
  formatOfflineSyncType,
  generateOfflineClientId,
  offlineStorageKey,
  type OfflineSyncItemInput,
  type OfflineSyncStatusKey,
  type OfflineSyncItemTypeKey
} from "@/lib/offline";

type OfflineContext = {
  capturedAt: string;
  assignment: {
    vehicle?: { id: string; code: string; name: string } | null;
    route?: { id: string; code: string; name: string } | null;
    zone?: { id: string; code: string; name: string } | null;
  };
  deliveries: Array<{
    id: string;
    deliveryNumber: string;
    status: string;
    updatedAt: string;
    customerName: string;
    customerPhone: string;
    orderNumber: string;
    zoneName: string;
  }>;
  vehicleStock: Array<{ skuId: string; skuName: string; status: string; quantity: number }>;
  customers: Array<{ id: string; name: string; phone: string; proofReference: string; category: string; address: string }>;
  skus: Array<{ id: string; name: string; code: string }>;
};

type LocalItem = OfflineSyncItemInput & {
  status: OfflineSyncStatusKey;
  syncMessage?: string | null;
};

export function OfflineWorkspace({ userId, initialContext }: { userId: string; initialContext: OfflineContext }) {
  const storageKey = offlineStorageKey(userId);
  const [isOnline, setIsOnline] = useState(true);
  const [context, setContext] = useState(initialContext);
  const [items, setItems] = useState<LocalItem[]>([]);
  const [message, setMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const persist = useCallback((nextContext: OfflineContext, nextItems: LocalItem[]) => {
    window.localStorage.setItem(storageKey, JSON.stringify({ context: nextContext, items: nextItems }));
  }, [storageKey]);

  useEffect(() => {
    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { context?: OfflineContext; items?: LocalItem[] };
        if (parsed.context) setContext(parsed.context);
        if (parsed.items) setItems(parsed.items);
      } catch {
        setMessage("Stored offline data could not be read. Capture a fresh snapshot before working offline.");
      }
    } else {
      persist(initialContext, []);
    }

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [initialContext, persist, storageKey]);

  const counts = useMemo(() => ({
    queued: items.filter((item) => item.status === "QUEUED" || item.status === "FAILED").length,
    synced: items.filter((item) => item.status === "SYNCED").length,
    conflicts: items.filter((item) => item.status === "CONFLICT").length
  }), [items]);

  function saveItems(nextItems: LocalItem[]) {
    setItems(nextItems);
    persist(context, nextItems);
  }

  async function refreshSnapshot() {
    setMessage("");
    const response = await fetch("/api/offline/context");
    const data = await response.json().catch(() => ({ error: "Unable to refresh offline snapshot." }));
    if (!response.ok) {
      setMessage(data.error ?? "Unable to refresh offline snapshot.");
      return;
    }
    const snapshotItems: LocalItem[] = [
      buildLocalItem({
        type: "ASSIGNED_DELIVERY_SNAPSHOT",
        payload: { capturedAt: data.capturedAt, data: data.deliveries }
      }),
      buildLocalItem({
        type: "VEHICLE_STOCK_SNAPSHOT",
        payload: { capturedAt: data.capturedAt, data: data.vehicleStock }
      })
    ];
    const nextItems = [...snapshotItems, ...items].slice(0, 75);
    setContext(data);
    setItems(nextItems);
    persist(data, nextItems);
    setMessage("Offline snapshot refreshed and saved in this browser.");
  }

  function enqueue(input: { type: OfflineSyncItemTypeKey; payload: unknown }, contextOverride = context) {
    const item: LocalItem = {
      ...buildLocalItem(input),
      status: "QUEUED"
    };
    const nextItems = [item, ...items].slice(0, 75);
    setItems(nextItems);
    window.localStorage.setItem(storageKey, JSON.stringify({ context: contextOverride, items: nextItems }));
  }

  async function syncQueue() {
    setMessage("");
    if (!isOnline) {
      setMessage("You are offline. Drafts are safe in this browser and will sync when you are online.");
      return;
    }

    const pending = items.filter((item) => item.status === "QUEUED" || item.status === "FAILED");
    if (!pending.length) {
      setMessage("No queued offline drafts to sync.");
      return;
    }

    setIsSyncing(true);
    const response = await fetch("/api/offline/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: pending })
    });
    const data = await response.json().catch(() => ({ error: "Unable to sync offline drafts." }));
    if (!response.ok) {
      setMessage(data.error ?? "Unable to sync offline drafts.");
      setIsSyncing(false);
      return;
    }

    const resultMap = new Map<string, { status: OfflineSyncStatusKey; conflictReason?: string | null; failedReason?: string | null }>(
      data.results.map((result: { clientId: string; status: OfflineSyncStatusKey; conflictReason?: string | null; failedReason?: string | null }) => [result.clientId, result])
    );
    const nextItems = items.map((item) => {
      const result = resultMap.get(item.clientId);
      if (!result) return item;
      return {
        ...item,
        status: result.status,
        syncMessage: result.conflictReason ?? result.failedReason ?? null
      };
    });
    saveItems(nextItems);
    setIsSyncing(false);
    setMessage(`Synced ${data.results.length} offline item(s). Review conflicts before posting changes to live records.`);
  }

  function clearSynced() {
    saveItems(items.filter((item) => item.status !== "SYNCED"));
    setMessage("Synced offline items cleared from this browser.");
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-4">
        <Summary label="Connection" value={isOnline ? "Online" : "Offline"} tone={isOnline ? "good" : "warn"} />
        <Summary label="Queued / Failed" value={String(counts.queued)} />
        <Summary label="Synced" value={String(counts.synced)} tone="good" />
        <Summary label="Conflicts" value={String(counts.conflicts)} tone={counts.conflicts ? "warn" : "default"} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Offline Snapshot</h2>
            <p className="mt-1 text-sm text-slate-500">Saved locally for MSO field work and delivery proof drafts.</p>
            <p className="mt-2 text-xs text-slate-400">Captured: {new Date(context.capturedAt).toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" type="button" onClick={refreshSnapshot}>Refresh snapshot</button>
            <button className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70" type="button" onClick={syncQueue} disabled={isSyncing}>{isSyncing ? "Syncing..." : "Sync queue"}</button>
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" type="button" onClick={clearSynced}>Clear synced</button>
          </div>
        </div>
        {message ? <p className="mt-4 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-800">{message}</p> : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <Panel title="Assigned Deliveries">
            {context.deliveries.length ? context.deliveries.map((delivery) => (
              <div className="rounded-lg border border-slate-200 p-3 text-sm" key={delivery.id}>
                <p className="font-semibold text-slate-950">{delivery.deliveryNumber}</p>
                <p className="mt-1 text-slate-500">{delivery.customerName} - {delivery.status}</p>
                <p className="mt-1 text-xs text-slate-400">{delivery.zoneName}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No assigned deliveries in the offline snapshot.</p>}
          </Panel>
          <Panel title="Vehicle Stock Snapshot">
            {context.vehicleStock.length ? context.vehicleStock.map((row) => (
              <div className="flex justify-between rounded-lg border border-slate-200 p-3 text-sm" key={`${row.skuId}-${row.status}`}>
                <span>{row.skuName} - {row.status}</span>
                <span className="font-semibold text-slate-950">{row.quantity}</span>
              </div>
            )) : <p className="text-sm text-slate-500">No vehicle stock snapshot saved.</p>}
          </Panel>
        </div>

        <div className="space-y-5">
          <CustomerDraftForm onSave={enqueue} />
          <DeliveryDraftForm deliveries={context.deliveries} onSave={enqueue} />
          <FieldSaleDraftForm customers={context.customers} skus={context.skus} onSave={enqueue} />
        </div>
      </section>

      <Panel title="Sync Queue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th><th className="px-3 py-2">Message</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length ? items.map((item) => (
                <tr key={item.clientId}>
                  <td className="px-3 py-2 font-medium text-slate-900">{formatOfflineSyncType(item.type)}</td>
                  <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{formatOfflineSyncStatus(item.status)}</span></td>
                  <td className="px-3 py-2 text-slate-500">{item.clientCreatedAt ? new Date(item.clientCreatedAt).toLocaleString() : "Unknown"}</td>
                  <td className="px-3 py-2 text-slate-500">{item.syncMessage ?? "Ready"}</td>
                </tr>
              )) : <tr><td className="px-3 py-4 text-slate-500" colSpan={4}>No offline drafts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function CustomerDraftForm({ onSave }: { onSave: (input: { type: OfflineSyncItemTypeKey; payload: unknown }) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      type: "CUSTOMER_DRAFT",
      payload: {
        name: form.get("name"),
        phone: form.get("phone"),
        proofReference: form.get("proofReference"),
        category: form.get("category"),
        address: form.get("address"),
        status: "ACTIVE",
        notes: form.get("notes") || undefined
      }
    });
    event.currentTarget.reset();
  }

  return <DraftForm title="Customer Registration Draft" onSubmit={submit}>
    <Input name="name" label="Name" required />
    <Input name="phone" label="Phone" required />
    <Input name="proofReference" label="ID/Proof Reference" required />
    <Select name="category" label="Category" options={["DOMESTIC", "COMMERCIAL", "INDUSTRIAL"]} />
    <Input name="address" label="Address" required />
    <Textarea name="notes" label="Notes" />
  </DraftForm>;
}

function DeliveryDraftForm({ deliveries, onSave }: { deliveries: OfflineContext["deliveries"]; onSave: (input: { type: OfflineSyncItemTypeKey; payload: unknown }) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const delivery = deliveries.find((item) => item.id === form.get("deliveryId"));
    if (!delivery) return;
    const payload = {
      deliveryId: delivery.id,
      serverUpdatedAt: delivery.updatedAt,
      data: {
        status: form.get("status"),
        failedReason: form.get("failedReason") || undefined,
        otp: form.get("otp") || undefined,
        signaturePlaceholder: form.get("signaturePlaceholder") || undefined,
        photoPlaceholder: form.get("photoPlaceholder") || undefined,
        gpsLatitude: form.get("gpsLatitude") || undefined,
        gpsLongitude: form.get("gpsLongitude") || undefined,
        customerRemarks: form.get("customerRemarks") || undefined,
        exceptionNotes: form.get("exceptionNotes") || undefined
      }
    };
    onSave({ type: "DELIVERY_STATUS_DRAFT", payload });
    onSave({ type: "PROOF_OF_DELIVERY_DRAFT", payload });
    event.currentTarget.reset();
  }

  return <DraftForm title="Delivery Update & POD Draft" onSubmit={submit}>
    <label className="block text-sm font-medium text-slate-700">
      Delivery
      <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="deliveryId" required>
        <option value="">Select delivery...</option>
        {deliveries.map((delivery) => <option value={delivery.id} key={delivery.id}>{delivery.deliveryNumber} - {delivery.customerName}</option>)}
      </select>
    </label>
    <Select name="status" label="Status" options={["LOADING_CONFIRMED", "CUSTOMER_ARRIVAL", "DELIVERED", "FAILED", "RETURNED", "EXCEPTION"]} />
    <Select name="failedReason" label="Failed reason" options={["", "CUSTOMER_UNAVAILABLE", "DAMAGED_CYLINDER", "WRONG_LOCATION", "PAYMENT_ISSUE", "PARTIAL_DELIVERY"]} />
    <Input name="otp" label="OTP" />
    <Input name="gpsLatitude" label="GPS Latitude" />
    <Input name="gpsLongitude" label="GPS Longitude" />
    <Input name="signaturePlaceholder" label="Signature Placeholder" />
    <Input name="photoPlaceholder" label="Photo Placeholder" />
    <Textarea name="customerRemarks" label="Customer Remarks" />
    <Textarea name="exceptionNotes" label="Exception Notes" />
  </DraftForm>;
}

function FieldSaleDraftForm({ customers, skus, onSave }: { customers: OfflineContext["customers"]; skus: OfflineContext["skus"]; onSave: (input: { type: OfflineSyncItemTypeKey; payload: unknown }) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      type: "FIELD_SALE_DRAFT",
      payload: {
        customerId: form.get("customerId") || undefined,
        skuId: form.get("skuId"),
        paymentMethod: form.get("paymentMethod"),
        paymentReference: form.get("paymentReference") || undefined,
        deliveryStatus: form.get("deliveryStatus"),
        discrepancyReport: form.get("discrepancyReport") || undefined,
        offlineSyncPlaceholder: "Captured offline in Stage 15; requires review before stock posting."
      }
    });
    event.currentTarget.reset();
  }

  return <DraftForm title="Field Sale Draft" onSubmit={submit}>
    <label className="block text-sm font-medium text-slate-700">
      Customer
      <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="customerId" required>
        <option value="">Select customer...</option>
        {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} - {customer.phone}</option>)}
      </select>
    </label>
    <label className="block text-sm font-medium text-slate-700">
      SKU
      <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="skuId" required>
        <option value="">Select SKU...</option>
        {skus.map((sku) => <option value={sku.id} key={sku.id}>{sku.name}</option>)}
      </select>
    </label>
    <Select name="paymentMethod" label="Payment Method" options={["CASH", "MPESA", "CARD", "ONLINE"]} />
    <Input name="paymentReference" label="Payment Reference" />
    <Select name="deliveryStatus" label="Delivery Status" options={["DELIVERED", "PARTIAL", "FAILED", "RESCHEDULED"]} />
    <Textarea name="discrepancyReport" label="Discrepancy Report" />
  </DraftForm>;
}

function buildLocalItem(input: { type: OfflineSyncItemTypeKey; payload: unknown }): LocalItem {
  return {
    clientId: generateOfflineClientId(input.type.toLowerCase()),
    type: input.type,
    payload: input.payload,
    clientCreatedAt: new Date().toISOString(),
    status: "QUEUED"
  };
}

function DraftForm({ title, onSubmit, children }: { title: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; children: ReactNode }) {
  return <form className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-panel" onSubmit={onSubmit}>
    <h2 className="text-base font-semibold text-slate-950">{title}</h2>
    <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white" type="submit">Save offline draft</button>
  </form>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel"><h2 className="text-base font-semibold text-slate-950">{title}</h2><div className="mt-4 grid gap-3">{children}</div></section>;
}

function Summary({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" | "warn" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-slate-950";
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className={`mt-2 text-xl font-semibold ${color}`}>{value}</p></div>;
}

function Input({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} required={required} /></label>;
}

function Textarea({ name, label }: { name: string; label: string }) {
  return <label className="block text-sm font-medium text-slate-700 sm:col-span-2">{label}<textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} /></label>;
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name}>{options.map((option) => <option value={option} key={option}>{option ? option.toLowerCase().replaceAll("_", " ") : "Select..."}</option>)}</select></label>;
}
