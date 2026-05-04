import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function AuditLogsPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Auditor Module"
      title="Audit Logs"
      description="Placeholder for authentication and system audit events. Stage 1 stores login and seed events, but does not build full audit workflows."
      stats={[
        { label: "Log stream", value: "Soon" },
        { label: "Exports", value: "Soon" },
        { label: "Filters", value: "Soon" }
      ]}
    />
  );
}
