import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 11"
      description="Authentication, master data, customers, inventory, movements, sales, deliveries, billing, and daily reconciliation controls are active."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Order statuses", value: "7" },
        { label: "Review states", value: "4" }
      ]}
    />
  );
}
