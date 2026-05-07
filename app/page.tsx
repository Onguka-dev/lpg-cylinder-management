import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 13"
      description="Authentication, master data, customers, inventory, movements, sales, deliveries, billing, reconciliation, safety compliance, and analytics dashboards are active."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Order statuses", value: "7" },
        { label: "Report dashboards", value: "13" }
      ]}
    />
  );
}
