import Link from "next/link";
import {
  BellRing,
  CheckCircle2,
  PlugZap,
  ShieldCheck,
  Smartphone,
  Wrench
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const [
    notificationTemplates,
    enabledNotificationTemplates,
    notificationChannels,
    integrationSettings,
    enabledIntegrations,
    securityControls,
    activeSessions
  ] = await Promise.all([
    prisma.notificationTemplate.count().catch(() => 0),
    prisma.notificationTemplate.count({ where: { isEnabled: true } }).catch(() => 0),
    prisma.notificationChannelSetting.count({ where: { isEnabled: true } }).catch(() => 0),
    prisma.integrationSetting.count().catch(() => 0),
    prisma.integrationSetting.count({ where: { isEnabled: true } }).catch(() => 0),
    prisma.securityControlSetting.count({ where: { isEnabled: true } }).catch(() => 0),
    prisma.userSession.count({ where: { status: "ACTIVE" } }).catch(() => 0)
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Core Module"
        title="Wells Gas Settings"
        description="Admin configuration hub for notification controls, mock integrations, security policy, and client-ready operational settings."
        actions={
          <StatusBadge tone="brand">Configuration workspace</StatusBadge>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BellRing}
          label="Notification templates"
          value={`${enabledNotificationTemplates}/${notificationTemplates}`}
          detail={`${notificationChannels} active channel setting(s)`}
          tone="brand"
        />
        <MetricCard
          icon={PlugZap}
          label="Mock integrations"
          value={`${enabledIntegrations}/${integrationSettings}`}
          detail="SAP, payment, SMS/email, scanner, and GPS placeholders"
          tone="info"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Security controls"
          value={String(securityControls)}
          detail="Password, MFA readiness, sessions, and API controls"
          tone="success"
        />
        <MetricCard
          icon={Smartphone}
          label="Active sessions"
          value={String(activeSessions)}
          detail="Current device/session records"
          tone={activeSessions ? "warning" : "neutral"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <SettingsCard
          href="/settings/notifications"
          icon={BellRing}
          title="Notification Configuration"
          description="Manage SMS, email, and push placeholders plus customer, staff, receipt, delivery, maintenance, and safety templates."
          status={`${enabledNotificationTemplates} enabled`}
        />
        <SettingsCard
          href="/settings/integrations"
          icon={PlugZap}
          title="Integration Settings"
          description="Review mock SAP/accounting, payment gateway, SMS/email, barcode/RFID, and GPS provider adapters."
          status={`${enabledIntegrations} ready`}
        />
        <SettingsCard
          href="/settings/security"
          icon={ShieldCheck}
          title="Security Controls"
          description="Review password policy, MFA readiness placeholder, session timeout, device sessions, and permission enforcement."
          status={`${securityControls} controls`}
        />
      </section>

      <SectionCard
        title="Production Readiness Notes"
        description="These controls are intentionally surfaced as placeholders or mock adapters until live vendor credentials and final policies are approved."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <ReadinessItem
            icon={CheckCircle2}
            title="Routes preserved"
            description="Settings links continue to use the existing subpages and RBAC gates."
          />
          <ReadinessItem
            icon={Wrench}
            title="Mock-first adapters"
            description="External providers stay decoupled from core LPG transactions."
          />
          <ReadinessItem
            icon={ShieldCheck}
            title="Admin controlled"
            description="Security and settings remain protected by the existing role permissions."
          />
        </div>
      </SectionCard>
    </div>
  );
}

function SettingsCard({
  title,
  description,
  href,
  icon: Icon,
  status
}: {
  title: string;
  description: string;
  href: string;
  icon: typeof BellRing;
  status: string;
}) {
  return (
    <Link
      className="group rounded-brand border border-slate-200 bg-white p-5 shadow-panel transition-colors hover:border-brand-200 hover:bg-brand-50"
      href={href}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-brand bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white">
          <Icon size={24} aria-hidden="true" />
        </div>
        <StatusBadge tone="brand">{status}</StatusBadge>
      </div>
      <h2 className="mt-4 text-base font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <p className="mt-4 text-sm font-semibold text-brand-700">Open settings</p>
    </Link>
  );
}

function ReadinessItem({
  icon: Icon,
  title,
  description
}: {
  icon: typeof CheckCircle2;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-brand border border-slate-100 bg-slate-50 p-4">
      <Icon className="text-brand-700" size={22} aria-hidden="true" />
      <h3 className="mt-3 text-sm font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
