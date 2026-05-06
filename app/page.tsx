import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 10"
      description="Authentication, master data, customers, inventory, movements, RSO refills, order management, MSO field sales, deliveries, and billing/payments are active."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Order statuses", value: "7" },
        { label: "Billing methods", value: "4" }
      ]}
    />
  );
}
