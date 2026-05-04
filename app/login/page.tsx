import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="mb-6">
          <p className="text-sm font-semibold text-brand-700">Stage 1</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use one of the seeded demo accounts to check role-based access.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
