import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 8"
      description="Authentication, master data, customers, inventory, movements, RSO refills, order management, and MSO field sales are active. Offline sync and advanced delivery remain placeholders."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Order statuses", value: "7" },
        { label: "Field quick actions", value: "6" }
      ]}
    />
  );
}
