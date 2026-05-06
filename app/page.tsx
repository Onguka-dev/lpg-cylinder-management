import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 7"
      description="Authentication, master data, customers, inventory, movements, RSO refills, and order management are active. Dispatch execution and advanced delivery remain placeholders."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Order statuses", value: "7" },
        { label: "Order channels", value: "5" }
      ]}
    />
  );
}
