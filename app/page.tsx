import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 5"
      description="Authentication, master data, customer management, cylinder inventory, and movement workflows are active. Sales and delivery workflows remain placeholders for later stages."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Movement types", value: "9" },
        { label: "Workflow steps", value: "6" }
      ]}
    />
  );
}
