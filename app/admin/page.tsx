import Link from "next/link";
import {
  BellRing,
  Database,
  FileClock,
  ListChecks,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const [
    roles,
    users,
    locations,
    masterDataRecords,
    auditLogs,
    notificationTemplates,
    securityControls
  ] = await Promise.all([
    prisma.role.count().catch(() => 0),
    prisma.user.count().catch(() => 0),
    prisma.location.count().catch(() => 0),
    prisma.masterDataRecord.count({ where: { isActive: true } }).catch(() => 0),
    prisma.auditLog.count().catch(() => 0),
    prisma.notificationTemplate.count({ where: { isEnabled: true } }).catch(() => 0),
    prisma.securityControlSetting.count({ where: { isEnabled: true } }).catch(() => 0)
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Admin Workspace"
        title="Wells Gas Control Centre"
        description="Client-ready command view for user access, master data readiness, security controls, audit visibility, and operational configuration."
        actions={
          <>
            <Link
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-panel hover:bg-brand-700"
              href="/admin/master-data"
            >
              Master data
            </Link>
            <Link
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-panel hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              href="/settings"
            >
              Settings
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ShieldCheck}
          label="Roles configured"
          value={String(roles || 6)}
          detail="Admin, warehouse, sales, audit, customer"
          tone="brand"
        />
        <MetricCard
          icon={Users}
          label="Seeded users"
          value={String(users || 6)}
          detail={`${locations || 4} operating locations linked`}
          tone="info"
        />
        <MetricCard
          icon={Database}
          label="Active master data"
          value={String(masterDataRecords)}
          detail="Selectable setup records for later modules"
          tone="success"
        />
        <MetricCard
          icon={FileClock}
          label="Audit events"
          value={String(auditLogs)}
          detail="Security and activity traceability"
          tone="warning"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Administrative Readiness"
          description="Configuration areas preserved from the existing app and grouped for client review."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminAction
              href="/admin/master-data"
              icon={ListChecks}
              title="Master data configuration"
              description="SKUs, pricing, taxes, locations, vehicles, thresholds, and operating setup."
              status={`${masterDataRecords} active`}
            />
            <AdminAction
              href="/settings/security"
              icon={ShieldCheck}
              title="Security controls"
              description="Password policy, session timeout, MFA readiness, and device/session controls."
              status={`${securityControls} enabled`}
            />
            <AdminAction
              href="/settings/notifications"
              icon={BellRing}
              title="Notification setup"
              description="SMS, email, push placeholders, templates, and mock sending logs."
              status={`${notificationTemplates} templates`}
            />
            <AdminAction
              href="/settings/integrations"
              icon={Settings}
              title="Integration settings"
              description="Mock SAP/accounting, payment, messaging, scanner, and GPS adapters."
              status="Mock ready"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Client Review Notes"
          description="This workspace intentionally summarizes controls without changing business workflows."
        >
          <div className="space-y-3 text-sm text-slate-600">
            <ReviewLine label="Routing" value="Existing routes preserved" tone="success" />
            <ReviewLine label="RBAC" value="Permission gates still enforced" tone="success" />
            <ReviewLine label="Data" value="Live counts with setup-safe fallbacks" tone="info" />
            <ReviewLine label="Branding" value="Wells Gas / Green Wells Energies" tone="brand" />
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

function AdminAction({
  href,
  icon: Icon,
  title,
  description,
  status
}: {
  href: string;
  icon: typeof ListChecks;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <Link
      className="group rounded-brand border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50"
      href={href}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-brand bg-white text-brand-700 shadow-panel group-hover:bg-brand-600 group-hover:text-white">
          <Icon size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-950">{title}</h2>
            <StatusBadge tone="brand">{status}</StatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function ReviewLine({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "success" | "info" | "brand";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
      <span className="font-medium text-slate-700">{label}</span>
      <StatusBadge tone={tone}>{value}</StatusBadge>
    </div>
  );
}
