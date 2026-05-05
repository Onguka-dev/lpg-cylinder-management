import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 4"
      description="Authentication, master data, customer management, and the cylinder inventory foundation are active. Sales and dispatch workflows remain placeholders for later stages."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Cylinder statuses", value: "7" },
        { label: "Inventory alerts", value: "3" }
      ]}
    />
  );
}
