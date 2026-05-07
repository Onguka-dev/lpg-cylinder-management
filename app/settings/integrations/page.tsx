import Link from "next/link";
import { redirect } from "next/navigation";
import { IntegrationSettingForm } from "@/components/integration-setting-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageIntegrations } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";

export default async function IntegrationSettingsPage() {
  const session = await getCurrentSession();
  if (!session || !canManageIntegrations(session.user.role)) redirect("/unauthorized");

  const settings = await prisma.integrationSetting.findMany({ orderBy: { providerType: "asc" } });

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">Stage 16</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Integration Settings</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Configure mock adapter placeholders, credentials, enable/disable flags, and failure simulation rates. No live third-party credentials are required.
            </p>
          </div>
          <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/integrations">Integration logs</Link>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {settings.map((setting) => <IntegrationSettingForm setting={setting} key={setting.id} />)}
      </section>
    </div>
  );
}
