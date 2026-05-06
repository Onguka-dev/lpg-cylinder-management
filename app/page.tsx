import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 9"
      description="Authentication, master data, customers, inventory, movements, RSO refills, order management, MSO field sales, and delivery proof of delivery are active."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Order statuses", value: "7" },
        { label: "Delivery statuses", value: "7" }
      ]}
    />
  );
}
