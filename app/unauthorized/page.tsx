import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
      <p className="text-sm font-semibold text-red-700">Access denied</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-950">This page is not available for your role.</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Stage 1 role-based access control is active. Use the navigation shown for your role,
        or sign out and try another seeded demo account.
      </p>
      <Link
        className="mt-5 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        href="/"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
