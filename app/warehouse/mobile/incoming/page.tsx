import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Factory, Search } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { formatMovementStatus } from "@/lib/inventory-movements";
import { prisma } from "@/lib/prisma";

export default async function WarehouseMobileIncomingPage() {
  const session = await getCurrentSession();
  if (!session || !["ADMIN", "WAREHOUSE_MANAGER"].includes(session.user.role)) redirect("/unauthorized");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const receipts = await prisma.inventoryMovement.findMany({
    where: { type: "RECEIPT" },
    include: { sku: true, destinationLocation: true },
    orderBy: { updatedAt: "desc" },
    take: 30
  });
  const counters = {
    today: receipts.filter((item) => item.createdAt >= today).length,
    pending: receipts.filter((item) => ["REQUESTED", "APPROVED"].includes(item.status)).length,
    quality: receipts.filter((item) => item.status === "DISPATCHED" || item.status === "VARIANCE_LOGGED").length,
    verified: receipts.filter((item) => item.status === "COMPLETED").length
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      <MobileHeader title="Incoming Assets" href="/warehouse/mobile" />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["From Plant", "From Market", "From SAP"].map((tab, index) => (
          <span className={index === 0 ? "whitespace-nowrap rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"} key={tab}>
            {tab}
          </span>
        ))}
      </div>
      <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-panel">
        <Search className="text-slate-400" size={18} aria-hidden="true" />
        <input className="w-full bg-transparent text-sm outline-none" placeholder="Search GRN, truck or supplier" type="search" />
      </label>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Counter label="Today" value={counters.today} />
        <Counter label="Pending" value={counters.pending} />
        <Counter label="In quality check" value={counters.quality} />
        <Counter label="Verified" value={counters.verified} />
      </section>
      <SectionCard title="GRN cards" description="Tap a card to continue in the existing inventory movement workflow.">
        <div className="space-y-3">
          {receipts.map((receipt) => (
            <Link className="block rounded-2xl border border-slate-200 bg-slate-50 p-4" href={`/inventory/movements/${receipt.id}`} key={receipt.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <Factory size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-950">{receipt.reference}</p>
                    <p className="mt-1 text-sm text-slate-500">Source: Plant / Market placeholder</p>
                    <p className="mt-1 text-sm text-slate-500">Truck: {receipt.notes?.match(/Vehicle: ([^|]+)/)?.[1]?.trim() ?? "Not captured"}</p>
                  </div>
                </div>
                <StatusBadge tone={receipt.status === "COMPLETED" ? "success" : "warning"}>{formatMovementStatus(receipt.status)}</StatusBadge>
              </div>
              <p className="mt-3 text-sm text-slate-500">Received {receipt.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {receipt.requestedQuantity} asset(s)</p>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function MobileHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white" href={href}>
        <ArrowLeft size={18} aria-hidden="true" />
      </Link>
      <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
