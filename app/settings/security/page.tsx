import { redirect } from "next/navigation";
import { SecuritySettingForm } from "@/components/security-setting-form";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewSecurity, passwordPolicySummary } from "@/lib/security";

export default async function SecuritySettingsPage() {
  const session = await getCurrentSession();

  if (!session) redirect("/login?next=/settings/security");
  if (!canViewSecurity(session.user.role)) redirect("/unauthorized");

  const [settings, sessions] = await Promise.all([
    prisma.securityControlSetting.findMany({ orderBy: { key: "asc" } }),
    prisma.userSession.findMany({
      where: session.user.role === "ADMIN" ? {} : { userId: session.user.id },
      include: { user: { include: { role: true } } },
      orderBy: { lastSeenAt: "desc" },
      take: 50
    })
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 17</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Security Controls</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Password policy, OTP/MFA readiness, session timeout, device sessions, and backend permission checks are tracked here.
        </p>
        <p className="mt-3 text-xs font-medium text-slate-500">Password policy: {passwordPolicySummary()}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {settings.map((setting) => (
          <SecuritySettingForm key={setting.id} setting={setting} />
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Device and Session List</h2>
            <p className="mt-1 text-sm text-slate-500">Current and recent browser sessions with MFA placeholder status.</p>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{sessions.length} shown</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">MFA</th>
                <th className="py-2 pr-4">Device</th>
                <th className="py-2 pr-4">Last seen</th>
                <th className="py-2 pr-4">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-4 font-medium text-slate-900">{item.user.email}</td>
                  <td className="py-3 pr-4 text-slate-600">{item.status}</td>
                  <td className="py-3 pr-4 text-slate-600">{item.mfaVerified ? "Verified" : "Placeholder"}</td>
                  <td className="max-w-xs truncate py-3 pr-4 text-slate-600">{item.deviceLabel ?? "Unknown device"}</td>
                  <td className="py-3 pr-4 text-slate-600">{item.lastSeenAt.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-slate-600">{item.expiresAt.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
