"use client";

import { useMemo, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Barcode, FileText, PackageCheck, RefreshCw, ShoppingCart } from "lucide-react";
import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_LOCALE } from "@/lib/currency";
import { formatPaymentMethod, paymentMethods } from "@/lib/refill-sales";

type Option = { id: string; name: string; code?: string; phone?: string; capacityKg?: number | null };
type StockRow = { skuId: string; skuName: string; filledQuantity: number };
type PriceRow = { skuId: string; amount: number };
type SaleType = "FULL_CYLINDER_PLUS_GAS" | "REFILL_EXCHANGE_GAS_ONLY" | "RETURN_ONLY" | "ACCESSORIES";

export function SellingPointPosForm({
  customers,
  skus,
  stock,
  prices,
  locations,
  isAdmin
}: {
  customers: Option[];
  skus: Option[];
  stock: StockRow[];
  prices: PriceRow[];
  locations: Option[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [saleType, setSaleType] = useState<SaleType>("FULL_CYLINDER_PLUS_GAS");
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("new");
  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [emptyReturnNoQr, setEmptyReturnNoQr] = useState(false);
  const [cylinderAmount, setCylinderAmount] = useState(2500);
  const [gasAmount, setGasAmount] = useState(1200);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MPESA" | "CARD">("CASH");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSku = skus.find((sku) => sku.id === selectedSkuId);
  const selectedPrice = prices.find((price) => price.skuId === selectedSkuId)?.amount ?? 0;
  const selectedStock = stock.find((row) => row.skuId === selectedSkuId)?.filledQuantity ?? 0;
  const totalAmount = useMemo(() => (
    saleType === "FULL_CYLINDER_PLUS_GAS" ? cylinderAmount + gasAmount : selectedPrice
  ), [cylinderAmount, gasAmount, saleType, selectedPrice]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (saleType === "RETURN_ONLY" || saleType === "ACCESSORIES") {
      if (saleType === "RETURN_ONLY") {
        router.push("/retail-sales/empty-returns/new");
        return;
      }
      setError("This POS stage records full-cylinder sales and refill exchanges. Use the existing return or accessory workflow for this selected sale type.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const customerPayload = customerMode === "new"
      ? {
          name: formData.get("customerName"),
          phone: formData.get("phone"),
          proofReference: formData.get("proofReference"),
          kraPin: formData.get("kraPin") || undefined,
          category: formData.get("category"),
          address: formData.get("address"),
          status: "ACTIVE",
          documentPlaceholder: formData.get("documentPlaceholder") || undefined,
          notes: formData.get("customerNotes") || undefined
        }
      : undefined;

    const payload = saleType === "FULL_CYLINDER_PLUS_GAS"
      ? {
          customerId: customerMode === "existing" ? formData.get("customerId") : undefined,
          customer: customerPayload,
          locationId: formData.get("locationId") || undefined,
          cylinderCode: formData.get("outgoingCylinderCode"),
          paymentMethod: formData.get("paymentMethod"),
          paymentReference: formData.get("paymentReference") || undefined,
          cylinderAmount,
          gasAmount,
          notes: formData.get("notes") || undefined
        }
      : {
          customerId: customerMode === "existing" ? formData.get("customerId") : undefined,
          customer: customerPayload,
          skuId: formData.get("skuId"),
          locationId: formData.get("locationId") || undefined,
          filledCylinderCode: formData.get("outgoingCylinderCode"),
          emptyReturnCylinderCode: emptyReturnNoQr ? undefined : formData.get("emptyReturnCylinderCode"),
          emptyReturnNoQr,
          emptyReturnSerialNumber: emptyReturnNoQr ? formData.get("emptyReturnSerialNumber") : undefined,
          emptyReturnSizeKg: emptyReturnNoQr ? formData.get("emptyReturnSizeKg") : undefined,
          paymentMethod: formData.get("paymentMethod"),
          paymentReference: formData.get("paymentReference") || undefined,
          notes: formData.get("notes") || undefined
        };

    const endpoint = saleType === "FULL_CYLINDER_PLUS_GAS"
      ? "/api/retail/full-cylinder-sales"
      : "/api/retail/refill-orders";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({ error: "Unable to complete this POS sale." }))) as {
      sale?: { id: string };
      order?: { id: string };
      error?: string;
    };

    setIsSubmitting(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to complete this POS sale.");
      return;
    }

    router.push(
      result.sale?.id
        ? `/retail-sales/full-cylinder-sales/${result.sale.id}`
        : `/retail-sales/refills/${result.order?.id}`
    );
    router.refresh();
  }

  return (
    <form className="space-y-5 pb-24 sm:pb-0" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-4">
        <SaleTypeButton active={saleType === "FULL_CYLINDER_PLUS_GAS"} icon={PackageCheck} label="Full Cylinder + Gas" onClick={() => setSaleType("FULL_CYLINDER_PLUS_GAS")} />
        <SaleTypeButton active={saleType === "REFILL_EXCHANGE_GAS_ONLY"} icon={RefreshCw} label="Refill Exchange" onClick={() => setSaleType("REFILL_EXCHANGE_GAS_ONLY")} />
        <SaleTypeButton active={saleType === "RETURN_ONLY"} icon={Barcode} label="Return Only" onClick={() => setSaleType("RETURN_ONLY")} />
        <SaleTypeButton active={saleType === "ACCESSORIES"} icon={ShoppingCart} label="Accessories" onClick={() => setSaleType("ACCESSORIES")} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <button className={tabClass(customerMode === "new")} type="button" onClick={() => setCustomerMode("new")}>Register customer</button>
          <button className={tabClass(customerMode === "existing")} type="button" onClick={() => setCustomerMode("existing")}>Existing customer</button>
        </div>

        {customerMode === "existing" ? (
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Customer
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="customerId" required>
              <option value="">Search/select customer...</option>
              {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} {customer.phone ? `- ${customer.phone}` : ""}</option>)}
            </select>
          </label>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <TextInput label="Customer Name" name="customerName" required />
            <TextInput label="Phone" name="phone" required />
            <TextInput label="ID/Passport Number" name="proofReference" required />
            <TextInput label="KRA PIN" name="kraPin" />
            <label className="block text-sm font-medium text-slate-700">
              Customer Type
              <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="category" defaultValue="DOMESTIC">
                <option value="DOMESTIC">Domestic</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="INDUSTRIAL">Industrial</option>
              </select>
            </label>
            <TextInput label="Document Placeholder" name="documentPlaceholder" />
            <div className="md:col-span-2"><TextInput label="Address" name="address" required /></div>
            <div className="md:col-span-2"><TextInput label="Customer Notes" name="customerNotes" /></div>
          </div>
        )}
      </section>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
        {isAdmin ? (
          <label className="block text-sm font-medium text-slate-700">
            Sales Location
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="locationId">
              <option value="">Select location...</option>
              {locations.map((location) => <option value={location.id} key={location.id}>{location.code} - {location.name}</option>)}
            </select>
          </label>
        ) : null}

        {saleType === "REFILL_EXCHANGE_GAS_ONLY" ? (
          <label className="block text-sm font-medium text-slate-700">
            Cylinder Size / SKU
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="skuId" required value={selectedSkuId} onChange={(event) => setSelectedSkuId(event.target.value)}>
              <option value="">Select size...</option>
              {skus.map((sku) => {
                const available = stock.find((row) => row.skuId === sku.id)?.filledQuantity ?? 0;
                return <option value={sku.id} key={sku.id}>{sku.name} - {available} filled available</option>;
              })}
            </select>
          </label>
        ) : null}

        <TextInput label="Outgoing Full Cylinder Scan" name="outgoingCylinderCode" placeholder="Scan or type barcode / serial" required={saleType === "FULL_CYLINDER_PLUS_GAS" || saleType === "REFILL_EXCHANGE_GAS_ONLY"} />

        {saleType === "REFILL_EXCHANGE_GAS_ONLY" ? (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input className="h-4 w-4 rounded border-slate-300" checked={emptyReturnNoQr} onChange={(event) => setEmptyReturnNoQr(event.target.checked)} type="checkbox" />
              Returned empty has no QR/barcode
            </label>
            {emptyReturnNoQr ? (
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="Returned Empty Serial Number" name="emptyReturnSerialNumber" required />
                <label className="block text-sm font-medium text-slate-700">
                  Returned Empty Size
                  <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="emptyReturnSizeKg" required defaultValue={selectedSku?.capacityKg ?? ""}>
                    <option value="">Select size...</option>
                    <option value="6">6kg</option>
                    <option value="13">13kg</option>
                    <option value="50">50kg</option>
                  </select>
                </label>
              </div>
            ) : (
              <TextInput label="Returned Empty Cylinder Scan" name="emptyReturnCylinderCode" placeholder="Scan returned empty barcode / serial" required />
            )}
          </div>
        ) : null}

        {saleType === "FULL_CYLINDER_PLUS_GAS" ? (
          <>
            <TextInput label="Cylinder Amount" name="cylinderAmount" type="number" min="0" value={cylinderAmount} onChange={(event) => setCylinderAmount(Number(event.target.value))} />
            <TextInput label="Gas Amount" name="gasAmount" type="number" min="0" value={gasAmount} onChange={(event) => setGasAmount(Number(event.target.value))} />
          </>
        ) : null}

        <label className="block text-sm font-medium text-slate-700">
          Payment Mode
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "CASH" | "MPESA" | "CARD")}>
            {paymentMethods.map((method) => <option value={method} key={method}>{formatPaymentMethod(method)}</option>)}
          </select>
        </label>
        <TextInput label="Payment Reference" name="paymentReference" />
      </section>

      <section className="rounded-lg border border-brand-100 bg-brand-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold text-brand-950">POS receipt preview</p>
            <p className="mt-1 text-sm text-brand-800">{saleLabel(saleType)} {selectedSku ? `- ${selectedSku.name}` : ""}</p>
            {saleType === "REFILL_EXCHANGE_GAS_ONLY" ? <p className="mt-1 text-xs font-semibold text-brand-700">Filled stock available: {selectedStock}</p> : null}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold text-brand-700">Total amount</p>
            <p className="text-2xl font-bold text-brand-950">{formatMoney(totalAmount)}</p>
          </div>
        </div>
      </section>

      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="notes" />
      </label>

      {saleType === "RETURN_ONLY" || saleType === "ACCESSORIES" ? (
        <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {saleType === "RETURN_ONLY" ? "Return-only intake remains connected to the cylinder return/non-coded intake workflow." : "Accessory sales are selectable for POS planning but are not posted to inventory in this stage."}
        </p>
      ) : null}
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="sticky bottom-20 z-10 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-panel backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-70 sm:w-auto" disabled={isSubmitting} type="submit">
          <FileText size={17} aria-hidden="true" />
          {isSubmitting ? "Posting..." : "Complete POS Sale"}
        </button>
        <button className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 sm:w-auto" type="button" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function SaleTypeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      className={active ? "rounded-lg border border-brand-200 bg-brand-50 p-4 text-left text-brand-800" : "rounded-lg border border-slate-200 bg-white p-4 text-left text-slate-700 hover:border-brand-200"}
      type="button"
      onClick={onClick}
    >
      <Icon size={20} aria-hidden="true" />
      <span className="mt-3 block text-sm font-bold">{label}</span>
    </button>
  );
}

function TextInput({ label, name, ...props }: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name={name} {...props} />
    </label>
  );
}

function tabClass(active: boolean) {
  return active ? "rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white" : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700";
}

function saleLabel(saleType: SaleType) {
  const labels: Record<SaleType, string> = {
    FULL_CYLINDER_PLUS_GAS: "Full Cylinder + Gas",
    REFILL_EXCHANGE_GAS_ONLY: "Refill Exchange/Gas Only",
    RETURN_ONLY: "Return Only",
    ACCESSORIES: "Accessories"
  };
  return labels[saleType];
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(DEFAULT_CURRENCY_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(value);
}
