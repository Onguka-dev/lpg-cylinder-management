import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Barcode, CheckCircle2, ClipboardList, PackagePlus } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WarehouseMobileNewAssetPage() {
  const session = await getCurrentSession();
  if (!session || !["ADMIN", "WAREHOUSE_MANAGER"].includes(session.user.role)) redirect("/unauthorized");

  const [skus, warehouse] = await Promise.all([
    prisma.masterDataRecord.findMany({ where: { type: "SKU_MASTER", isActive: true }, orderBy: { name: "asc" } }),
    prisma.masterDataRecord.findFirst({ where: { type: "WAREHOUSE", isActive: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <Link className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white" href="/warehouse/mobile">
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-950">New Asset Wizard</h1>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {["Asset info", "Details", "Verification", "Review"].map((step, index) => (
          <div className={index === 0 ? "rounded-2xl bg-brand-600 p-3 text-center text-xs font-bold text-white" : "rounded-2xl border border-slate-200 bg-white p-3 text-center text-xs font-bold text-slate-600"} key={step}>
            {step}
          </div>
        ))}
      </div>
      <SectionCard title="Asset info" description="This mobile wizard collects registration context. Final save stays with existing incoming receipt or cylinder registration workflows.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Asset type" values={["LPG Cylinder", "Vehicle mounted asset placeholder", "Regulator placeholder"]} />
          <Select label="Capacity" values={skus.map((sku) => sku.capacityKg ? `${sku.capacityKg}kg` : sku.name)} />
          <Select label="SKU" values={skus.map((sku) => `${sku.code} - ${sku.name}`)} />
          <Input label="Model / brand" placeholder="Wells Gas cylinder model" />
          <Input label="Barcode" placeholder="Scan or type barcode" icon={Barcode} />
          <Input label="Assigned warehouse" placeholder={warehouse?.name ?? "Warehouse"} />
        </div>
      </SectionCard>
      <SectionCard title="Review and continue">
        <div className="space-y-3">
          <WizardRow icon={PackagePlus} label="Register through incoming receipt" href="/warehouse/incoming" />
          <WizardRow icon={ClipboardList} label="Open cylinder registration" href="/inventory/cylinders/new" />
          <WizardRow icon={CheckCircle2} label="Verify existing asset" href="/warehouse/mobile/verify" />
          <StatusBadge tone="info">No duplicate inventory posting is created by this wizard.</StatusBadge>
        </div>
      </SectionCard>
    </div>
  );
}

function Input({ label, placeholder, icon: Icon }: { label: string; placeholder: string; icon?: typeof Barcode }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <div className="mt-2 flex min-h-12 items-center gap-2 rounded-2xl border border-slate-300 px-4">
        {Icon ? <Icon className="text-slate-400" size={18} aria-hidden="true" /> : null}
        <input className="w-full bg-transparent text-sm outline-none" placeholder={placeholder} />
      </div>
    </label>
  );
}

function Select({ label, values }: { label: string; values: string[] }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <select className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 px-4 text-sm">
        {values.map((value) => <option key={value}>{value}</option>)}
      </select>
    </label>
  );
}

function WizardRow({ icon: Icon, label, href }: { icon: typeof PackagePlus; label: string; href: string }) {
  return (
    <Link className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" href={href}>
      <Icon className="text-brand-700" size={20} aria-hidden="true" />
      <span className="text-sm font-bold text-slate-950">{label}</span>
    </Link>
  );
}
