import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Barcode, ClipboardCheck, ShieldCheck, Truck } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WarehouseMobileTasksPage() {
  const session = await getCurrentSession();
  if (!session || !["ADMIN", "WAREHOUSE_MANAGER"].includes(session.user.role)) redirect("/unauthorized");

  const [incoming, dispatches, quality] = await Promise.all([
    prisma.inventoryMovement.count({ where: { type: "RECEIPT", status: { in: ["REQUESTED", "APPROVED"] } } }),
    prisma.delivery.count({ where: { status: { in: ["ASSIGNED", "LOADING_CONFIRMED"] } } }),
    prisma.maintenanceCase.count({ where: { status: { in: ["OPEN", "INSPECTION_RECORDED", "QUARANTINED"] } } })
  ]);
  const tasks = [
    { title: "Verify incoming batch", category: "Today", due: "09:30", priority: incoming ? "High" : "Normal", icon: ClipboardCheck, href: "/warehouse/mobile/incoming", count: incoming },
    { title: "Scan and tag new assets", category: "Pending", due: "11:00", priority: "Normal", icon: Barcode, href: "/warehouse/mobile/scan", count: incoming },
    { title: "Quality inspection", category: "Pending", due: "14:00", priority: quality ? "High" : "Normal", icon: ShieldCheck, href: "/warehouse/mobile/verify", count: quality },
    { title: "Dispatch loading", category: "Today", due: "16:00", priority: dispatches ? "High" : "Normal", icon: Truck, href: "/warehouse/mobile/dispatch", count: dispatches }
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <Header title="My Tasks" />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["Today", "Pending", "Completed"].map((tab, index) => (
          <span className={index === 0 ? "rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white" : "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"} key={tab}>{tab}</span>
        ))}
      </div>
      <SectionCard title="Warehouse clerk tasks" description="Task cards link back to existing movement, scan and dispatch workflows.">
        <div className="space-y-3">
          {tasks.map((task) => {
            const Icon = task.icon;
            return (
              <Link className="block rounded-2xl border border-slate-200 bg-slate-50 p-4" href={task.href} key={task.title}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                      <Icon size={20} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-950">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{task.category} · due {task.due} · {task.count} open</p>
                    </div>
                  </div>
                  <StatusBadge tone={task.priority === "High" ? "warning" : "neutral"}>{task.priority}</StatusBadge>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white" href="/warehouse/mobile">
        <ArrowLeft size={18} aria-hidden="true" />
      </Link>
      <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
    </div>
  );
}
