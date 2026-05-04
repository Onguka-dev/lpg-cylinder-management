import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 0"
      description="A clean starting point for LPG cylinder management. Metrics, alerts, and workflow summaries will be added in later stages."
      stats={[
        { label: "Role workspaces", value: "5" },
        { label: "Core modules", value: "7" },
        { label: "Seed SKU types", value: "3" }
      ]}
    />
  );
}
