import { notFound, redirect } from "next/navigation";
import { NotificationTemplateForm } from "@/components/notification-template-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export default async function EditNotificationTemplatePage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session || !canManageNotifications(session.user.role)) redirect("/unauthorized");

  const template = await prisma.notificationTemplate.findUnique({ where: { id: params.id } });
  if (!template) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 14</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Edit Notification Template</h1>
        <p className="mt-3 text-sm text-slate-600">Use token placeholders such as {"{{reference}}"}, {"{{status}}"}, {"{{sku}}"}, and {"{{location}}"} for later workflow events.</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <NotificationTemplateForm template={template} />
      </section>
    </div>
  );
}
