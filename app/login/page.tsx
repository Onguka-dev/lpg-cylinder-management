import { BrandHeader } from "@/components/brand-header";
import { LoginForm } from "@/components/login-form";
import { brand } from "@/lib/brand";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-ink-900 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(23,156,107,0.45),transparent_28rem),radial-gradient(circle_at_76%_58%,rgba(29,125,242,0.24),transparent_24rem)]" />
        <div className="relative">
          <BrandHeader inverse />
          <div className="mt-16 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-100">
              {brand.supportLine}
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-normal">
              Professional LPG control for Wells Gas teams.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-200">
              Monitor cylinder assets, retail sales, field delivery, payments,
              reconciliation, safety, audit, and reporting from one role-aware platform.
            </p>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-3 text-sm">
          {["Inventory", "Sales", "Compliance"].map((label) => (
            <div className="rounded-lg border border-white/15 bg-white/10 p-4" key={label}>
              <p className="font-semibold">{label}</p>
              <p className="mt-1 text-xs text-slate-300">Ready for UAT review</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <div className="mb-6">
            <BrandHeader />
            <p className="mt-5 text-sm font-semibold text-brand-700">{brand.stageLabel}</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Sign in to {brand.name}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Access LPG operations, cylinder inventory, orders, deliveries, billing, audit, and reporting tools.
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
