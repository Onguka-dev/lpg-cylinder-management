import Link from "next/link";
import { BellRing, FileImage, FileText, SearchX, Share2, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { TrendChip } from "@/components/trend-chip";
import type { OperationsActivity, OperationsTaskAlert } from "@/lib/operations-experience";

export function TaskAlertPanel({ alerts }: { alerts: OperationsTaskAlert[] }) {
  const activeAlerts = alerts.filter((alert) => alert.count > 0);

  return (
    <SectionCard
      title="Tasks & Alerts"
      description="Operational work queue for verification, stock, dispatch, maintenance, delayed deliveries, inspections, and sync review."
    >
      {alerts.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {alerts.map((alert) => {
            const Icon = alert.icon;

            return (
              <Link
                className="rounded-brand border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50"
                href={alert.href}
                key={alert.key}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-700 shadow-panel">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <StatusBadge tone={alert.tone}>{alert.status}</StatusBadge>
                </div>
                <p className="mt-4 text-2xl font-bold text-slate-950">{alert.count}</p>
                <h3 className="mt-1 text-sm font-bold text-slate-900">{alert.title}</h3>
                <p className="mt-2 text-sm leading-5 text-slate-500">{alert.description}</p>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No pending tasks" description="Operational alerts will appear here as receipts, deliveries, maintenance, and sync records are created." />
      )}
      {!activeAlerts.length && alerts.length ? (
        <EmptyState className="mt-4" title="No alerts need attention" description="All visible operational checks are currently clear." />
      ) : null}
    </SectionCard>
  );
}

export function RecentActivityFeed({ activities }: { activities: OperationsActivity[] }) {
  return (
    <SectionCard
      title="Recent Activity"
      description="Live feed from receipts, dispatches, stock transfers, maintenance, payments, complaints, and customer registrations."
      actions={<TrendChip value={`${activities.length}`} label="latest" direction={activities.length ? "up" : "flat"} />}
    >
      {activities.length ? (
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = activity.icon;

            return (
              <Link
                className="grid gap-3 rounded-brand border border-slate-200 bg-white p-4 transition-colors hover:border-brand-200 hover:bg-brand-50 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                href={activity.href}
                key={activity.id}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-950">{activity.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-500">{activity.description}</span>
                </span>
                <span className="flex flex-col items-start gap-2 sm:items-end">
                  <StatusBadge tone={activity.tone}>{activity.title.includes("Payment") ? "Payment" : "Updated"}</StatusBadge>
                  <span className="text-xs font-medium text-slate-400">{formatActivityTime(activity.timestamp)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={BellRing}
          title="No recent activity yet"
          description="Receipts, dispatches, transfers, payments, customer registrations, complaints, and maintenance updates will appear here."
        />
      )}
    </SectionCard>
  );
}

export function ClientReadyEmptyStates() {
  return (
    <SectionCard title="Client-ready placeholders" description="Standard empty and unavailable states used across mobile and web workflows.">
      <div className="grid gap-3 md:grid-cols-3">
        <EmptyState title="No data yet" description="Create the first record to populate this workspace." />
        <EmptyState icon={SearchX} title="No search results" description="Adjust search terms or clear filters to see more records." />
        <EmptyState icon={BellRing} title="No alerts" description="Exceptions, low-stock warnings, and failed sync items will appear here." />
      </div>
    </SectionCard>
  );
}

export function FeaturePlaceholderPanel() {
  return (
    <SectionCard title="Attachments, export and share placeholders" description="Visible client-ready hooks for files, photos, receipts, reports, and future document outputs.">
      <div className="grid gap-3 md:grid-cols-2">
        <PlaceholderItem
          icon={FileImage}
          title="File/photo placeholders"
          description="Delivery proof, complaint attachments, GRN supporting documents, and asset photos use placeholder fields until storage is connected."
        />
        <PlaceholderItem
          icon={Share2}
          title="Receipt print/share"
          description="Receipt sharing remains a UI placeholder where browser printing or external share services are not yet enabled."
        />
        <PlaceholderItem
          icon={FileText}
          title="Report export"
          description="CSV export is live in reports. Excel, PDF, and scheduled reports remain clearly labelled future placeholders."
        />
        <PlaceholderItem
          icon={BellRing}
          title="Notification channels"
          description="SMS, email, and push providers create mock records only; live provider credentials are intentionally not required."
        />
      </div>
    </SectionCard>
  );
}

function formatActivityTime(value: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function PlaceholderItem({
  icon: Icon,
  title,
  description
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-brand border border-dashed border-slate-300 bg-slate-50 p-4">
      <Icon className="text-brand-700" size={22} aria-hidden="true" />
      <h3 className="mt-3 text-sm font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
    </div>
  );
}
