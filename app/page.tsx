import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 17"
      description="Security hardening, session/device tracking, stronger password policy, MFA readiness placeholders, RBAC checks, and audit review controls are active."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Audit categories", value: "16" },
        { label: "Session timeout", value: "2h" }
      ]}
    />
  );
}
