import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 15"
      description="Authentication, master data, customers, inventory, movements, sales, deliveries, billing, reconciliation, safety, analytics, notifications, and offline sync placeholders are active."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Offline draft types", value: "6" },
        { label: "Sync statuses", value: "4" }
      ]}
    />
  );
}
