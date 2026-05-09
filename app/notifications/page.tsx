import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import {
  canSendNotifications,
  canViewNotifications,
  formatNotificationChannel,
  formatNotificationEvent,
  formatNotificationStatus
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export default async function NotificationsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const session = await getCurrentSession();
  if (!session || !canViewNotifications(session.user.role)) redirect("/unauthorized");

  const status = searchParams?.status;
  const eventType = searchParams?.eventType;
  const channel = searchParams?.channel;
  const q = searchParams?.q?.trim();
  const userId = searchParams?.userId;
  const dateFrom = searchParams?.dateFrom ? new Date(searchParams.dateFrom) : null;
  const [notifications, totals, settings, users] = await Promise.all([
    prisma.notification.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(eventType ? { eventType: eventType as never } : {}),
        ...(channel ? { channel: channel as never } : {}),
        ...(userId ? { createdById: userId } : {}),
        ...(dateFrom && !Number.isNaN(dateFrom.getTime()) ? { createdAt: { gte: dateFrom } } : {}),
        ...(q ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { recipientName: { contains: q, mode: "insensitive" } },
            { recipientContact: { contains: q, mode: "insensitive" } },
            { message: { contains: q, mode: "insensitive" } }
          ]
        } : {})
      },
      include: { template: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.notification.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.notificationChannelSetting.findMany({ orderBy: { channel: "asc" } }),
    prisma.user.findMany({ include: { role: true }, orderBy: { name: "asc" }, take: 100 })
  ]);

  const countFor = (value: string) => totals.find((item) => item.status === value)?._count._all ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">Stage 14</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Notification Log</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Mock SMS, email, and push notification records for order, delivery, receipt, stock, maintenance, recall, and safety events.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSendNotifications(session.user.role) ? <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/notifications/new">Mock send</Link> : null}
            <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/settings/notifications">Configuration</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        <Summary label="Pending" value={String(countFor("PENDING"))} />
        <Summary label="Sent" value={String(countFor("SENT"))} />
        <Summary label="Failed" value={String(countFor("FAILED"))} />
        <Summary label="Enabled Channels" value={String(settings.filter((setting) => setting.isEnabled).length)} />
        <Summary label="Records Shown" value={String(notifications.length)} />
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500">
            <Search size={15} aria-hidden="true" />
            <input className="w-full bg-transparent outline-none" name="q" placeholder="Search notifications" defaultValue={q ?? ""} />
          </label>
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="dateFrom" type="date" defaultValue={searchParams?.dateFrom ?? ""} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {["PENDING", "SENT", "FAILED"].map((item) => <option value={item} key={item}>{formatNotificationStatus(item)}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="channel" defaultValue={channel ?? ""}>
            <option value="">All channels</option>
            {["SMS", "EMAIL", "PUSH"].map((item) => <option value={item} key={item}>{formatNotificationChannel(item)}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="eventType" defaultValue={eventType ?? ""}>
            <option value="">All event triggers</option>
            {["CUSTOMER_ORDER_CONFIRMATION", "DELIVERY_UPDATE", "RECEIPT_ISSUED", "LOW_STOCK_ALERT", "PENDING_DELIVERY_ALERT", "MAINTENANCE_ALERT", "EMERGENCY_RECALL", "SAFETY_WARNING"].map((item) => <option value={item} key={item}>{formatNotificationEvent(item)}</option>)}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="userId" defaultValue={userId ?? ""}>
            <option value="">All users</option>
            {users.map((user) => <option value={user.id} key={user.id}>{user.name} - {user.role.name}</option>)}
          </select>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Apply filters</button>
        </div>
      </form>

      <SectionCard title="Mobile notification stream" description="Order updates, payment received, pending sync, low stock, delayed delivery, and maintenance alerts are shown as staff-friendly cards.">
        {notifications.length ? (
          <div className="grid gap-3 lg:hidden">
            {notifications.map((notification) => (
              <Link className="rounded-2xl border border-slate-200 bg-slate-50 p-4" href="/notifications" key={notification.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{notification.reference}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatNotificationEvent(notification.eventType)} · {formatNotificationChannel(notification.channel)}</p>
                  </div>
                  <StatusBadge tone={statusTone(notification.status)}>{formatNotificationStatus(notification.status)}</StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-5 text-slate-600">{notification.message}</p>
                <p className="mt-3 text-xs font-medium text-slate-400">{notification.recipientName ?? "Recipient"} · {notification.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={BellRing} title="No notifications found" description="Try clearing filters or creating a mock notification record." />
        )}
      </SectionCard>

      <section className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Reference", "Event", "Channel", "Recipient", "Status", "Created", "Message"].map((header) => <th className="px-4 py-3" key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notifications.length ? notifications.map((notification) => (
                <tr key={notification.id}>
                  <td className="px-4 py-3 font-medium text-slate-950">{notification.reference}</td>
                  <td className="px-4 py-3 text-slate-600">{formatNotificationEvent(notification.eventType)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatNotificationChannel(notification.channel)}</td>
                  <td className="px-4 py-3 text-slate-600">{notification.recipientName ?? "Recipient"}<br /><span className="text-xs text-slate-400">{notification.recipientContact}</span></td>
                  <td className="px-4 py-3"><StatusBadge tone={statusTone(notification.status)}>{formatNotificationStatus(notification.status)}</StatusBadge></td>
                  <td className="px-4 py-3 text-slate-600">{notification.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="max-w-md px-4 py-3 text-slate-600">{notification.message}</td>
                </tr>
              )) : (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No notification records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value}</p></div>;
}

function statusTone(status: string) {
  if (status === "SENT") return "success";
  if (status === "FAILED") return "danger";
  return "warning";
}
