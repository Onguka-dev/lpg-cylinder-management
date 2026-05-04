import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function AuditorPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Role Workspace"
      title="Auditor Dashboard"
      description="Placeholder for audit trails, exception review, stock checks, and compliance reporting."
      stats={[
        { label: "Audit queues", value: "Soon" },
        { label: "Exceptions", value: "Soon" },
        { label: "Exports", value: "Soon" }
      ]}
    />
  );
}
