import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 3"
      description="Authentication, role-based access control, master-data configuration, and customer management are active. Sales and inventory movement workflows remain placeholders for later stages."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Master data areas", value: "17" },
        { label: "Seed customers", value: "3" }
      ]}
    />
  );
}
