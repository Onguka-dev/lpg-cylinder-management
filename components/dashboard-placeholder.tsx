import { ClipboardList } from "lucide-react";
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
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-brand-700">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              {description}
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-fuel-500 text-white">
            <ClipboardList size={28} aria-hidden="true" />
          </div>
        </div>
      </section>

      {stats.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel"
              key={stat.label}
            >
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{stat.value}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Workflow Placeholder</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Stage 5 adds inventory movement requests, approvals, dispatch,
            receiving, variance logging, and audit trails. Sales and delivery
            workflows remain placeholders until later stages.
          </p>
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
            No workflow data yet.
          </div>
          <div className="mt-4">
            <StageFormPlaceholder title="Future Form Placeholder" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Seed SKU Types</h2>
          <div className="mt-4 space-y-3">
            {skuPreviewItems.map((sku) => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3"
                key={sku.name}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{sku.name}</p>
                  <p className="text-xs text-slate-500">{sku.detail}</p>
                </div>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600">
                  LPG
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
