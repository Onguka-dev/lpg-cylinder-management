import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 14"
      description="Authentication, master data, customers, inventory, movements, sales, deliveries, billing, reconciliation, safety compliance, analytics, and notification placeholders are active."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Notification events", value: "8" },
        { label: "Mock channels", value: "3" }
      ]}
    />
  );
}
