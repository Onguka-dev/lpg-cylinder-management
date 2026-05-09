import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/login-form";
import { brand } from "@/lib/brand";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6">
          <BrandMark />
          <p className="mt-5 text-sm font-semibold text-brand-700">{brand.stageLabel}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Sign in to {brand.name}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Access LPG operations, cylinder inventory, orders, deliveries, billing, audit, and reporting tools.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
