import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 16"
      description="Authentication, master data, customers, inventory, movements, sales, deliveries, billing, reconciliation, safety, analytics, notifications, offline sync, and mock integrations are active."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Integration adapters", value: "5" },
        { label: "Retry statuses", value: "4" }
      ]}
    />
  );
}
