import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Core Module</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Settings</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Application configuration, account preferences, notification controls, and mock integration settings for Admin users.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <SettingsCard title="Notification Configuration" description="Manage SMS, email, and push placeholders plus event templates." href="/settings/notifications" />
        <SettingsCard title="Integration Settings" description="Manage mock SAP, payment, messaging, scanner, and GPS adapters." href="/settings/integrations" />
        <SettingsCard title="Access Settings" description="Role and permission administration remains a later-stage placeholder." />
      </section>
    </div>
  );
}

function SettingsCard({ title, description, href }: { title: string; description: string; href?: string }) {
  const content = (
    <div className="h-full rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      {href ? <p className="mt-4 text-sm font-semibold text-brand-700">Open settings</p> : <p className="mt-4 text-sm font-semibold text-slate-400">Placeholder</p>}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
