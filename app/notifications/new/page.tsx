import { redirect } from "next/navigation";
import { NotificationSendForm } from "@/components/notification-send-form";
import { getCurrentSession } from "@/lib/auth";
import { canSendNotifications } from "@/lib/notifications";

export default async function NewNotificationPage() {
  const session = await getCurrentSession();
  if (!session || !canSendNotifications(session.user.role)) redirect("/unauthorized");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 14</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Mock Send Notification</h1>
        <p className="mt-3 text-sm text-slate-600">Create a notification record and run the mock send function. Live SMS, email, and push APIs are intentionally placeholders.</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <NotificationSendForm />
      </section>
    </div>
  );
}
