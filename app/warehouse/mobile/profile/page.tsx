import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Database, LockKeyhole, LogOut, Settings, UserCircle, Wifi } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/rbac";

export default async function WarehouseMobileProfilePage() {
  const session = await getCurrentSession();
  if (!session || !["ADMIN", "WAREHOUSE_MANAGER"].includes(session.user.role)) redirect("/unauthorized");

  const [warehouse, offlineQueue] = await Promise.all([
    prisma.masterDataRecord.findFirst({ where: { type: "WAREHOUSE", isActive: true }, orderBy: { name: "asc" } }),
    prisma.offlineSyncItem.count({ where: { status: { in: ["QUEUED", "FAILED", "CONFLICT"] } } })
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <Link className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white" href="/warehouse/mobile">
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-950">Profile</h1>
      </div>
      <section className="rounded-[1.75rem] bg-brand-700 p-5 text-white shadow-brand">
        <UserCircle size={46} aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-bold">{roleLabel(session.user.role)} account</h2>
        <p className="mt-1 text-sm text-brand-100">Warehouse clerk profile · {warehouse?.name ?? "Assigned warehouse"}</p>
        <div className="mt-4 flex gap-2">
          <StatusBadge tone="success">Online</StatusBadge>
          <StatusBadge tone={offlineQueue ? "warning" : "success"}>{offlineQueue} offline item(s)</StatusBadge>
        </div>
      </section>
      <SectionCard title="Account and app">
        <div className="space-y-3">
          <ProfileLink href="/settings/security" icon={LockKeyhole} label="Change password" detail="Security settings" />
          <ProfileLink href="/offline" icon={Database} label="Offline data" detail="Review sync queue and snapshots" />
          <ProfileLink href="/settings" icon={Settings} label="App settings" detail="Wells Gas configuration" />
          <ProfileLink href="/warehouse/mobile" icon={Wifi} label="Online / offline status" detail="Shown in header and offline workspace" />
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <LogOut className="text-slate-500" size={20} aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-slate-950">Logout</p>
            <p className="mt-1 text-sm text-slate-500">Use the top bar logout action so the existing session flow remains unchanged.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function ProfileLink({ href, icon: Icon, label, detail }: { href: string; icon: typeof UserCircle; label: string; detail: string }) {
  return (
    <Link className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" href={href}>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-700">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-950">{label}</p>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
    </Link>
  );
}
