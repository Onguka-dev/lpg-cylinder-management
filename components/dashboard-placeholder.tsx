import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { skuPreviewItems } from "@/lib/navigation";
import { StageFormPlaceholder } from "@/components/stage-form-placeholder";

type Stat = {
  label: string;
  value: string;
};

type DashboardPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats?: Stat[];
};

export function DashboardPlaceholder({
  eyebrow,
  title,
  description,
  stats = []
}: DashboardPlaceholderProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-brand border border-slate-200 bg-white shadow-soft">
        <div className="h-1.5 bg-gradient-to-r from-primary-700 via-brand-600 to-info-600" />
        <div className="p-5 sm:p-6">
          <PageHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
            actions={
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-brand bg-fuel-500 text-white shadow-panel">
                <ClipboardList size={28} aria-hidden="true" />
              </div>
            }
          />
        </div>
      </section>

      {stats.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <MetricCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              tone="brand"
            />
          ))}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Workflow Placeholder">
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Wells Gas operational workflows are available from the sidebar based
            on each user role. Advanced actions that are not yet connected to
            live providers remain clearly marked as placeholders.
          </p>
          <EmptyState
            className="mt-5"
            title="No workflow data yet."
            description="This screen is ready for client walkthroughs while future detailed workflow data is added in the relevant module."
          />
          <div className="mt-4">
            <StageFormPlaceholder title="Future Form Placeholder" />
          </div>
        </SectionCard>

        <SectionCard title="Seed SKU Types">
          <div className="mt-4 space-y-3">
            {skuPreviewItems.map((sku) => (
              <div
                className="flex items-center justify-between gap-3 rounded-brand border border-slate-100 bg-slate-50 px-3 py-3"
                key={sku.name}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{sku.name}</p>
                  <p className="text-xs text-slate-500">{sku.detail}</p>
                </div>
                <StatusBadge tone="brand">LPG</StatusBadge>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
