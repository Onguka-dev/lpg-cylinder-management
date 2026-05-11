import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, KeyRound, MapPin, MonitorSmartphone, Settings, ShieldCheck, UserCircle, Wifi, type LucideIcon } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { canAccessPath, roleLabel } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const assignedLocationByRole = {
  ADMIN: "Head Office Command Centre",
  WAREHOUSE_MANAGER: "Central Warehouse",
  RSO: "Retail Outlet Network",
  MSO: "Assigned Route / Vehicle",
  AUDITOR: "Audit and Compliance Desk",
  CUSTOMER: "Customer Self-Service"
};

export default async function ProfilePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/profile");

  const [user, activeSessions, pendingSync, pendingNotifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true, location: true }
    }),
    prisma.userSession.count({ where: { userId: session.user.id, status: "ACTIVE" } }).catch(() => 0),
    prisma.offlineSyncItem.count({ where: { createdById: session.user.id, status: { in: ["QUEUED", "FAILED", "CONFLICT"] } } }).catch(() => 0),
    prisma.notification.count({ where: { status: "PENDING" } }).catch(() => 0)
  ]);

  const role = session.user.role;
  const assignedLocation = user?.location?.name ?? assignedLocationByRole[role];
  const profileLinks = [
    { href: "/settings/security", icon: KeyRound, title: "Password and security", description: "Password policy, MFA readiness, and sessions." },
    { href: "/notifications", icon: BellRing, title: "Notifications", description: `${pendingNotifications} pending operational notification(s).` },
    { href: "/offline", icon: Wifi, title: "Offline data", description: "Review sync queue and saved drafts where enabled." },
    { href: "/settings", icon: Settings, title: "App settings", description: "Notification, integration, and platform controls." }
  ].filter((item) => canAccessPath(role, item.href));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Staff profile"
        title={`${roleLabel(role)} account`}
        description="Role, assigned location, device/session readiness, profile links, and app settings shortcuts."
        actions={<StatusBadge tone="success">Online</StatusBadge>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ShieldCheck} label="Role" value={roleLabel(role)} detail="Permission-controlled workspace" tone="brand" />
        <MetricCard icon={MapPin} label="Assigned location" value={assignedLocation} detail="Location/route context" tone="info" />
        <MetricCard icon={MonitorSmartphone} label="Active sessions" value={String(activeSessions)} detail="Current device/session list" tone={activeSessions ? "warning" : "neutral"} />
        <MetricCard icon={Wifi} label="Pending sync" value={String(pendingSync)} detail="Queued, failed, or conflict drafts" tone={pendingSync ? "warning" : "success"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionCard title="Profile details" description="Controlled by the existing authentication and user records.">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <UserCircle size={34} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-950">{roleLabel(role)} account</h2>
              <p className="mt-1 truncate text-sm text-slate-500">{user?.email ?? session.user.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge tone="brand">{roleLabel(role)}</StatusBadge>
                <StatusBadge tone="info">{assignedLocation}</StatusBadge>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="App settings and shortcuts" description="Links are shown only to existing role-permitted screens.">
          <div className="grid gap-3 sm:grid-cols-2">
            {profileLinks.map((item) => (
              <ProfileLink {...item} key={item.href} />
            ))}
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Profile placeholders" description="These controls keep the client-facing profile ready without changing authentication internals.">
        <div className="grid gap-3 md:grid-cols-3">
          <Placeholder title="Profile photo" description="Photo upload placeholder for staff/customer profile images." />
          <Placeholder title="Device preferences" description="Notification channel and app display preferences placeholder." />
          <Placeholder title="Change password" description="Uses the current security settings flow when enabled for production." />
        </div>
      </SectionCard>
    </div>
  );
}

function ProfileLink({
  href,
  icon: Icon,
  title,
  description
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link className="rounded-brand border border-slate-200 bg-slate-50 p-4 hover:border-brand-200 hover:bg-brand-50" href={href}>
      <Icon className="text-brand-700" size={22} aria-hidden="true" />
      <h3 className="mt-3 text-sm font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
    </Link>
  );
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-brand border border-dashed border-slate-300 bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
    </div>
  );
}
