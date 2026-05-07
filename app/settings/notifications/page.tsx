import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationSettingForm } from "@/components/notification-setting-form";
import { getCurrentSession } from "@/lib/auth";
import {
  canManageNotifications,
  formatNotificationChannel,
  formatNotificationEvent
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export default async function NotificationSettingsPage() {
  const session = await getCurrentSession();
  if (!session || !canManageNotifications(session.user.role)) redirect("/unauthorized");

  const [settings, templates] = await Promise.all([
    prisma.notificationChannelSetting.findMany({ orderBy: { channel: "asc" } }),
    prisma.notificationTemplate.findMany({ orderBy: [{ eventType: "asc" }, { channel: "asc" }] })
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">Stage 14</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Notification Configuration</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Enable or disable placeholder SMS, email, and push channels, then manage event templates used by later workflows.
            </p>
          </div>
          <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/notifications">Notification log</Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {settings.map((setting) => <NotificationSettingForm setting={setting} key={setting.id} />)}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Event Templates</h2>
            <p className="mt-1 text-sm text-slate-500">Customer orders, delivery updates, receipts, stock, maintenance, recall, and safety messages.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Event", "Channel", "Name", "Status", "Subject", "Action"].map((header) => <th className="px-4 py-3" key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-4 py-3 text-slate-600">{formatNotificationEvent(template.eventType)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatNotificationChannel(template.channel)}</td>
                  <td className="px-4 py-3 font-medium text-slate-950">{template.name}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{template.isEnabled ? "Enabled" : "Disabled"}</span></td>
                  <td className="px-4 py-3 text-slate-600">{template.subject ?? "No subject"}</td>
                  <td className="px-4 py-3"><Link className="text-sm font-semibold text-brand-700 hover:text-brand-800" href={`/settings/notifications/templates/${template.id}`}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
